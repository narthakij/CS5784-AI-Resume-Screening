import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

export default function ResumeUpload() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
    setSuccess("");
    setError("");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "success"; // green
    if (score >= 60) return "info";    // blue
    if (score >= 40) return "warning"; // orange
    return "error"; // red
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume) {
      setError("Please upload a resume file.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    if (jobDescription.trim()) formData.append("job_description", jobDescription);

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setSuccess("");

      const res = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setSuccess("Resume evaluated successfully!");
    } catch (err) {
      console.error(err);

      // Handle different error types
      if (err.response) {
        // Backend returned a response with status code
        setError(
          err.response.data?.error ||
          `Server returned ${err.response.status}. Please check your resume and try again.`
        );
      } else if (err.request) {
        // Request was made but no response received
        setError(
          "No response from the server. Please ensure the backend is running and reachable."
        );
      } else {
        // Something else went wrong
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: "100%",
        maxWidth: { xs: "95%", lg: "1000px" },
        mx: "auto",
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: 3,
        textAlign: "center",
        backgroundColor: "#fff",
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 600,
          mb: 2,
          fontSize: { xs: "1.3rem", sm: "1.6rem" },
        }}
      >
        ATS Resume Evaluation
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 3 },
          mt: 2,
        }}
      >
        {/* Resume Upload */}
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ fontSize: { xs: "0.9rem", sm: "1rem" }, py: 1.2 }}
          aria-label={
            resume ? `Uploaded file: ${resume.name}` : "Upload Resume"
          }
        >
          {resume ? resume.name : "Upload Resume"}
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.docx,.txt"
            hidden
            onChange={handleFileChange}
          />
        </Button>

        {/* Job Description Input */}
        <TextField
          id="job-description"
          label="(Optional) Paste Job Description"
          multiline
          minRows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          fullWidth
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{
            py: 1.3,
            fontSize: { xs: "0.9rem", sm: "1rem" },
            fontWeight: 600,
          }}
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? (
            <>
              <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
              Processing...
            </>
          ) : (
            "Evaluate Resume"
          )}
        </Button>
      </Box>

      {/* Feedback / Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 3 }}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert
          severity="success"
          sx={{ mt: 3 }}
          role="status"
          aria-live="polite"
        >
          {success}
        </Alert>
      )}

      {result && (
        <Paper
          variant="outlined"
          sx={{
            mt: 4,
            p: { xs: 2, sm: 3 },
            textAlign: "left",
            borderRadius: 2,
            backgroundColor: "#fafafa",
          }}
          component="section"
          aria-labelledby="results-heading"
        >
          <Typography id="results-heading" variant="h6">
            Results
          </Typography>
          {/* ATS Score with LinearProgress */}
          {typeof result.ats_score === "number" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                ATS Score: <strong>{result.ats_score}%</strong>
              </Typography>
              <LinearProgress
                variant="determinate"
                value={result.ats_score}
                color={getScoreColor(result.ats_score)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          )}

          {/* Other scores */}
          {typeof result.keyword_overlap === "number" && (
            <Typography sx={{ mt: 2 }}>
              Keyword Overlap: <strong>{result.keyword_overlap}%</strong>
            </Typography>
          )}
          {typeof result.semantic_similarity === "number" && (
            <Typography sx={{ mt: 1 }}>
              Semantic Similarity: <strong>{result.semantic_similarity}%</strong>
            </Typography>
          )}
          {typeof result.match_score === "number" && (
            <Typography sx={{ mt: 1 }}>
              Overall Match Score: <strong>{result.match_score}%</strong>
            </Typography>
          )}

          {/* Feedback text */}
          <Typography variant="body2" sx={{ mt: 2, color: "#333" }}>
            {result.feedback}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
}