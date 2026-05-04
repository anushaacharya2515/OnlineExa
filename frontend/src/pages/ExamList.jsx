import { useEffect, useState } from "react";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";

export default function ExamList({ refreshToken = 0, compact = false }) {
  const { session } = useAuth();
  const token = session.token;
  const [exams, setExams] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await apiClient.get("/exams", withAuth(token));
      setExams(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    load();
  }, [refreshToken]);

  if (compact) {
    return (
      <div className="card compact-side-card">
        <h3>Exam List</h3>
        <p className="muted">Recently created exams.</p>
        {error && <div className="error">{error}</div>}
        {exams.length === 0 ? (
          <div className="selection-empty">No exams created yet.</div>
        ) : (
          <div className="compact-list">
            {exams.slice(0, 6).map((e) => (
              <div key={e.id} className="compact-item">
                <div className="compact-item-row">
                  <div className="compact-item-title">{e.examName || e.title}</div>
                  <span className="compact-pill">{e.durationMinutes} min</span>
                </div>
                <div className="compact-item-meta">
                  <span>{e.subject || "General"}</span>
                  <span>{e.totalQuestions || e.questionIds?.length || 0} questions</span>
                  <span>{e.totalMarks || 0} marks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Exam List</h3>
      <p className="muted">All created exams.</p>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Subject</th>
              <th>Duration</th>
              <th>Total Questions</th>
              <th>Total Marks</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-cell">No exams created yet.</td>
              </tr>
            )}
            {exams.map((e) => (
              <tr key={e.id}>
                <td>{e.examName || e.title}</td>
                <td>{e.subject || "-"}</td>
                <td>{e.durationMinutes} min</td>
                <td>{e.totalQuestions || e.questionIds?.length || 0}</td>
                <td>{e.totalMarks || "-"}</td>
                <td>{e.startDate || "-"}</td>
                <td>{e.endDate || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
