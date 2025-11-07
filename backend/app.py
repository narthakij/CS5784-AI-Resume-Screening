#!/bin/python

"""
Flask backend for the resume parser app.

This module is the main Flask app and contains any needed API endpoints for parsing resumes.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from resume_parser_pro import ResumeParser
import os
import tempfile
# import requests
# import json

app = Flask(__name__)
CORS(app)


@app.route("/api/upload", methods=["POST"])
def upload_resume():
    """
    POST api/upload
    ------------------

    Takes an uploaded resume file as input and parses through using the resume_parser_pro package.
    Returns the parsed data from resume along with an ATS score.
    """

    if "resume" not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        parser = ResumeParser(tmp_path)
        data = parser.parse()
        print("This is the sample data: ", data) # Temporary logging statement
        ats_score = calculate_ats_score(data)
        print("This is the ATS score: ", ats_score)

        os.remove(tmp_path)

        return jsonify({"data": data, "ats_score": ats_score}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


def calculate_ats_score(data):
    """
    A brief calculation for ATS score for readability based on which parts
    were successfully filled out.

    """
    score = 0

    name = data.get("name", "")
    email = data.get("email", [])
    experience = data.get("experience", [])
    skills = data.get("skills", [])
    education = data.get("education", [])

    if name and name.strip():
        score += 5
    if email:
        score += 5
    if experience:
        score += 40
    if skills:
        score += 30
    if education:
        score += 20
    
    return score
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)