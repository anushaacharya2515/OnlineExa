import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import StudentShell from "../components/StudentShell";

/* ═══════════════════════════════
   Helpers
═══════════════════════════════ */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning",   emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return       { text: "Good evening",   emoji: "🌙" };
}
const firstName = (email) => email?.split("@")[0] || "Student";
const clamp     = (v)     => Math.min(100, Math.max(0, Number(v || 0)));
const fmtShort  = (iso)   => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const fmtFull   = (iso)   => iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "";

/* countdown string */
function countdown(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Open now";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `in ${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `in ${h}h ${m}m`;
}

/* streak: consecutive days with a submission up to today */
function calcStreak(results) {
  if (!results.length) return 0;
  const days = new Set(
    results.map(r => new Date(r.submittedAt).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* motivational message based on avg */
function motivation(avg, completed) {
  if (completed === 0) return { msg: "Take your first exam to get started!", color: "#9333ea" };
  if (avg >= 90) return { msg: "Outstanding! You're in the top tier 🏆", color: "#059669" };
  if (avg >= 75) return { msg: "Great work! Keep pushing higher 🚀",      color: "#7c3aed" };
  if (avg >= 60) return { msg: "You're passing — aim for excellence 💪",   color: "#9333ea" };
  return              { msg: "Keep practicing — you'll get there! 📚",     color: "#dc2626" };
}

/* ═══════════════════════════════
   Sub-components
═══════════════════════════════ */

/* SVG ring */
function Ring({ value = 0, size = 118, stroke = 11, color = "#9333ea", bg = "#f3e8ff", label }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg}    strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x={size/2} y={size/2 - 5}  textAnchor="middle" fontSize={size*0.19} fontWeight="800" fill="#3b0764">{value}%</text>
      <text x={size/2} y={size/2 + 14} textAnchor="middle" fontSize={size*0.1}  fill="#7e22ce">{label}</text>
    </svg>
  );
}

/* chart tooltip */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="sd3-tip">
      <div className="sd3-tip-lbl">{label}</div>
      <div className="sd3-tip-val" style={{ color: v >= 60 ? "#22c55e" : "#ef4444" }}>{v}%</div>
    </div>
  );
}

/* score pill */
function Pill({ score }) {
  const p = clamp(score);
  return <span className={`sd3-pill ${p >= 60 ? "sd3-pill--pass" : "sd3-pill--fail"}`}>{p}%</span>;
}

/* mini calendar — shows dots on days that have exams */
function MiniCalendar({ exams }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const examDays = new Set(
    exams
      .filter(e => e.startDate)
      .map(e => {
        const d = new Date(e.startDate);
        if (d.getFullYear() === year && d.getMonth() === month) return d.getDate();
        return null;
      })
      .filter(Boolean)
  );

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = now.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="sd3-cal">
      <div className="sd3-cal-hd">{monthName}</div>
      <div className="sd3-cal-grid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="sd3-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={`sd3-cal-day ${d === now.getDate() ? "sd3-cal-day--today" : ""} ${d && examDays.has(d) ? "sd3-cal-day--exam" : ""}`}>
            {d || ""}
            {d && examDays.has(d) && <span className="sd3-cal-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* streak fire widget */
function StreakWidget({ streak }) {
  const flames = Math.min(streak, 7);
  return (
    <div className="sd3-streak">
      <div className="sd3-streak-top">
        <span className="sd3-streak-fire">🔥</span>
        <div>
          <strong>{streak}</strong>
          <span>day streak</span>
        </div>
      </div>
      <div className="sd3-streak-bar">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`sd3-streak-seg ${i < flames ? "sd3-streak-seg--on" : ""}`} />
        ))}
      </div>
      <p className="sd3-streak-msg">
        {streak === 0 ? "Start your streak today!" :
         streak < 3   ? "Keep it going!" :
         streak < 7   ? "You're on fire! 🔥" : "Unstoppable! 🏆"}
      </p>
    </div>
  );
}

