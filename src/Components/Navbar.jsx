import React from "react";

export default function Navbar({ setActiveTab }) {
  return (
    <nav className="navbar bg-blue-600 text-white px-4 py-3">
      <h1 className="text-xl font-bold">INI-CET Study Tracker</h1>
      <div>
        <button
          onClick={() => setActiveTab("dashboard")}
          className="text-white hover:bg-blue-700 px-3 py-2 rounded"
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("topics")}
          className="text-white hover:bg-blue-700 px-3 py-2 rounded"
        >
          Topics
        </button>
        <button
          onClick={() => setActiveTab("studylog")}
          className="text-white hover:bg-blue-700 px-3 py-2 rounded"
        >
          Study Log
        </button>
        <button
          onClick={() => setActiveTab("mocktest")}
          className="text-white hover:bg-blue-700 px-3 py-2 rounded"
        >
          Mock Test
        </button>
        <button
          onClick={() => setActiveTab("adaptive")}
          className="text-white hover:bg-blue-700 px-3 py-2 rounded"
        >
          Adaptive Planner
        </button>
      </div>
    </nav>
  );
}
