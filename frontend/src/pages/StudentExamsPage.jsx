import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import StudentShell from "../components/StudentShell";

function statusOf(exam) {
  const now = Date.now();
  const start = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const end = exam.endDate ? new Date(exam.endDate).getTime() : null;
  if (exam.attempted) return "completed";
  if (start && now < start) return "upcoming";
  if (end && now > end) return "completed";
  return "active";
}

function fmtDate(date) {
  if (!date) return "Today";
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fmtClock(d) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function StudentExamsPage() {
  const { session } = useAuth();
  const token = session.token;
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api("/student/exams", { token })
      .then((data) => setExams(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      const text = `${e.examName || e.title} ${e.subject || ""}`.toLowerCase();
      const s = statusOf(e);
      const queryMatch = !query.trim() || text.includes(query.toLowerCase());
      const filterMatch = filter === "all" || filter === s;
      return queryMatch && filterMatch;
    });
  }, [exams, query, filter]);

  const available = filtered.filter((e) => statusOf(e) !== "completed");
  const completed = filtered.filter((e) => statusOf(e) === "completed");

  const firstUpcoming = available.find((e) => statusOf(e) === "upcoming" && e.startDate);
  const noticeText = firstUpcoming
    ? `Test starts at ${fmtDate(firstUpcoming.startDate)}`
    : "Secure exam environment active. Do not switch tabs during exam.";

  const profileInitial = (session.user.name || session.user.email || "S").slice(0, 1).toUpperCase();

  return (
    <StudentShell active="exams">
      <div className="se3-root">
        <div className="se3-notice">⚠ {noticeText}</div>

        <header className="se3-topbar">
          <div>
            <h1>Online Examination Portal</h1>
            <p>Welcome back, {session.user.name || session.user.email}.</p>
          </div>
          <div className="se3-topbar-right">
            <div className="se3-clock">{fmtClock(now)}</div>
            <div className="se3-bell">🔔</div>
            <div className="se3-user">{profileInitial}</div>
          </div>
        </header>

        {error && <div className="se-error">{error}</div>}

        <section className="se3-hero">
          <div>
            <h2>Secure Exam Session Ready</h2>
            <p>Your verification and proctoring checks are active. Start your exam when ready.</p>
          </div>
          <div className="se3-hero-mark">🛡</div>
        </section>

        <section className="se3-guidelines">
          <h3>Examination Guidelines</h3>
          <ul>
            <li>Do not switch tabs</li>
            <li>Exam auto-submits after timeout</li>
            <li>Stable internet required</li>
            <li>Fullscreen mode enabled</li>
          </ul>
        </section>

        <section className="se3-filters">
          <input placeholder="Search exams..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Exams</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </section>

        <section className="se3-section">
          <h3>Live / Upcoming Exams</h3>
          {loading && <div className="se-loading">Loading exams...</div>}
          {!loading && available.length === 0 && (
            <div className="se3-empty">🎉 No active examinations currently. New exams will appear automatically.</div>
          )}
          <div className="se3-grid">
            {available.map((e) => {
              const s = statusOf(e);
              return (
                <article className="se3-card" key={e.id}>
                  <div className="se3-card-head">
                    <span className={`se3-status se3-status--${s}`}>{s === "active" ? "LIVE" : "UPCOMING"}</span>
                    <span className="se3-secure">Secure Mode Enabled</span>
                  </div>
                  <h4>{e.examName || e.title}</h4>
                  <p>⏱ Duration: {e.durationMinutes} mins</p>
                  <p>❓ Questions: {e.totalQuestions}</p>
                  <p>📅 {fmtDate(e.startDate)}</p>
                  <button onClick={() => navigate(`/student/exams/${e.id}/guidelines`)}>Start Exam</button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="se3-section">
          <h3>Completed Exams</h3>
          <div className="se3-grid se3-grid--completed">
            {completed.map((e) => (
              <article className="se3-card se3-card--done" key={e.id}>
                <h4>✔ {e.examName || e.title}</h4>
                <p>Submitted Successfully</p>
                <p>Attempt Completed</p>
              </article>
            ))}
          </div>
        </section>

      </div>
    </StudentShell>
  );
}
