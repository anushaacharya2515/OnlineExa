import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/AdminShell";
import { formatAttemptId } from "../utils/attemptId";

export default function AdminDashboard() {
  const { session } = useAuth();
  const token = session.token;

  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");

  const examById = useMemo(() => Object.fromEntries(exams.map((e) => [e.id, e])), [exams]);
  const resultsByExam = useMemo(() => {
    return results.reduce((acc, r) => {
      const key = r.examId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [results]);

  const scoresByDay = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      const d = (r.submittedAt || "").slice(0, 10);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(Number(r.score || 0));
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, scores]) => ({
        day,
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      }))
      .slice(-10);
  }, [results]);

  const attemptsByDay = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      const d = (r.submittedAt || "").slice(0, 10);
      if (!d) return;
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }))
      .slice(-10);
  }, [results]);

  const avgScoreByExam = useMemo(() => {
    return Object.entries(resultsByExam).map(([examId, list]) => {
      const avg = list.length
        ? Math.round(list.reduce((s, r) => s + Number(r.score || 0), 0) / list.length)
        : 0;
      return { examId, title: examById[examId]?.title || examId, avg };
    }).sort((a, b) => b.avg - a.avg).slice(0, 6);
  }, [resultsByExam, examById]);

  const difficultyDistribution = useMemo(() => {
    const map = { Easy: 0, Medium: 0, Hard: 0 };
    questions.forEach((q) => {
      if (map[q.difficulty] !== undefined) map[q.difficulty] += 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
  }, [questions]);

  const topStudents = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      const key = r.studentEmail || r.studentName || r.studentId;
      if (!map[key]) map[key] = { name: r.studentName || r.studentEmail || "Student", total: 0, count: 0 };
      map[key].total += Number(r.score || 0);
      map[key].count += 1;
    });
    return Object.values(map)
      .map((s) => ({ ...s, avg: Math.round(s.total / s.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [results]);

  const scoreWavePoints = useMemo(() => {
    if (!scoresByDay.length) return "";
    const max = Math.max(...scoresByDay.map((d) => d.avg), 1);
    return scoresByDay.map((d, i) => {
      const x = (i / Math.max(scoresByDay.length - 1, 1)) * 520 + 20;
      const y = 170 - (d.avg / max) * 130;
      return `${x},${y}`;
    }).join(" ");
  }, [scoresByDay]);

  const scoreWaveArea = useMemo(() => {
    if (!scoreWavePoints) return "";
    return `20,190 ${scoreWavePoints} 540,190`;
  }, [scoreWavePoints]);

  const attemptsMax = useMemo(() => Math.max(...attemptsByDay.map((d) => d.count), 1), [attemptsByDay]);

  const difficultySegments = useMemo(() => {
    const palette = {
      Easy: "#7c3aed",
      Medium: "#a855f7",
      Hard: "#c084fc"
    };
    let cursor = 0;
    const chunks = difficultyDistribution.map((item) => {
      const start = cursor;
      const end = start + item.pct;
      cursor = end;
      return `${palette[item.label] || "#8a8fa8"} ${start}% ${end}%`;
    });
    if (!chunks.length) return "conic-gradient(#dde5f6 0 100%)";
    return `conic-gradient(${chunks.join(", ")})`;
  }, [difficultyDistribution]);

  const recentActivity = useMemo(() => {
    return [...results]
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
      .slice(0, 7);
  }, [results]);

  async function load() {
    try {
      const [q, e, r, s] = await Promise.all([
        api("/admin/questions", { token }),
        api("/admin/exams", { token }),
        api("/admin/results", { token }),
        api("/admin/students", { token })
      ]);
      setQuestions(q);
      setExams(e);
      setResults(Array.isArray(r) ? r : (r.results || []));
      setStudents(s);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function isActiveExam(exam) {
    if (!exam?.published) return false;
    const now = Date.now();
    if (exam.startDate && now < new Date(exam.startDate).getTime()) return false;
    if (exam.endDate && now > new Date(exam.endDate).getTime()) return false;
    return true;
  }

  function downloadResultsCsv() {
    if (!results.length) return;
    const header = ["Student Name", "Student Email", "Attempt ID", "Exam", "Score", "Time Taken", "Submitted At"];
    const rows = results.map((r) => [
      r.studentName || r.studentEmail || "Unknown",
      r.studentEmail || "",
      formatAttemptId(r.id),
      r.examTitle || r.examId || "",
      r.score ?? 0,
      r.timeTakenMs ? `${Math.floor(r.timeTakenMs / 60000)}m ${Math.floor((r.timeTakenMs % 60000) / 1000)}s` : "-",
      r.submittedAt || ""
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatShortDate(dateLike) {
    if (!dateLike) return "-";
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <AdminShell title="Dashboard">
      {error && <div className="error">{error}</div>}
      <div className="admin-dashboard">
        <section className="admin-kpis admin-kpis-modern">
          <div className="kpi-card modern-kpi">
            <span>Total Exams</span>
            <strong>{exams.length}</strong>
          </div>
          <div className="kpi-card modern-kpi">
            <span>Active Exams</span>
            <strong>{exams.filter(isActiveExam).length}</strong>
          </div>
          <div className="kpi-card modern-kpi">
            <span>Total Students</span>
            <strong>{students.length}</strong>
          </div>
          <div className="kpi-card modern-kpi">
            <span>Submissions</span>
            <strong>{results.length}</strong>
          </div>
        </section>

        <section className="card dashboard-card admin-actions">
          <div className="table-header">
            <div>
              <h3>Quick Actions</h3>
              <p className="muted">Create exams or export results in one click.</p>
            </div>
            <div className="row-actions">
              <button onClick={() => window.location.assign("/admin/exams")}>Quick Create Exam</button>
              <button className="ghost" onClick={downloadResultsCsv}>Export Results (CSV)</button>
            </div>
          </div>
        </section>

        <section className="chart-grid admin-chart-grid">
          <article className="card chart-card admin-chart wave-chart-card">
            <h3>Performance Wave</h3>
            <p className="muted">Daily average score trend.</p>
            <div className="wave-chart-wrap">
              <svg className="wave-chart" viewBox="0 0 560 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="scoreWaveStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6d28d9" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="scoreWaveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(124, 58, 237, 0.32)" />
                    <stop offset="100%" stopColor="rgba(196, 132, 252, 0.04)" />
                  </linearGradient>
                </defs>
                {scoresByDay.length === 0 && <text x="20" y="100" fill="#7992bc">No score data yet</text>}
                {scoresByDay.length > 0 && (
                  <>
                    <polygon points={scoreWaveArea} fill="url(#scoreWaveFill)" />
                    <polyline points={scoreWavePoints} fill="none" stroke="url(#scoreWaveStroke)" strokeWidth="4" />
                    {scoresByDay.map((d, i) => {
                      const x = (i / Math.max(scoresByDay.length - 1, 1)) * 520 + 20;
                      const max = Math.max(...scoresByDay.map((v) => v.avg), 1);
                      const y = 170 - (d.avg / max) * 130;
                      return <circle key={d.day} cx={x} cy={y} r="4" fill="#7c3aed" />;
                    })}
                  </>
                )}
              </svg>
              <div className="wave-chart-labels">
                {scoresByDay.map((d) => (
                  <span key={d.day}>{d.day.slice(5)}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="card chart-card admin-chart attempts-column-card">
            <h3>Submission Pulse</h3>
            <p className="muted">Volume of attempts per day.</p>
            <div className="attempt-columns">
              {attemptsByDay.length === 0 && <div className="empty-item">No data</div>}
              {attemptsByDay.map((d) => (
                <div key={d.day} className="attempt-col-item">
                  <div className="attempt-col-track">
                    <div
                      className="attempt-col-fill"
                      style={{ height: `${Math.max(8, (d.count / attemptsMax) * 100)}%` }}
                    />
                  </div>
                  <strong>{d.count}</strong>
                  <span>{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card chart-card admin-chart difficulty-donut-card">
            <h3>Difficulty Split</h3>
            <p className="muted">Composition of question bank.</p>
            <div className="difficulty-layout">
              <div className="difficulty-donut" style={{ background: difficultySegments }}>
                <div>
                  <strong>{questions.length}</strong>
                  <span>Questions</span>
                </div>
              </div>
              <div className="difficulty-legend">
                {difficultyDistribution.map((d) => (
                  <div key={d.label} className="legend-row">
                    <span className={`legend-dot ${d.label.toLowerCase()}`} />
                    <p>{d.label}</p>
                    <strong>{d.pct}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="card chart-card admin-chart">
            <h3>Top Students</h3>
            <p className="muted">Highest average scores.</p>
            <div className="leaderboard">
              {topStudents.length === 0 && <div className="empty-item">No data</div>}
              {topStudents.map((s, idx) => (
                <div key={`${s.name}-${idx}`} className="leaderboard-row">
                  <span className="rank-chip">{idx + 1}</span>
                  <div>
                    <p>{s.name}</p>
                    <small>{s.count} attempts</small>
                  </div>
                  <strong>{s.avg}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card chart-card admin-chart">
            <h3>Exam Performance</h3>
            <p className="muted">Top exams ranked by average score.</p>
            <div className="exam-score-list">
              {avgScoreByExam.length === 0 && <div className="empty-item">No data</div>}
              {avgScoreByExam.map((d) => (
                <div key={d.examId} className="exam-score-row">
                  <p>{d.title}</p>
                  <div className="exam-score-track">
                    <div className="exam-score-fill" style={{ width: `${Math.min(100, d.avg)}%` }} />
                  </div>
                  <strong>{d.avg}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="card dashboard-card admin-activity-card">
          <h3>Recent Activity</h3>
          <p className="muted">Latest submitted attempts.</p>
          <ul className="activity-timeline">
            {recentActivity.length === 0 && <li className="empty-item">No recent submissions yet.</li>}
            {recentActivity.map((r) => (
              <li key={r.id}>
                <span className="timeline-dot" />
                <div>
                  <b>{r.studentName || r.studentEmail || "Student"}</b>
                  <p>{r.examTitle || r.examId || "Exam"} · Score {r.score ?? 0}</p>
                </div>
                <small>{formatShortDate(r.submittedAt)}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
