import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ProgressDashboard() {
  const [topics, setTopics] = useState([])
  const [logs, setLogs] = useState([])
  const [tests, setTests] = useState([])

  useEffect(() => {
    async function fetchData() {
      let { data: t } = await supabase.from("topics").select("*")
      let { data: l } = await supabase.from("study_logs").select("*")
      let { data: m } = await supabase.from("mock_tests").select("*")
      setTopics(t || [])
      setLogs(l || [])
      setTests(m || [])
    }
    fetchData()
  }, [])

  return (
    <div className="card">
      <h2>📊 Dashboard</h2>
      <p>✅ Topics Completed: {topics.filter(t => t.completed).length} / {topics.length}</p>
      <p>📚 Avg Confidence: {topics.length ? (topics.reduce((a, b) => a + b.confidence, 0) / topics.length).toFixed(1) : 0}%</p>
      <p>⏳ Total Study Hours: {logs.reduce((a, b) => a + Number(b.hours), 0)}</p>
      <p>📝 Avg Mock Test %: {tests.length ? (tests.reduce((a, b) => a + (b.score / b.total) * 100, 0) / tests.length).toFixed(1) : 0}%</p>
    </div>
  )
}
