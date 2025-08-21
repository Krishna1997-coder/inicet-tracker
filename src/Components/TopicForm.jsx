import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function TopicForm() {
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [completed, setCompleted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from("topics").insert([
      { subject, topic, confidence, completed }
    ])
    if (error) alert("Error saving topic: " + error.message)
    else alert("Topic saved successfully!")
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Add Topic</h2>
      <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required />
      <input type="text" placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} required />
      <label>Confidence (0–100)</label>
      <input type="number" value={confidence} onChange={e => setConfidence(e.target.value)} min="0" max="100" />
      <label>
        <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} />
        Completed?
      </label>
      <button type="submit">Save Topic</button>
    </form>
  )
}