/* upcoming exam card */
function UpcomingCard({ exam, onStart }) {
  const cd = exam.startDate ? countdown(exam.startDate) : null;
  const isOpen = !exam.startDate || new Date(exam.startDate) <= new Date();
  return (
    <div className={`sd3-upcoming-card ${isOpen ? "sd3-upcoming-card--open" : ""}`}>
      <div className="sd3-upcoming-left">
        <div className={`sd3-upcoming-badge ${isOpen ? "sd3-upcoming-badge--open" : "sd3-upcoming-badge--soon"}`}>
          {isOpen ? "Open" : cd}
        </div>
        <div>
          <b>{exam.title}</b>
          <div className="sd3-tags" style={{ marginTop: 4 }}>
            <span className="sd3-tag">⏱ {exam.durationMinutes}m</span>
            <span className="sd3-tag">❓ {exam.totalQuestions}q</span>
            {exam.subject && exam.subject !== "General" && (
              <span className="sd3-tag">{exam.subject}</span>
            )}
          </div>
        </div>
      </div>
      {isOpen && !exam.attempted && (
        <button className="sd3-btn-start" onClick={() => onStart(exam.id)}>Start →</button>
      )}
      {exam.attempted && (
        <button disabled className="sd3-btn-done">Done ✓</button>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   Main Dashboard
═══════════════════════════════ */
export default function StudentDashboard() {
  const { session, logout } = useAuth();
  const token    = session.token;
  const navigate = useNavigate();

  const [exams,   setExams]   = useState([]);
  const [results, setResults] = useState([]);
  const [error,   setError]   = useState("");
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    Promise.all([
      api("/student/exams",   { token }),
      api("/student/results", { token }),
    ]).then(([e, r]) => { setExams(e); setResults(r); setLoaded(true); })
      .catch(err => { setError(err.message); setLoaded(true); });
  }, []);

  /* derived */
  const examById  = useMemo(() => Object.fromEntries(exams.map(e => [e.id, e])), [exams]);
  const scores    = results.map(r => clamp(r.score));
  const completed = results.length;
  const pending   = exams.filter(e => !e.attempted).length;
  const avg       = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  const best      = scores.length ? Math.max(...scores) : 0;
  const passCount = scores.filter(s => s >= 60).length;
  const failCount = scores.length - passCount;
  const streak    = useMemo(() => calcStreak(results), [results]);
  const { msg: motivMsg, color: motivColor } = motivation(avg, completed);

  /* rank: simple percentile simulation */
  const rankLabel = useMemo(() => {
    if (!completed) return null;
    if (avg >= 90) return "Top 10%";
    if (avg >= 75) return "Top 25%";
    if (avg >= 60) return "Top 50%";
    return "Keep going";
  }, [avg, completed]);

  /* trend chart */
  const trendData = useMemo(() =>
    [...results]
      .sort((a,b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(-8)
      .map((r, i) => ({
        name:  examById[r.examId]?.title?.slice(0, 10) || `#${i+1}`,
        score: clamp(r.score),
        correct: r.correct || 0,
        wrong:   r.wrong   || 0,
      })),
  [results, examById]);

  const barData = [
    { name: "Pass ✓", value: passCount, color: "#22c55e" },
    { name: "Fail ✗", value: failCount, color: "#f87171" },
  ];

  const recent = useMemo(() =>
    [...results]
      .sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5),
  [results]);

  /* upcoming = not attempted, sorted by startDate */
  const upcoming = useMemo(() =>
    exams
      .filter(e => !e.attempted)
      .sort((a,b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate) - new Date(b.startDate);
      })
      .slice(0, 4),
  [exams]);

  async function startExam(id) {
    try {
      const a = await api(`/student/exams/${id}/start`, { token, method: "POST" });
      navigate(`/exam/${a.id}`);
    } catch (err) {
      setError(typeof err.status === "number" ? err.message : "Cannot connect to backend.");
    }
  }

  const { text: greetText, emoji: greetEmoji } = getGreeting();
  const name = firstName(session.user.email);

  return (
    <StudentShell active="dashboard">

        {/* top bar */}
        <header className="sd3-topbar">
          <div>
            <p className="sd3-greet">{greetText}, {name} {greetEmoji}</p>
            <h1 className="sd3-title">Dashboard</h1>
          </div>
          <div className="sd3-user-chip">
            <span className="sd3-online-dot" />
            {session.user.email}
          </div>
        </header>

        {error && <div className="sd3-error">{error}</div>}

        {/* motivation banner */}
        <div className="sd3-motiv-banner" style={{ borderLeftColor: motivColor }}>
          <span className="sd3-motiv-icon" style={{ color: motivColor }}>💡</span>
          <span>{motivMsg}</span>
        </div>

        {/* KPI cards */}
        <section className="sd3-kpis">
          {[
            { label: "Pending Exams", value: pending,    icon: "📋", cls: "sd3-kpi--blue"   },
            { label: "Completed",     value: completed,  icon: "✅", cls: "sd3-kpi--green"  },
            { label: "Average Score", value: `${avg}%`,  icon: "📈", cls: "sd3-kpi--purple" },
            { label: "Best Score",    value: `${best}%`, icon: "🏆", cls: "sd3-kpi--gold"   },
          ].map(({ label, value, icon, cls }) => (
            <div key={label} className={`sd3-kpi ${cls}`}>
              <div className="sd3-kpi-icon">{icon}</div>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </section>

        {/* hero performance row */}
        <section className="sd3-perf-row">

          {/* score trend area chart */}
          <div className="sd3-card sd3-card--trend">
            <div className="sd3-card-hd">
              <div>
                <h3>Score Trend</h3>
                <p className="sd3-card-sub">Last {trendData.length} attempts</p>
              </div>
              <Pill score={avg} />
            </div>
            {trendData.length === 0 ? (
              <div className="sd3-empty"><span>📉</span><p>No attempts yet — take an exam!</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#9333ea" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#9333ea" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f0fb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="4 3"
                    label={{ value: "Pass line", position: "insideTopRight", fontSize: 9, fill: "#d97706" }} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="score"
                    stroke="#9333ea" strokeWidth={2.5} fill="url(#sg)"
                    dot={{ r: 4, fill: "#9333ea", stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* rings + pass/fail */}
          <div className="sd3-card sd3-card--rings">
            <div className="sd3-card-hd">
              <h3>Performance</h3>
              <p className="sd3-card-sub">At a glance</p>
            </div>
            <div className="sd3-rings-row">
              <Ring value={avg}  color="#9333ea" bg="#f3e8ff" label="Average" />
              <Ring value={best} color="#7c3aed" bg="#ede9fe" label="Best"    />
            </div>
            {scores.length > 0 && (
              <div className="sd3-pf-row">
                <div className="sd3-pf-item sd3-pf-item--pass">
                  <strong>{passCount}</strong><span>Passed</span>
                </div>
                <div className="sd3-pf-divider" />
                <div className="sd3-pf-item sd3-pf-item--fail">
                  <strong>{failCount}</strong><span>Failed</span>
                </div>
              </div>
            )}
          </div>

          {/* bar chart */}
          <div className="sd3-card sd3-card--bar">
            <div className="sd3-card-hd">
              <div><h3>Pass / Fail</h3><p className="sd3-card-sub">{scores.length} total</p></div>
            </div>
            {scores.length === 0 ? (
              <div className="sd3-empty"><span>📊</span><p>No data yet</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f0fb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8,8,0,0]}>
                    {barData.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </section>

        {/* upcoming exams */}
        <section className="sd3-section">
          <div className="sd3-section-hd">
            <h3>Upcoming Exams</h3>
            <Link to="/student/exams" className="sd3-link">See all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="sd3-empty sd3-empty--inline">
              <span>🗂️</span><p>No pending exams right now</p>
            </div>
          ) : (
            <div className="sd3-upcoming-grid">
              {upcoming.map(e => (
                <UpcomingCard key={e.id} exam={e} onStart={startExam} />
              ))}
            </div>
          )}
        </section>

        {/* recent results */}
        <section className="sd3-section">
          <div className="sd3-section-hd">
            <h3>Recent Results</h3>
            <Link to="/student/results" className="sd3-link">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="sd3-empty sd3-empty--inline">
              <span>🎯</span><p>No results yet — submit an exam to see your score</p>
            </div>
          ) : (
            <div className="sd3-results-table">
              <div className="sd3-results-thead">
                <span>Exam</span><span>Date</span><span>Score</span><span>Status</span><span></span>
              </div>
              {recent.map(r => {
                const p = clamp(r.score);
                const pass = p >= 60;
                return (
                  <div key={r.id} className="sd3-results-row">
                    <span className="sd3-results-name">{examById[r.examId]?.title || r.examId}</span>
                    <span className="sd3-results-date">{fmtFull(r.submittedAt)}</span>
                    <span>
                      <div className="sd3-score-bar-wrap">
                        <div className="sd3-score-bar" style={{
                          width: `${p}%`,
                          background: pass ? "#22c55e" : "#f87171"
                        }} />
                        <span className="sd3-score-bar-label">{p}%</span>
                      </div>
                    </span>
                    <span>
                      <span className={`sd3-status-badge ${pass ? "sd3-status-badge--pass" : "sd3-status-badge--fail"}`}>
                        {pass ? "✓ Pass" : "✗ Fail"}
                      </span>
                    </span>
                    <span>
                      <Link to={`/student/result/${r.id}`} className="sd3-view-btn">View →</Link>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

    </StudentShell>
  );
}
