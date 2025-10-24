import React from "react";
import {
  Container,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
} from "@mui/material";
import ResumeUpload from "./components/ResumeUpload";

function App() {
  return (
    <>
      <CssBaseline />

      {/* Sticky App Bar */}
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            component="h1"
            sx={{
              flexGrow: 1,
              textAlign: { xs: "center", sm: "left" },
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            AI Resume Screening & Job Match
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Responsive Content Area */}
      <Box
        sx={{
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
          py: { xs: 4, md: 8 },
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 4 },
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ResumeUpload />
        </Container>
      </Box>
    </>
  );
}

export default App;