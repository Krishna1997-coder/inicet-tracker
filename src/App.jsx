import React, { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import TopicForm from './components/TopicForm.jsx'
import StudyLogForm from './components/StudyLogForm.jsx'
import MockTestForm from './components/MockTestForm.jsx'
import ProgressDashboard from './components/ProgressDashboard.jsx'

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
      </div>
    </div>
  )
}
