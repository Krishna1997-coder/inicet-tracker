import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// --- Constants and helpers ---
const STATE_WEIGHTS = { Weak: 0.2, Average: 0.5, Strong: 0.8, Perfect: 1.0 };
const ORDER = ["Weak", "Average", "Strong", "Perfect"];
const DEFAULT_TRANSITIONS = {
  focused: { Weak: 0.55, Average: 0.6, Strong: 0.4 },
  unfocused: { Weak: 0.15, Average: 0.25, Strong: 0.1 },
  forgetting: { Perfect: 0.05, Strong: 0.08, Average: 0.12 },
};

function normalizeState(s) {
  const t = String(s).trim().toLowerCase();
  if (t.startsWith("perf")) return "Perfect";
  if (t.startsWith("str")) return "Strong";
  if (t.startsWith("avg") || t.startsWith("ave")) return "Average";
  return "Weak";
}

function computeSubjectStats(rows) {
  const byS = {};
  for (const r of rows) {
    byS[r.subject] ||= { expected: 0, max: 0 };
    const w = Number(r.weight) || 0;
    byS[r.subject].max += w;
    const stateW = STATE_WEIGHTS[r.state] ?? 0.2;
    const rcBoost = r.recentCorrect ? 0.05 : 0;
    byS[r.subject].expected += w * Math.min(1, stateW + rcBoost);
  }
  return byS;
}

function buildPlan(rows, focusPerWeek = 10) {
  const items = [];
  for (const r of rows) {
    const idx = ORDER.indexOf(r.state);
    if (idx === -1 || r.state === "Perfect") continue;
    const nextState = ORDER[idx + 1];
    const gain = (STATE_WEIGHTS[nextState] - STATE_WEIGHTS[r.state]) * (Number(r.weight) || 0);
    items.push({
      subject: r.subject,
      topic: r.topic,
      currentState: r.state,
      nextState,
      potentialGain: gain,
    });
  }
  items.sort((a, b) => b.potentialGain - a.potentialGain);
  return items.slice(0, focusPerWeek);
}

function stepWeek(rows, plan, transitions) {
  const inPlan = new Set(plan.map((p) => `${p.subject}|||${p.topic}`));
  return rows.map((r) => {
    const key = `${r.subject}|||${r.topic}`;
    const idx = ORDER.indexOf(r.state);
    let newState = r.state;
    if (r.state !== "Perfect") {
      const pUp = inPlan.has(key)
        ? transitions.focused[r.state]
        : transitions.unfocused[r.state];
      if (Math.random() < (pUp || 0)) newState = ORDER[idx + 1];
    }
    if (!inPlan.has(key)) {
      const pDown = transitions.forgetting[newState] || 0;
      if (pDown && Math.random() < pDown) {
        const j = ORDER.indexOf(newState);
        if (j > 0) newState = ORDER[j - 1];
      }
    }
    return { ...r, state: newState };
  });
}

function projectTwoWeeks(rows, plan, transitions) {
  const nowStats = computeTotals(rows);
  const N = 300;
  const totals = [];
  const bySubjectAcc = {};
  for (let i = 0; i < N; i++) {
    let sim = rows.map((r) => ({ ...r }));
    sim = stepWeek(sim, plan, transitions);
    const plan2 = buildPlan(sim, plan.length || 10);
    sim = stepWeek(sim, plan2, transitions);
    const t = computeTotals(sim);
    totals.push(t.totalExpected);
    for (const [s, v] of Object.entries(t.bySubject)) {
      bySubjectAcc[s] ||= [];
      bySubjectAcc[s].push(v.expected);
    }
  }
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sorted = totals.slice().sort((a, b) => a - b);
  const ciLow = sorted[Math.floor(0.025 * N)];
  const ciHigh = sorted[Math.floor(0.975 * N)];
  const bySubject = {};
  const nowBySubject = computeSubjectStats(rows);
  for (const s of Object.keys(nowBySubject)) {
    const arr = bySubjectAcc[s] || [nowBySubject[s].expected];
    bySubject[s] = { expected: mean(arr), max: nowBySubject[s].max };
  }
  return {
    total: {
      now: nowStats.totalExpected,
      in2w: mean(totals),
      ciLow,
      ciHigh,
    },
    bySubject,
  };
}

