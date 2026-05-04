import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import StudentShell from "../components/StudentShell";

export default function StudentExamsPage() {
  const { session } = useAuth();
  const token = session.token;
  const navigate = useNavigate();

  const [exams,   setExams]   = useState([]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/student/exams", { token })
      .then(data => setExams(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function startExam(examId) {
    setError("");
    try {
      const attempt = await api(`/student/exams/${examId}/start`, { token, method: "POST" });
      navigate(`/exam/${attempt.id}`);
    } catch (err) {
      setError(typeof err.status === "number" ? err.message : "Cannot connect to backend. Please try again later.");
    }
  }

  const available = exams.filter(e => !e.attempted);
  const attempted = exams.filter(e => e.attempted);

  return (
    <StudentShell active="exams">
      <header className="se-header">
        <div>
          <p className="se-header-sub">Student Portal</p>
          <h1 className="se-header-title">Available Exams</h1>
        </div>
        <div className="se-header-chip">{session.user.email}</div>
      </header>

      {error && <div className="se-error">{error}</div>}

      {/* Stats */}
      <div className="se-stats">
        <div className="se-stat se-stat--purple">
          <span className="se-stat-icon">📋</span>
          <strong>{available.length}</strong>
          <span>Available Now</span>
        </div>
        <div className="se-stat se-stat--green">
          <span className="se-stat-icon">✅</span>
          <strong>{attempted.length}</strong>
          <span>Completed</span>
        </div>
        <div className="se-stat se-stat--lavender">
          <span className="se-stat-icon">📚</span>
          <strong>{exams.length}</strong>
          <span>Total Published</span>
        </div>
      </div>

      {/* Available exams */}
      <section className="se-section">
        <div className="se-section-hd">
          <h3>Start an Exam</h3>
          <span className="se-section-sub">Only exams within their active window are shown.</span>
        </div>

        {loading && <div className="se-loading">Loading exams…</div>}

        {!loading && available.length === 0 && (
          <div className="se-empty">
            <span>🗂️</span>
            <p>No exams available right now. Check back later.</p>
          </div>
        )}

        <div className="se-exam-grid">
          {available.map(e => (
            <div key={e.id} className="se-exam-card">
              <div className="se-exam-card-top">
                <div className="se-exam-icon">📝</div>
                <span className="se-exam-subject">{e.subject || "General"}</span>
              </div>
              <h4 className="se-exam-title">{e.examName || e.title}</h4>
              <div className="se-exam-meta">
                <span>⏱ {e.durationMinutes} min</span>
                <span>❓ {e.totalQuestions} questions</span>
              </div>
              {e.startDate && <div className="se-exam-date">From: {new Date(e.startDate).toLocaleString()}</div>}
              {e.endDate   && <div className="se-exam-date">Until: {new Date(e.endDate).toLocaleString()}</div>}
              <button className="se-start-btn" onClick={() => startExam(e.id)}>
                Start Exam →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Completed exams */}
      {attempted.length > 0 && (
        <section className="se-section">
          <div className="se-section-hd">
            <h3>Completed Exams</h3>
          </div>
          <div className="se-exam-grid">
            {attempted.map(e => (
              <div key={e.id} className="se-exam-card se-exam-card--done">
                <div className="se-exam-card-top">
                  <div className="se-exam-icon">✅</div>
                  <span className="se-exam-subject">{e.subject || "General"}</span>
                </div>
                <h4 className="se-exam-title">{e.examName || e.title}</h4>
                <div className="se-exam-meta">
                  <span>⏱ {e.durationMinutes} min</span>
                  <span>❓ {e.totalQuestions} questions</span>
                </div>
                <button disabled className="se-done-btn">Already Attempted ✓</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </StudentShell>
  );
}
