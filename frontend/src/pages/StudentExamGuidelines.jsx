import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import StudentShell from "../components/StudentShell";

function formatDuration(mins) {
  const total = Math.max(0, Number(mins || 0)) * 60;
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function StudentExamGuidelines() {
  const { examId } = useParams();
  const { session } = useAuth();
  const token = session.token;
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api(`/student/exams/${examId}`, { token })
      .then((data) => {
        if (data?.attempted) {
          setError("You have already attempted this exam.");
          return;
        }
        setExam(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [examId, token]);

  const canStart = useMemo(() => keyword.trim().toLowerCase() === "start", [keyword]);

  async function handleStart() {
    if (!canStart || starting || !exam) return;
    setStarting(true);
    setError("");
    try {
      const attempt = await api(`/student/exams/${exam.id}/start`, { token, method: "POST" });
      navigate(`/exam/${attempt.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  return (
    <StudentShell active="exams">
      <div className="se-guide-wrap">
        {loading && <div className="se-loading">Loading guidelines...</div>}
        {error && <div className="se-error">{error}</div>}

        {!loading && !error && exam && (
          <div className="se-guide">
            <section className="se-guide-left">
              <h1>{exam.examName || exam.title}</h1>
              <div className="se-guide-stats">
                <div><span>Questions</span><strong>{exam.totalQuestions}</strong></div>
                <div><span>Marks</span><strong>{exam.totalMarks}</strong></div>
              </div>
            </section>

            <section className="se-guide-right">
              <h3>Guidelines</h3>
              <h4>Timelines & Questions</h4>
              <ul>
                <li><strong>Assessment Duration:</strong> {formatDuration(exam.durationMinutes)} (hh:mm:ss)</li>
                <li><strong>Total Questions to be answered:</strong> {exam.totalQuestions} Questions</li>
                <li><strong>Total Marks:</strong> {exam.totalMarks}</li>
                <li>
                  <strong>Negative Marking:</strong> {exam.negativeMarking
                    ? `Enabled (${exam.negativeMarkValue} x question marks deducted for wrong attempted answers)`
                    : "Not applicable"}
                </li>
                <li>Do not close the window or tab if you wish to continue the application.</li>
                <li>Please ensure that you attempt the assessment in one sitting as once you start the assessment, the timer will not stop.</li>
              </ul>

              <div className="se-guide-actions">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder='Type "start" to Start'
                />
                <button type="button" onClick={handleStart} disabled={!canStart || starting}>
                  {starting ? "Starting..." : "Start ->"}
                </button>
              </div>
              <Link className="se-link" to="/student/exams">Back to exams</Link>
            </section>
          </div>
        )}
      </div>
    </StudentShell>
  );
}

