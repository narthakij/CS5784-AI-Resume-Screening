"""
Flask backend for the resume parser app.

This module is the main Flask app and contains any needed API endpoints for parsing resumes.
"""

from flask import Flask, request, jsonify
from flask import send_file
from flask_cors import CORS
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from resume_parser_pro import ResumeParser
from resume_parser_pro.reader import ResumeReader as OriginalReader
import pdfplumber
import os
import tempfile
import re
import spacy
import textwrap

app = Flask(__name__)
CORS(app)

# Load spaCy model for NLP-based similarity and keyword extraction
try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print("Warning: could not load spaCy model:", e, flush=True)
    nlp = None


class PdfPlumberReader(OriginalReader):
    """
    This class will manually override the original ResumeReader in the 
    resume_parser_pro package. This is because resume_parser_pro only accepts
    PDF and DOCX files and cannot take the raw text output of PDFPlumber by
    itself.

    This class runs PDFPlumber inside the ResumeReader and returns the text
    to the ResumeParser to extract key fields.
    """
    def read_resume_file(self, path: str) -> str:
        if path.lower().endswith(".pdf"):
            text = ""
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            return text
        # Fallback in case PDFPlumber doesn't work
        return super().read_resume_file(path)


def extract_resume_text(parsed):
    """
    Build a plain-text representation of the resume from the parsed data.
    """
    if not isinstance(parsed, dict):
        return ""
    parts = []
    for key in ["summary", "experience", "skills", "education"]:
        value = parsed.get(key)
        if isinstance(value, list):
            parts.append(" ".join(str(v) for v in value))
        elif isinstance(value, str):
            parts.append(value)
    return "\n".join(parts)


def extract_keywords_spacy(text):
    """
    Use spaCy to pull out meaningful keywords (lemmas of important content words).
    """
    if not text or not nlp:
        return set()

    doc = nlp(text)
    keywords = set()

    for token in doc:
        if token.is_stop or token.is_punct or token.is_space:
            continue
        # Focus on content words
        if token.pos_ in ("NOUN", "PROPN", "ADJ", "VERB"):
            lemma = token.lemma_.lower()
            if len(lemma) > 2:
                keywords.add(lemma)

    return keywords


def calculate_keyword_overlap(resume_text, job_description):
    """
    Calculate keyword overlap based on spaCy-extracted content words
    instead of all tokens. This gives a more meaningful percentage.
    """
    if not resume_text or not job_description or not nlp:
        return 0.0

    resume_keywords = extract_keywords_spacy(resume_text)
    job_keywords = extract_keywords_spacy(job_description)

    if not job_keywords:
        return 0.0

    overlap = resume_keywords.intersection(job_keywords)
    score = (len(overlap) / len(job_keywords)) * 100.0
    return round(score, 1)


def calculate_semantic_similarity(resume_text, job_description):
    """
    Use spaCy's document similarity to compute a semantic similarity score
    between the resume and job description, scaled to 0–100.
    """
    if not nlp or not resume_text or not job_description:
        return None
    doc_resume = nlp(resume_text)
    doc_job = nlp(job_description)
    sim = doc_resume.similarity(doc_job)
    sim = max(0.0, min(sim, 1.0))
    score = sim * 100.0
    return round(score, 1)


def calculate_ats_score(data):
    """
    Very simple ATS-style completeness score based on presence of
    key fields in the parsed resume.
    """
    if not isinstance(data, dict):
        return 0.0

    name = data.get("name")
    email = data.get("email")
    experience = data.get("experience")
    skills = data.get("skills")
    education = data.get("education")

    score = 0

    if name and str(name).strip():
        score += 5
    if email and str(email).strip():
        score += 5
    if experience:
        score += 40
    if skills:
        score += 30
    if education:
        score += 20

    return round(float(score), 1)


def build_feedback(ats_score, keyword_overlap, semantic_similarity):
    """
    Generate human-readable feedback based on the three scores.
    """
    messages = []

    if ats_score is not None:
        if ats_score >= 80:
            messages.append("Your resume includes most core sections that ATS systems look for.")
        elif ats_score >= 60:
            messages.append("Your resume has the main sections, but you could strengthen experience and skills descriptions.")
        else:
            messages.append("Your resume may be missing important sections or details for ATS systems.")

    if keyword_overlap is not None:
        if keyword_overlap >= 70:
            messages.append("You are using many of the same keywords as the job description.")
        elif keyword_overlap >= 40:
            messages.append("You are matching some job keywords, but you could add more relevant skills and responsibilities.")
        else:
            messages.append("Consider adding more role-specific keywords from the job posting in your skills and experience sections.")

    if semantic_similarity is not None:
        if semantic_similarity >= 70:
            messages.append("Overall, your resume content is semantically close to the job description.")
        elif semantic_similarity >= 40:
            messages.append("Your resume is somewhat related to the job, but you can tailor it more to the specific responsibilities.")
        else:
            messages.append("Your resume appears to target a different type of role than this job description.")

    if not messages:
        return "Upload a resume and job description to see detailed feedback."

    return " ".join(messages)


