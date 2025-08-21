import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MockTestForm() {
  const [date, setDate] = useState("")
  const [score, setScore] = useState("")
  const [total, setTotal] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from("mock_tests").insert([
      { date, score, total }
    ])
    if (error) alert("Error saving test: " + error.message)
    else alert("Mock test saved successfully!")
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Add Mock Test</h2>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <input type="number" placeholder="Score" value={score} onChange={e => setScore(e.target.value)} required />
      <input type="number" placeholder="Total Marks" value={total} onChange={e => setTotal(e.target.value)} required />
      <button type="submit">Save Test</button>
    </form>
  )
}
