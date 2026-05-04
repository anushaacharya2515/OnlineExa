import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { formatAttemptId } from "../utils/attemptId";
import StudentShell from "../components/StudentShell";

function fmtTime(ms) {
  if (!ms || ms < 1000) return "00:00";
  const t = Math.round(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
function gradeInfo(p) {
  if (p >= 90) return { label: "Outstanding 🏆", color: "#7c3aed" };
  if (p >= 75) return { label: "Excellent 🚀",   color: "#6d28d9" };
  if (p >= 60) return { label: "Strong 💪",       color: "#7c3aed" };
  if (p >= 45) return { label: "Satisfactory",    color: "#9333ea" };
  return              { label: "Needs Improvement", color: "#a21caf" };
}
function perfNote(p) {
  if (p >= 90) return "You performed at the top tier. Outstanding effort!";
  if (p >= 75) return "Great work — keep this momentum going.";
  if (p >= 60) return "Good result. Focus on weaker areas to improve further.";
  if (p >= 45) return "A fair attempt. Review incorrect questions and try again.";
  return "Take time to review the concepts and attempt the next exam with confidence.";
}

function ScoreRing({ percent }) {
  const size = 140, stroke = 13, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r, fill = (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#a78bfa" strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 1.2s ease" }}/>
      <text x={size/2} y={size/2 - 5}  textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{percent}%</text>
      <text x={size/2} y={size/2 + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.6)">Score</text>
    </svg>
  );
}

export default function StudentAttemptResult() {
  const { session } = useAuth();
  const token = session.token;
  const { attemptId } = useParams();

  const [attempt,   setAttempt]   = useState(null);
  const [exam,      setExam]      = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error,     setError]     = useState("");

  useEffect(() => {
    api(`/student/attempts/${attemptId}`, { token })
      .then(d => { setAttempt(d.attempt); setExam(d.exam); setQuestions(d.questions); })
      .catch(err => setError(err.message));
  }, [attemptId, token]);

  const totalScore = useMemo(() => questions.reduce((s, q) => s + Number(q.marks || 1), 0), [questions]);
  const details    = attempt?.details || [];
  const totalQ     = questions.length;
  const correct    = details.filter(d => d.correct).length;
  const unattempted = details.filter(d => {
    const r = d.received;
    if (r === null || r === undefined) return true;
    if (Array.isArray(r) && r.length === 0) return true;
    if (typeof r === "object" && Object.keys(r).length === 0) return true;
    return false;
  }).length;
  const incorrect  = Math.max(0, totalQ - correct - unattempted);
  const pct        = totalScore ? Math.round((Number(attempt?.score || 0) / totalScore) * 100) : 0;
  const { label: gradeLabel, color: gradeColor } = gradeInfo(pct);
  const timeTakenMs = attempt?.startedAt && attempt?.submittedAt
    ? Math.max(0, new Date(attempt.submittedAt) - new Date(attempt.startedAt)) : null;

  if (!attempt && !error) {
    return (
      <StudentShell active="results">
        <div className="se-loading">Loading result…</div>
      </StudentShell>
    );
  }

  return (
    <StudentShell active="results">
      <header className="se-header">
        <div>
          <p className="se-header-sub">Exam Result</p>
          <h1 className="se-header-title">{exam?.title || exam?.examName || "Result"}</h1>
        </div>
        <div className="se-header-chip">{session.user.email}</div>
      </header>

      {error && <div className="se-error">{error}</div>}

      {attempt && (<>
        {/* Hero banner */}
        <div className="se-result-hero">
          <div className="se-result-hero-left">
            <span className="se-grade-badge" style={{ background: `${gradeColor}22`, color: gradeColor, borderColor: `${gradeColor}44` }}>
              {gradeLabel}
            </span>
            <div className="se-result-score">{pct}%</div>
            <p className="se-result-note">{perfNote(pct)}</p>
            <div className="se-result-metrics">
              {[
                { label: "Score",     value: `${attempt.score} / ${totalScore}` },
                { label: "Questions", value: totalQ },
                { label: "Correct",   value: correct },
                { label: "Time Used", value: fmtTime(timeTakenMs) },
              ].map(({ label, value }) => (
                <div key={label} className="se-result-metric">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="se-result-hero-right">
            <ScoreRing percent={pct} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="se-stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { label: "Total",     value: totalQ,      icon: "📋", cls: "se-stat--purple"  },
            { label: "Correct",   value: correct,     icon: "✅", cls: "se-stat--green"   },
            { label: "Incorrect", value: incorrect,   icon: "❌", cls: ""                 },
            { label: "Unanswered",value: unattempted, icon: "⬜", cls: ""                 },
          ].map(({ label, value, icon, cls }) => (
            <div key={label} className={`se-stat ${cls}`}
              style={!cls ? { background: "linear-gradient(135deg,#fff5f5,#fee2e2)", borderColor: "#fecaca" } : {}}>
              <span className="se-stat-icon">{icon}</span>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Details row */}
        <div className="se-result-details">
          {/* Breakdown bars */}
          <div className="se-result-card">
            <h3>Question Breakdown</h3>
            <div className="se-bars">
              {[
                { label: "Correct",    count: correct,     pct: totalQ ? Math.round((correct/totalQ)*100)     : 0, color: "#22c55e" },
                { label: "Incorrect",  count: incorrect,   pct: totalQ ? Math.round((incorrect/totalQ)*100)   : 0, color: "#ef4444" },
                { label: "Unanswered", count: unattempted, pct: totalQ ? Math.round((unattempted/totalQ)*100) : 0, color: "#a78bfa" },
              ].map(({ label, count, pct: p, color }) => (
                <div key={label} className="se-bar-row">
                  <span className="se-bar-label">{label}</span>
                  <div className="se-bar-track"><div className="se-bar-fill" style={{ width: `${p}%`, background: color }}/></div>
                  <span className="se-bar-count" style={{ color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exam details */}
          <div className="se-result-card">
            <h3>Exam Details</h3>
            <div className="se-info-list">
              {[
                { label: "Exam Name",  value: exam?.title || attempt.examId },
                { label: "Attempt ID", value: formatAttemptId(attempt?.id) },
                { label: "Duration",   value: `${exam?.durationMinutes ?? "—"} min` },
                { label: "Time Taken", value: fmtTime(timeTakenMs) },
                { label: "Submitted",  value: fmt(attempt?.submittedAt) },
              ].map(({ label, value }) => (
                <div key={label} className="se-info-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="se-result-actions">
          <Link to="/student" className="se-btn-ghost">← Dashboard</Link>
          <Link to="/student/results" className="se-start-btn" style={{ textDecoration: "none", textAlign: "center" }}>
            See All Results
          </Link>
        </div>
      </>)}
    </StudentShell>
  );
}