function computeTotals(rows) {
  const bySubject = computeSubjectStats(rows);
  let totalExpected = 0;
  let totalMax = 0;
  for (const s of Object.keys(bySubject)) {
    totalExpected += bySubject[s].expected;
    totalMax += bySubject[s].max;
  }
  return { bySubject, totalExpected, totalMax };
}

function analyzeMocks(mocks) {
  if (!mocks.length) return { series: [], smoothLast: 0, mean: 0, std: 0 };
  const sorted = mocks.slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
  const alpha = 0.4;
  let smooth = sorted[0].score;
  let sum = 0;
  for (let i=0;i<sorted.length;i++) {
    const s = sorted[i].score;
    smooth = alpha * s + (1 - alpha) * smooth;
    sum += s;
  }
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc,m)=> acc + Math.pow(m.score - mean,2), 0) / Math.max(1, sorted.length - 1);
  const std = Math.sqrt(variance);
  return { smoothLast: smooth, mean, std };
}

function decideSignal(blended, ciLow, ciHigh, cutoff) {
  const margin = 15;
  if (ciLow >= cutoff - margin && blended >= cutoff) return "GO";
  if (ciHigh >= cutoff - margin && ciLow <= cutoff + margin) return "BORDERLINE";
  return "HOLD";
}

