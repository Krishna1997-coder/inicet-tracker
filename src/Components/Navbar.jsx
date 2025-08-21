import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Navbar({ setActiveTab }) {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          INI-CET Study Tracker
        </Typography>
        <Button color="inherit" onClick={() => setActiveTab("dashboard")}>
          Dashboard
        </Button>
        <Button color="inherit" onClick={() => setActiveTab("topics")}>
          Topics
        </Button>
        <Button color="inherit" onClick={() => setActiveTab("studylog")}>
          Study Log
        </Button>
        <Button color="inherit" onClick={() => setActiveTab("mocktest")}>
          Mock Test
        </Button>
        <Button color="inherit" onClick={() => setActiveTab("adaptive")}>
          Adaptive Planner
        </Button>
      </Toolbar>
    </AppBar>
  );
}
