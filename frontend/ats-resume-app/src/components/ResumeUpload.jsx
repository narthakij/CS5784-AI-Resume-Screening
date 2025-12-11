import { useState, useMemo } from "react";
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
  Grid,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import FileCopyIcon from "@mui/icons-material/FileCopy";

function ScorePill({ label, value, size = 72 }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const getColor = (v) => {
    if (v >= 80) return "success";
    if (v >= 60) return "info";
    if (v >= 40) return "warning";
    return "error";
  };

  return (
    <Paper
      elevation={1}
      sx={{
        width: size + 18,
        p: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2,
      }}
    >
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={normalized}
          size={size}
          color={getColor(normalized)}
          thickness={5}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {normalized}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function ResumeUploadImproved() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [strengthsFilter, setStrengthsFilter] = useState("");
  const [weaknessesFilter, setWeaknessesFilter] = useState("");

  const handleFileChange = (e) => {
    setResume(e.target.files[0]);
    setSuccess("");
    setError("");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "info";
    if (score >= 40) return "warning";
    return "error";
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

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setSuccess("Resume evaluated successfully!");
    } catch (err) {
      console.error(err);

      if (err.response) {
        setError(
          err.response.data?.error ||
          `Server returned ${err.response.status}. Please check your resume and try again.`
        );
      } else if (err.request) {
        setError("No response from the server. Please ensure the backend is running and reachable.");
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) {
      setError("No feedback available to export.");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/download_feedback_pdf`,
        result,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "resume_feedback.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError("Failed to download PDF. Please try again.");
    }
  };

  const strengths = useMemo(() => result?.strengths || [], [result]);
  const weaknesses = useMemo(() => result?.weaknesses || [], [result]);

  const filteredStrengths = strengths.filter((s) =>
    s.toLowerCase().includes(strengthsFilter.toLowerCase())
  );
  const filteredWeaknesses = weaknesses.filter((w) =>
    w.toLowerCase().includes(weaknessesFilter.toLowerCase())
  );

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("Copied to clipboard");
      setTimeout(() => setSuccess(""), 2000);
    } catch (e) {
      setError("Failed to copy");
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: "100%",
        maxWidth: { xs: "95%", lg: "1100px" },
        mx: "auto",
        p: { xs: 2.5, sm: 3, md: 4 },
        borderRadius: 3,
        backgroundColor: "#fff",
      }}
    >
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 3, textAlign: "center" }}>
        ATS Resume Evaluation
      </Typography>

      <Grid container spacing={3} alignItems="flex-start">
        {/* Left column: form */}
        <Grid item xs={12} md={5}>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              sx={{ justifyContent: "flex-start", textTransform: "none" }}
              aria-label={resume ? `Uploaded file: ${resume.name}` : "Upload Resume"}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {resume ? resume.name : "Upload Resume (.pdf, .docx, .txt)"}
                </Typography>
                <Typography variant="caption">Click to choose a file</Typography>
              </Box>
              <input id="resume-upload" type="file" accept=".pdf,.docx,.txt" hidden onChange={handleFileChange} />
            </Button>

            <TextField
              id="job-description"
              label="(Optional) Paste Job Description"
              multiline
              minRows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              fullWidth
            />

            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.2, fontWeight: 700 }}>
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Processing...
                </>
              ) : (
                "Evaluate Resume"
              )}
            </Button>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPDF} disabled={!result}>
                Export PDF
              </Button>
              <Button variant="outlined" onClick={() => { setResult(null); setError(""); setSuccess(""); setResume(null); }}>
                Reset
              </Button>
            </Stack>

            {error && (
              <Alert severity="error" role="alert" aria-live="assertive">
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" role="status" aria-live="polite">
                {success}
              </Alert>
            )}
          </Box>
        </Grid>

        {/* Right column: results */}
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: "#fafafa" }} component="section" aria-labelledby="results-heading">
            <Typography id="results-heading" variant="h6" sx={{ mb: 1 }}>
              Results
            </Typography>

            {!result && (
              <Typography variant="body2" color="text.secondary">
                No result yet — upload a resume and click Evaluate to see detailed feedback, scores, and suggestions.
              </Typography>
            )}

            {result && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Top score row */}
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <ScorePill label="Keyword" value={result.keyword_overlap ?? 0} />
                  <ScorePill label="Semantic" value={result.semantic_similarity ?? 0} />
                  <ScorePill label="Match" value={result.match_score ?? 0} />
                </Box>

                {/* ATS linear with explanation */}
                {typeof result.ats_score === "number" && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ATS Score: <strong>{result.ats_score}%</strong>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, Math.min(100, result.ats_score))}
                      color={getScoreColor(result.ats_score)}
                      sx={{ height: 12, borderRadius: 2 }}
                    />
                  </Box>
                )}

                {/* Short feedback summary */}
                {result.feedback && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
                      Summary
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {result.feedback}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Strengths + Weaknesses columns */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Strengths
                      </Typography>
                    </Box>

                    <TextField
                      placeholder="Filter strengths..."
                      size="small"
                      value={strengthsFilter}
                      onChange={(e) => setStrengthsFilter(e.target.value)}
                      sx={{ mt: 1, mb: 1 }}
                    />

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {filteredStrengths.length > 0 ? (
                        filteredStrengths.map((s, i) => (
                          <Chip
                            key={i}
                            label={s}
                            clickable
                            onClick={() => copyToClipboard(s)}
                            onDelete={() => copyToClipboard(s)}
                            deleteIcon={<FileCopyIcon />}
                            sx={{ m: 0.4 }}
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No strengths detected</Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Missing Keywords
                      </Typography>
                    </Box>

                    <TextField
                      placeholder="Filter missing keywords..."
                      size="small"
                      value={weaknessesFilter}
                      onChange={(e) => setWeaknessesFilter(e.target.value)}
                      sx={{ mt: 1, mb: 1 }}
                    />

                    <Box sx={{ maxHeight: 200, overflow: "auto", pr: 1 }}>
                      {filteredWeaknesses.length > 0 ? (
                        filteredWeaknesses.map((w, i) => (
                          <Chip key={i} label={w} size="small" sx={{ m: 0.4 }} />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">No missing keywords detected</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* Optional additional insights: formatting, readability */}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button variant="contained" onClick={handleDownloadPDF} startIcon={<DownloadIcon />}>
                    Download Feedback as PDF
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}