def extract_strengths_weaknesses(resume_text, job_description):
    """
    Compares resume and job description keywords to find 
    strengths (keyword matches) and weaknesses (missing keywords).
    """
    if not resume_text or not job_description:
        return {"strengths": [], "weaknesses": []}

    resume_keywords = extract_keywords_spacy(resume_text)
    job_keywords = extract_keywords_spacy(job_description)

    strengths = sorted(list(resume_keywords.intersection(job_keywords)))
    weaknesses = sorted(list(job_keywords - resume_keywords))

    return {
        "strengths": strengths,
        "weaknesses": weaknesses
    }


@app.route("/api/upload", methods=["POST"])
def upload_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    job_description = request.form.get("job_description", "")

    tmp_path = None
    try:
        # Preserve the original extension if possible (helps the parser)
        _, ext = os.path.splitext(file.filename)
        ext = ext or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        parser = ResumeParser(tmp_path)
        parser.reader = PdfPlumberReader(logger=parser.logger) # This manually overrides the parser's reader with PDFPlumberReader
        parsed_data = parser.parse()

        resume_text = extract_resume_text(parsed_data)
        ats_score = calculate_ats_score(parsed_data)

        # Debug prints for you in the backend terminal
        print("This is the sample data: ", parsed_data, flush=True)
        print("This is the ATS score: ", ats_score, flush=True)

        keyword_overlap = None
        semantic_similarity = None
        match_score = None
        strengths_weaknesses = {"strengths": [], "weaknesses": []}

        if job_description.strip() and resume_text.strip():
            keyword_overlap = calculate_keyword_overlap(resume_text, job_description)
            semantic_similarity = calculate_semantic_similarity(resume_text, job_description)
            strengths_weaknesses = extract_strengths_weaknesses(resume_text, job_description)

            if keyword_overlap is not None and semantic_similarity is not None:
                match_score = round((keyword_overlap + semantic_similarity) / 2.0, 1)

        feedback = build_feedback(ats_score, keyword_overlap, semantic_similarity)

        return jsonify(
            {
                "parsed_data": parsed_data,
                "ats_score": ats_score,
                "keyword_overlap": keyword_overlap,
                "semantic_similarity": semantic_similarity,
                "match_score": match_score,
                "feedback": feedback,
                "strengths": strengths_weaknesses["strengths"],
                "weaknesses": strengths_weaknesses["weaknesses"]
            }
        ), 200

    except Exception as e:
        print("Error in /api/upload:", e, flush=True)
        return jsonify({"error": str(e)}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route("/api/download_feedback_pdf", methods=["POST"])
def download_feedback_pdf():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing resume results"}), 400

    result = data  
    lines = []

    # Simple function to add header with corresponding result from parsing
    def add_line(label, key):
        if key in result and result[key] is not None:
            lines.append(f"{label}: {result[key]}")

    add_line("ATS Score", "ats_score")
    add_line("Keyword Overlap", "keyword_overlap")
    add_line("Semantic Similarity", "semantic_similarity")
    add_line("Overall Match Score", "match_score")

    lines.append("")
    lines.append("=== FEEDBACK ===")
    lines.append("")

    if "feedback" in result and result["feedback"]:
        for line in result["feedback"].split("\n"):
            lines.append(line)

    lines.append("")
    lines.append("=== STRENGTHS ===")
    lines.append("")

    strengths = result.get("strengths", [])
    if strengths:
        for item in strengths:
            lines.append(f"• {item}")
    else:
        lines.append("No strengths found.")
    
    lines.append("")
    lines.append("=== WEAKNESSES ===")
    lines.append("")

    weaknesses = result.get("weaknesses", [])
    if weaknesses:
        for item in weaknesses:
            lines.append(f"• {item}")
    else:
        lines.append("No missing keywords found.")

    # Handles line wrapping so that the words won't run off the page
    wrapped_lines = []
    for line in lines:
        wrapped = textwrap.wrap(line, width=90)
        if not wrapped:
            wrapped_lines.append("")
        else:
            wrapped_lines.extend(wrapped)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        pdf_path = tmp.name

    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    y = height - 72

    c.setFont("Helvetica", 12)

    for line in wrapped_lines:
        c.drawString(72, y, line)
        y -= 16

        if y < 72:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = height - 72

    c.save()

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name="resume_report.pdf",
        mimetype="application/pdf"
    )



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