// --- Main Component ---
export default function AdaptivePlannerSupabase() {
  const [tab, setTab] = useState("topics");
  const [rows, setRows] = useState([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [state, setState] = useState("Weak");
  const [weight, setWeight] = useState(1);
  const [recentCorrect, setRecentCorrect] = useState(false);
  const [focusPerWeek, setFocusPerWeek] = useState(10);
  const [useAggressive, setUseAggressive] = useState(false);

  const [mocks, setMocks] = useState([]);
  const [mockId, setMockId] = useState("");
  const [mockDate, setMockDate] = useState("");
  const [mockScore, setMockScore] = useState("");
  const [cutoff, setCutoff] = useState(650);

  // Fetch topics from Supabase
  useEffect(() => {
    async function fetchTopics() {
      const { data, error } = await supabase.from("topics").select("*");
      if (!error && data) setRows(data);
    }
    fetchTopics();
  }, []);

  // Fetch mocks from Supabase
  useEffect(() => {
    async function fetchMocks() {
      const { data, error } = await supabase.from("mock_tests").select("*");
      if (!error && data) setMocks(data);
    }
    fetchMocks();
  }, []);

  const transitions = useMemo(() => {
    if (!useAggressive) return DEFAULT_TRANSITIONS;
    return {
      focused: { Weak: 0.7, Average: 0.7, Strong: 0.5 },
      unfocused: { Weak: 0.2, Average: 0.3, Strong: 0.15 },
      forgetting: { Perfect: 0.04, Strong: 0.07, Average: 0.1 },
    };
  }, [useAggressive]);

  const subjectStats = useMemo(() => computeSubjectStats(rows), [rows]);
  const plan = useMemo(() => buildPlan(rows, focusPerWeek), [rows, focusPerWeek]);
  const projection = useMemo(() => projectTwoWeeks(rows, plan, transitions), [rows, plan, transitions]);
  const mockAnalytics = useMemo(() => analyzeMocks(mocks), [mocks]);
  const readiness = useMemo(() => {
    const topicProj = projection?.total?.in2w || 0;
    const mockSmooth = mockAnalytics?.smoothLast || 0;
    const n = mocks.length;
    const wMock = Math.min(0.7, 0.3 + 0.04 * n);
    const blended = wMock * mockSmooth + (1 - wMock) * topicProj;
    const sd = mockAnalytics?.std || 0;
    const ciLow = Math.max(0, blended - 1.64 * sd);
    const ciHigh = blended + 1.64 * sd;
    const signal = decideSignal(blended, ciLow, ciHigh, cutoff);
    return { blended, ciLow, ciHigh, wMock, topicProj, mockSmooth, signal };
  }, [projection, mockAnalytics, mocks.length, cutoff]);

  async function addRow() {
    if (!subject || !topic) return;
    const { error } = await supabase.from("topics").insert([
      {
        subject: subject.trim(),
        topic: topic.trim(),
        state,
        weight: Number(weight) || 1,
        recentCorrect: Boolean(recentCorrect),
      },
    ]);
    if (!error) {
      const { data } = await supabase.from("topics").select("*");
      setRows(data || []);
      setTopic("");
    }
  }

  async function removeRow(id) {
    await supabase.from("topics").delete().eq("id", id);
    const { data } = await supabase.from("topics").select("*");
    setRows(data || []);
  }

  async function addMock() {
    if (!mockId || !mockDate || !mockScore) return;
    const { error } = await supabase.from("mock_tests").insert([
      { id: String(mockId).trim(), date: mockDate, score: Number(mockScore) },
    ]);
    if (!error) {
      const { data } = await supabase.from("mock_tests").select("*");
      setMocks(data || []);
      setMockId("");
      setMockDate("");
      setMockScore("");
    }
  }

  // --- UI ---
  return (
    <div style={{maxWidth:800,margin:"2rem auto",padding:"1rem"}}>
      <h1 style={{fontSize:"2rem",fontWeight:"bold"}}>📘 Exam Prep Planner — Adaptive (Supabase)</h1>
      <div style={{margin:"1rem 0"}}>
        <button onClick={()=>setTab("topics")} style={{marginRight:8,background:tab==="topics"?"#6200ea":"#eee",color:tab==="topics"?"#fff":"#333",padding:"8px 16px",borderRadius:6,border:"none"}}>Topics</button>
        <button onClick={()=>setTab("mocks")} style={{marginRight:8,background:tab==="mocks"?"#6200ea":"#eee",color:tab==="mocks"?"#fff":"#333",padding:"8px 16px",borderRadius:6,border:"none"}}>Mocks</button>
        <button onClick={()=>setTab("plan")} style={{marginRight:8,background:tab==="plan"?"#6200ea":"#eee",color:tab==="plan"?"#fff":"#333",padding:"8px 16px",borderRadius:6,border:"none"}}>Plan</button>
        <button onClick={()=>setTab("forecast")} style={{background:tab==="forecast"?"#6200ea":"#eee",color:tab==="forecast"?"#fff":"#333",padding:"8px 16px",borderRadius:6,border:"none"}}>Forecast</button>
      </div>

      {tab === "topics" && (
        <div>
          <h2>Add Topic</h2>
          <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} />
          <input placeholder="Topic" value={topic} onChange={e=>setTopic(e.target.value)} />
          <select value={state} onChange={e=>setState(e.target.value)}>
            {ORDER.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" min={0} step={0.5} value={weight} onChange={e=>setWeight(e.target.value)} />
          <label>
            <input type="checkbox" checked={recentCorrect} onChange={e=>setRecentCorrect(e.target.checked)} />
            Recent correct?
          </label>
          <button onClick={addRow}>Add Topic</button>
          <div style={{marginTop:"1rem"}}>
            <label>Weekly focus capacity</label>
            <input type="number" min={1} value={focusPerWeek} onChange={e=>setFocusPerWeek(Number(e.target.value)||1)} />
            <label>
              <input type="checkbox" checked={useAggressive} onChange={e=>setUseAggressive(e.target.checked)} />
              Aggressive learning
            </label>
          </div>
          <h3 style={{marginTop:"1rem"}}>Current Topics</h3>
          <table style={{width:"100%"}}>
            <thead>
              <tr>
                <th>Subject</th><th>Topic</th><th>State</th><th>Weight</th><th>Recent Correct</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r)=>(
                <tr key={r.id}>
                  <td>{r.subject}</td>
                  <td>{r.topic}</td>
                  <td>{r.state}</td>
                  <td>{r.weight}</td>
                  <td>{r.recentCorrect?"Yes":"No"}</td>
                  <td><button onClick={()=>removeRow(r.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "mocks" && (
        <div>
          <h2>Add Mock Result</h2>
          <input placeholder="Mock ID" value={mockId} onChange={e=>setMockId(e.target.value)} />
          <input type="date" value={mockDate} onChange={e=>setMockDate(e.target.value)} />
          <input type="number" placeholder="Score" value={mockScore} onChange={e=>setMockScore(e.target.value)} />
          <button onClick={addMock}>Add Mock</button>
          <div style={{marginTop:"1rem"}}>
            <label>Target Cut-off</label>
            <input type="number" value={cutoff} onChange={e=>setCutoff(Number(e.target.value)||0)} />
          </div>
          <h3 style={{marginTop:"1rem"}}>Mock Results</h3>
          <table style={{width:"100%"}}>
            <thead>
              <tr>
                <th>#</th><th>Mock ID</th><th>Date</th><th>Score</th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((m,i)=>(
                <tr key={m.id}>
                  <td>{i+1}</td>
                  <td>{m.id}</td>
                  <td>{m.date}</td>
                  <td>{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "plan" && (
        <div>
          <h2>Adaptive Weekly Plan</h2>
          <ul>
            {plan.map((p,idx)=>(
              <li key={idx}>
                <b>{p.subject}</b>: Focus <b>{p.topic}</b> ({p.currentState} → {p.nextState}), Gain: +{p.potentialGain.toFixed(2)} marks
              </li>
            ))}
          </ul>
          <h3>Expected Marks (Now)</h3>
          <ul>
            {Object.keys(subjectStats).map(s=>(
              <li key={s}>
                <b>{s}</b>: {subjectStats[s].expected.toFixed(2)} / {subjectStats[s].max.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "forecast" && (
        <div>
          <h2>2-Week Projection</h2>
          <div>
            <div>Expected now: <b>{projection?.total?.now?.toFixed(1)}</b></div>
            <div>In 2 weeks (expected): <b>{projection?.total?.in2w?.toFixed(1)}</b></div>
            <div>95% CI in 2 weeks: <b>{projection?.total?.ciLow?.toFixed(1)} – {projection?.total?.ciHigh?.toFixed(1)}</b></div>
          </div>
          <h3>Attempt Decision</h3>
          <div>
            <span style={{
              padding:"0.5em 1em",
              borderRadius:"1em",
              background: readiness.signal==="GO"?"#16a34a":readiness.signal==="BORDERLINE"?"#f59e42":"#dc2626",
              color:"#fff",
              fontWeight:"bold"
            }}>
              {readiness.signal}
            </span>
            <span style={{marginLeft:8}}>
              {readiness.signal==="GO"?"On track to clear":readiness.signal==="BORDERLINE"?"Borderline — push targeted topics":"Hold — reconsider attempt"}
            </span>
          </div>
          <div style={{marginTop:"1rem"}}>
            <div>Blended forecast: <b>{readiness.blended.toFixed(1)} (±{(readiness.ciHigh-readiness.blended).toFixed(1)})</b></div>
            <div>Cut-off: <b>{cutoff.toFixed(0)}</b></div>
            <div>Weight on mocks: <b>{Math.round(readiness.wMock*100)}%</b></div>
            <div>Mock (smoothed): <b>{readiness.mockSmooth.toFixed(1)}</b></div>
            <div>Topics projection (2w): <b>{readiness.topicProj.toFixed(1)}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}
