import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import StudentShell from "../components/StudentShell";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentResultsPage() {
  const { session } = useAuth();
  const token = session.token;

  const [exams,   setExams]   = useState([]);
  const [results, setResults] = useState([]);
  const [error,   setError]   = useState("");

  useEffect(() => {
    Promise.all([api("/student/exams", { token }), api("/student/results", { token })])
      .then(([e, r]) => { setExams(e); setResults(r); })
      .catch(err => setError(err.message));
  }, []);

  const examById   = useMemo(() => Object.fromEntries(exams.map(e => [e.id, e])), [exams]);
  const sorted     = useMemo(() => [...results].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)), [results]);
  const avgScore   = results.length ? Math.round(results.reduce((s, r) => s + Number(r.score || 0), 0) / results.length) : 0;
  const bestResult = results.reduce((best, r) => (!best || Number(r.score || 0) > Number(best.score || 0) ? r : best), null);
  const lastResult = sorted[0] || null;

  return (
    <StudentShell active="results">
      <header className="se-header">
        <div>
          <p className="se-header-sub">Overview</p>
          <h1 className="se-header-title">My Results</h1>
        </div>
        <div className="se-header-chip">{session.user.email}</div>
      </header>

      {error && <div className="se-error">{error}</div>}

      {/* KPI cards */}
      <div className="se-stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="se-stat se-stat--purple">
          <span className="se-stat-icon">📋</span>
          <strong>{results.length}</strong>
          <span>Total Attempts</span>
        </div>
        <div className="se-stat se-stat--lavender">
          <span className="se-stat-icon">📈</span>
          <strong>{avgScore}</strong>
          <span>Average Score</span>
        </div>
        <div className="se-stat se-stat--green">
          <span className="se-stat-icon">🏆</span>
          <strong>{bestResult ? bestResult.score : "—"}</strong>
          <span>Best Score</span>
        </div>
        <div className="se-stat" style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", borderColor: "#c7d2fe" }}>
          <span className="se-stat-icon">🕐</span>
          <strong style={{ fontSize: "1.2rem" }}>{lastResult ? fmtDate(lastResult.submittedAt) : "—"}</strong>
          <span>Last Submission</span>
        </div>
      </div>

      {/* Results table */}
      <section className="se-results-card">
        <div className="se-results-hd">
          <div>
            <h3>Result History</h3>
            <p>All your submitted exam attempts.</p>
          </div>
          {lastResult && (
            <Link to={`/student/result/${lastResult.id}`} className="se-view-latest">
              View Latest →
            </Link>
          )}
        </div>

        {results.length === 0 ? (
          <div className="se-empty">
            <span>🎯</span>
            <p>No results yet — submit an exam to see your score here.</p>
          </div>
        ) : (
          <div className="se-table-wrap">
            <table className="se-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Submitted (IST)</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const score = Number(r.score || 0);
                  const pass  = score >= 6;
                  return (
                    <tr key={r.id}>
                      <td className="se-td-name">{examById[r.examId]?.title || r.examId}</td>
                      <td><span className="se-score-chip">{score}</span></td>
                      <td className="se-td-date">{fmt(r.submittedAt)}</td>
                      <td><span className={`se-status ${pass ? "se-status--pass" : "se-status--fail"}`}>{pass ? "✓ Pass" : "✗ Fail"}</span></td>
                      <td><Link to={`/student/result/${r.id}`} className="se-view-btn">View</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </StudentShell>
  );
}
