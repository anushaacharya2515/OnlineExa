import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";
import "../ai-generator.css";

const QUESTION_TYPES = [
  { label: "Multiple Choice (MCQ)", value: "MCQ" },
  { label: "Multiple Select (MSQ)", value: "MSQ" },
  { label: "True / False", value: "TRUE_FALSE" },
  { label: "Fill in the Blank", value: "FILL_BLANK" },
  { label: "Integer Answer", value: "INTEGER" },
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function AIQuestionGenerator() {
  const { session } = useAuth();
  const token = session.token;

  const [modules,   setModules]   = useState([]);
  const [topics,    setTopics]    = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  const [form, setForm] = useState({
    moduleId: "", subject: "",
    topicId: "", topic: "",
    subtopicId: "", subtopic: "",
    questionType: "MCQ",
    difficulty: "Medium",
    count: 5
  });

  const [loading,    setLoading]    = useState(false);
  const [generated,  setGenerated]  = useState([]);
  const [edited,     setEdited]     = useState({});
  const [rejected,   setRejected]   = useState(new Set());
  const [saving,     setSaving]     = useState(false);
  const [message,    setMessage]    = useState("");
  const [error,      setError]      = useState("");

  useEffect(() => {
    apiClient.get("/modules", withAuth(token)).then(r => setModules(r.data || []));
  }, [token]);

  useEffect(() => {
    if (!form.moduleId) { setTopics([]); setSubtopics([]); return; }
    apiClient.get("/topics", { ...withAuth(token), params: { moduleId: form.moduleId } })
      .then(r => setTopics(r.data || []));
  }, [form.moduleId]);

  useEffect(() => {
    if (!form.topicId) { setSubtopics([]); return; }
    apiClient.get("/subtopics", { ...withAuth(token), params: { topicId: form.topicId } })
      .then(r => setSubtopics(r.data || []));
  }, [form.topicId]);

  function upd(patch) { setForm(p => ({ ...p, ...patch })); }

  async function generate() {
    if (!form.topic.trim()) { setError("Please select a topic."); return; }
    setError(""); setMessage(""); setLoading(true); setGenerated([]); setEdited({}); setRejected(new Set());
    try {
      const res = await apiClient.post("/ai/generate-questions", {
        topic: form.topic,
        subtopic: form.subtopic || "",
        subject: form.subject || form.topic,
        questionType: form.questionType,
        difficulty: form.difficulty,
        count: Number(form.count)
      }, withAuth(token));
      setGenerated(res.data.questions || []);
      if ((res.data.questions || []).length === 0) setError("No questions generated. Try a different topic.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  }

  function editQuestion(idx, field, value) {
    setEdited(p => ({ ...p, [idx]: { ...(p[idx] || generated[idx]), [field]: value } }));
  }

  function editOption(idx, oi, value) {
    const q = edited[idx] || generated[idx];
    const opts = [...(q.options || [])];
    opts[oi] = value;
    editQuestion(idx, "options", opts);
  }

  function toggleReject(idx) {
    setRejected(p => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  async function saveApproved() {
    const toSave = generated
      .map((q, i) => ({ ...(edited[i] || q) }))
      .filter((_, i) => !rejected.has(i));

    if (toSave.length === 0) { setError("No questions to save. Approve at least one."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await apiClient.post("/ai/approve", { questions: toSave }, withAuth(token));
      setMessage(res.data.message);
      setGenerated([]); setEdited({}); setRejected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setSaving(false); }
  }

  const approvedCount = generated.length - rejected.size;

  return (
    <AdminShell title="AI Question Generator">
      <div className="aig-shell">

        {/* ── Generator Form ── */}
        <div className="aig-form-card">
          <div className="aig-form-header">
            <span className="aig-badge">✨ AI Powered</span>
            <h3>Generate Questions with AI</h3>
            <p>Select topic, type, and difficulty — AI will generate questions instantly.</p>
          </div>

          <div className="aig-form-grid">
            <div className="aig-field">
              <label>Module</label>
              <select value={form.moduleId} onChange={e => {
                const m = modules.find(x => x._id === e.target.value);
                upd({ moduleId: e.target.value, subject: m?.name || "", topicId: "", topic: "", subtopicId: "", subtopic: "" });
              }}>
                <option value="">Select Module</option>
                {modules.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>

            <div className="aig-field">
              <label>Topic *</label>
              <select value={form.topicId} onChange={e => {
                const t = topics.find(x => x._id === e.target.value);
                upd({ topicId: e.target.value, topic: t?.name || "", subtopicId: "", subtopic: "" });
              }}>
                <option value="">Select Topic</option>
                {topics.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {!form.topicId && (
                <input className="aig-topic-input" placeholder="Or type topic manually…"
                  value={form.topic} onChange={e => upd({ topic: e.target.value })} />
              )}
            </div>

            <div className="aig-field">
              <label>Subtopic (optional)</label>
              <select value={form.subtopicId} onChange={e => {
                const s = subtopics.find(x => x._id === e.target.value);
                upd({ subtopicId: e.target.value, subtopic: s?.name || "" });
              }}>
                <option value="">All Subtopics</option>
                {subtopics.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div className="aig-field">
              <label>Question Type</label>
              <select value={form.questionType} onChange={e => upd({ questionType: e.target.value })}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="aig-field">
              <label>Difficulty</label>
              <select value={form.difficulty} onChange={e => upd({ difficulty: e.target.value })}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="aig-field">
              <label>Number of Questions (1–20)</label>
              <input type="number" min="1" max="20" value={form.count}
                onChange={e => upd({ count: Math.min(20, Math.max(1, Number(e.target.value))) })} />
            </div>
          </div>

          {error   && <div className="aig-error">{error}</div>}
          {message && <div className="aig-success">{message}</div>}

          <div className="aig-form-actions">
            <button className="aig-btn-generate" onClick={generate} disabled={loading}>
              {loading ? <><span className="aig-spinner"/>Generating…</> : "✨ Generate Questions"}
            </button>
            <Link to="/admin/question-bank" className="aig-btn-ghost">← Back to Question Bank</Link>
          </div>
        </div>

        {/* ── Generated Questions Preview ── */}
        {generated.length > 0 && (
          <div className="aig-preview">
            <div className="aig-preview-header">
              <div>
                <h3>Preview Generated Questions</h3>
                <p>{generated.length} questions generated · {approvedCount} approved · {rejected.size} rejected</p>
              </div>
              <button className="aig-btn-save" onClick={saveApproved} disabled={saving || approvedCount === 0}>
                {saving ? "Saving…" : `✅ Save ${approvedCount} to Question Bank`}
              </button>
            </div>

            <div className="aig-questions">
              {generated.map((q, idx) => {
                const current = { ...q, ...(edited[idx] || {}) };
                const isRejected = rejected.has(idx);
                return (
                  <div key={idx} className={`aig-q-card ${isRejected ? "aig-q-card--rejected" : ""}`}>
                    <div className="aig-q-header">
                      <span className="aig-q-num">Q{idx + 1}</span>
                      <span className={`aig-diff-badge aig-diff-${current.difficulty?.toLowerCase()}`}>{current.difficulty}</span>
                      <span className="aig-type-badge">{current.type}</span>
                      <div className="aig-q-actions">
                        <button className={`aig-btn-reject ${isRejected ? "aig-btn-reject--active" : ""}`}
                          onClick={() => toggleReject(idx)}>
                          {isRejected ? "↩ Restore" : "✕ Reject"}
                        </button>
                      </div>
                    </div>

                    {!isRejected && (<>
                      <textarea className="aig-q-text" value={current.text}
                        onChange={e => editQuestion(idx, "text", e.target.value)} rows={3}/>

                      {current.options?.length > 0 && (
                        <div className="aig-options">
                          <label>Options</label>
                          {current.options.map((o, oi) => (
                            <div key={oi} className="aig-option-row">
                              <span className="aig-opt-key">{String.fromCharCode(97+oi)})</span>
                              <input value={o} onChange={e => editOption(idx, oi, e.target.value)}/>
                              <span className={`aig-correct-dot ${
                                Array.isArray(current.correctAnswer)
                                  ? current.correctAnswer.includes(o) ? "aig-correct-dot--on" : ""
                                  : current.correctAnswer === o ? "aig-correct-dot--on" : ""
                              }`} title="Correct answer"/>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="aig-q-meta-row">
                        <div className="aig-field-inline">
                          <label>Correct Answer</label>
                          <input value={Array.isArray(current.correctAnswer) ? current.correctAnswer.join(", ") : (current.correctAnswer || "")}
                            onChange={e => editQuestion(idx, "correctAnswer", e.target.value)}/>
                        </div>
                        <div className="aig-field-inline">
                          <label>Marks</label>
                          <input type="number" min="1" value={current.marks || 1}
                            onChange={e => editQuestion(idx, "marks", Number(e.target.value))} style={{ width: "70px" }}/>
                        </div>
                      </div>

                      {current.explanation && (
                        <div className="aig-explanation">
                          <label>Explanation</label>
                          <textarea value={current.explanation} rows={2}
                            onChange={e => editQuestion(idx, "explanation", e.target.value)}/>
                        </div>
                      )}
                    </>)}

                    {isRejected && (
                      <p className="aig-rejected-msg">This question will not be saved.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="aig-preview-footer">
              <button className="aig-btn-save" onClick={saveApproved} disabled={saving || approvedCount === 0}>
                {saving ? "Saving…" : `✅ Save ${approvedCount} Approved Questions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
