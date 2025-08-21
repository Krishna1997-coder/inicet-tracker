import React, { useState } from 'react'
import Navbar from './Components/Navbar.jsx'
import TopicForm from './Components/TopicForm.jsx'
import StudyLogForm from './Components/StudyLogForm.jsx'
import MockTestForm from './Components/MockTestForm.jsx'
import ProgressDashboard from './Components/ProgressDashboard.jsx'
import AdaptivePlannerSupabase from './Components/AdaptivePlannerSupabase.jsx'

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div>
      <Navbar setActiveTab={setActiveTab} />
      <div className="container">
        {activeTab === "dashboard" && <ProgressDashboard />}
        {activeTab === "topics" && <TopicForm />}
        {activeTab === "studylog" && <StudyLogForm />}
        {activeTab === "mocktest" && <MockTestForm />}
        {activeTab === "adaptive" && <AdaptivePlannerSupabase />}
      </div>
    </div>
  )
}
