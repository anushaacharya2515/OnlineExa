import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

export default function QuestionBankPage() {
  const { session, logout } = useAuth();
  const token = session.token;

  const [questionBank, setQuestionBank] = useState([]);
  const [bankType, setBankType] = useState("ALL");
  const [bankQuery, setBankQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const qb = await api("/student/question-bank", { token });
        setQuestionBank(qb);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [token]);

  const bankTypes = useMemo(
    () => ["ALL", ...Array.from(new Set(questionBank.map((q) => q.type))).sort()],
    [questionBank]
  );

  const filteredBank = useMemo(() => {
    const query = bankQuery.trim().toLowerCase();
    return questionBank.filter((q) => {
      const typeOk = bankType === "ALL" || q.type === bankType;
      const content = `${q.text} ${q.passage || ""} ${q.assertion || ""} ${q.reason || ""} ${q.answer || ""}`.toLowerCase();
      const queryOk = !query || content.includes(query);
      return typeOk && queryOk;
    });
  }, [questionBank, bankType, bankQuery]);

  return (
    <div className="layout student-page">
      <header className="app-header">
        <div>
          <BrandLogo compact className="inline-header-logo" />
          <p className="eyebrow">Study Center</p>
          <h2>Question Bank</h2>
          <p className="muted">Use filters to find questions by topic or type.</p>
        </div>
        <nav className="student-nav">
          <Link to="/student">Dashboard</Link>
          <Link to="/student/question-bank">Question Bank</Link>
        </nav>
        <div className="header-actions">
          <span className="user-pill">{session.user.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="card study-bank">
        <div className="bank-filters">
          <select value={bankType} onChange={(e) => setBankType(e.target.value)}>
            {bankTypes.map((t) => (
              <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by keyword..."
            value={bankQuery}
            onChange={(e) => setBankQuery(e.target.value)}
          />
          <span className="bank-count">{filteredBank.length} found</span>
        </div>
        <ul className="list">
          {filteredBank.length === 0 && <li className="empty-item">No reference questions found for current filter.</li>}
          {filteredBank.map((q, idx) => (
            <li key={q.id} className="study-item">
              <div className="item-text">
                <b>{idx + 1}. [{q.type}]</b> {q.text}
                {q.imageUrl && <img src={q.imageUrl} alt="Question visual" className="study-media" />}
                {q.audioUrl && <audio controls src={q.audioUrl} className="study-media" />}
                {q.passage && <p className="muted">Passage: {q.passage}</p>}
                {q.assertion && <p className="muted">Assertion: {q.assertion}</p>}
                {q.reason && <p className="muted">Reason: {q.reason}</p>}
                {q.options?.length > 0 && <p className="muted">Options: {q.options.join(" | ")}</p>}
                <p className="study-answer">Answer: {q.answer}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
