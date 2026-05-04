import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import QuestionTable from "../components/QuestionTable";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";
import {
  TYPE_OPTIONS,
  TYPE_HELP,
  DIFFICULTY_OPTIONS,
  parsePairs,
  pairsToText,
  buildDragDropPairs
} from "./questionBankData";

export default function QuestionBank() {
  const { session } = useAuth();
  const token = session.token;
  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [formTopics, setFormTopics] = useState([]);
  const [filterTopics, setFilterTopics] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ moduleIds: [], topicIds: [], difficulty: "", type: "" });
  const [modalMode, setModalMode] = useState(null); // add | edit | preview
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [form, setForm] = useState({
    text: "",
    moduleId: "",
    topicId: "",
    module: "",
    topic: "",
    difficulty: "Easy",
    type: "MCQ",
    options: ["", "", "", ""],
    correctAnswer: "",
    msqCorrect: [],
    pairText: "",
    dragOrderText: "",
    imageUrl: "",
    audioUrl: "",
    explanation: "",
    marks: 1
  });

  async function load() {
    setError("");
    try {
      const res = await apiClient.get("/questions", withAuth(token));
      setQuestions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    apiClient.get("/modules", withAuth(token))
      .then((res) => setModules(res.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [token]);

  useEffect(() => {
    if (!form.moduleId) {
      setFormTopics([]);
      return;
    }

    apiClient.get("/topics", { ...withAuth(token), params: { moduleId: form.moduleId } })
      .then((res) => setFormTopics(res.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [form.moduleId, token]);

  useEffect(() => {
    if (!modules.length || form.moduleId) return;
    const firstModule = modules[0];
    setForm((prev) => ({
      ...prev,
      moduleId: firstModule?._id || "",
      module: firstModule?.name || ""
    }));
  }, [modules, form.moduleId]);

  useEffect(() => {
    if (!formTopics.length) {
      setForm((prev) => ({ ...prev, topicId: "", topic: "" }));
      return;
    }

    const hasSelectedTopic = formTopics.some((t) => t._id === form.topicId);
    if (hasSelectedTopic) return;

    const firstTopic = formTopics[0];
    setForm((prev) => ({
      ...prev,
      topicId: firstTopic?._id || "",
      topic: firstTopic?.name || ""
    }));
  }, [formTopics, form.topicId]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesModules = filters.moduleIds.length
        ? filters.moduleIds.includes(q.moduleId) || modules.some((m) => filters.moduleIds.includes(m._id) && m.name === q.subject)
        : true;
      const selectedTopicNames = filterTopics
        .filter((t) => filters.topicIds.includes(t._id))
        .map((t) => t.name);
      const matchesTopics = filters.topicIds.length
        ? filters.topicIds.includes(q.topicId) || selectedTopicNames.includes(q.topic)
        : true;
      const matchesSearch = search
        ? `${q.text || q.question_text || ""} ${q.subject || ""} ${q.topic || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesDifficulty = filters.difficulty ? q.difficulty === filters.difficulty : true;
      const matchesType = filters.type ? q.type === filters.type : true;
      return matchesModules && matchesTopics && matchesSearch && matchesDifficulty && matchesType;
    });
  }, [questions, search, filters, modules, filterTopics]);

  useEffect(() => {
    if (!filters.moduleIds.length) {
      setFilterTopics([]);
      if (filters.topicIds.length) {
        setFilters((prev) => ({ ...prev, topicIds: [] }));
      }
      return;
    }

    apiClient
      .get("/topics", { ...withAuth(token), params: { moduleIds: filters.moduleIds.join(",") } })
      .then((res) => setFilterTopics(res.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [filters.moduleIds, filters.topicIds.length, token]);


  function openAddModal() {
    setActiveQuestion(null);
    const firstModule = modules.find((m) => m._id === form.moduleId) || modules[0];
    const availableTopics = firstModule?._id === form.moduleId ? formTopics : [];
    const firstTopic = availableTopics[0];
    setForm({
      text: "",
      moduleId: firstModule?._id || "",
      topicId: firstTopic?._id || "",
      module: firstModule?.name || "",
      topic: firstTopic?.name || "",
      difficulty: "Easy",
      type: "MCQ",
      options: ["", "", "", ""],
      correctAnswer: "",
      msqCorrect: [],
      pairText: "",
      dragOrderText: "",
      imageUrl: "",
      audioUrl: "",
      explanation: "",
      marks: 1
    });
    setModalMode("add");
  }

  function openEditModal(question) {
    const matchedModule = modules.find((m) => m._id === question.moduleId || m.name === question.subject);
    const nextModuleId = matchedModule?._id || "";
    setActiveQuestion(question);
    setForm({
      text: question.text || question.question_text || "",
      moduleId: nextModuleId,
      topicId: question.topicId || "",
      module: matchedModule?.name || question.subject || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "Easy",
      type: question.type || "MCQ",
      options: Array.isArray(question.options) && question.options.length ? question.options : ["", "", "", ""],
      correctAnswer: typeof question.correctAnswer === "string" || typeof question.correctAnswer === "number" ? String(question.correctAnswer) : "",
      msqCorrect: Array.isArray(question.correctAnswer) ? question.correctAnswer : [],
      pairText: pairsToText(question.pairs),
      dragOrderText: Array.isArray(question.pairs)
        ? question.pairs.map((p) => p.right).join("\n")
        : "",
      imageUrl: question.imageUrl || "",
      audioUrl: question.audioUrl || "",
      explanation: question.explanation || "",
      marks: question.marks || 1
    });
    setModalMode("edit");
  }

  function duplicateQuestion(question) {
    const matchedModule = modules.find((m) => m._id === question.moduleId || m.name === question.subject);
    const nextModuleId = matchedModule?._id || "";
    setActiveQuestion(null);
    setForm({
      text: question.text || question.question_text || "",
      moduleId: nextModuleId,
      topicId: question.topicId || "",
      module: matchedModule?.name || question.subject || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "Easy",
      type: question.type || "MCQ",
      options: Array.isArray(question.options) && question.options.length ? question.options : ["", "", "", ""],
      correctAnswer: typeof question.correctAnswer === "string" || typeof question.correctAnswer === "number" ? String(question.correctAnswer) : "",
      msqCorrect: Array.isArray(question.correctAnswer) ? question.correctAnswer : [],
      pairText: pairsToText(question.pairs),
      dragOrderText: Array.isArray(question.pairs)
        ? question.pairs.map((p) => p.right).join("\n")
        : "",
      imageUrl: question.imageUrl || "",
      audioUrl: question.audioUrl || "",
      explanation: question.explanation || "",
      marks: question.marks || 1
    });
    setModalMode("add");
  }

  function openPreviewModal(question) {
    setActiveQuestion(question);
    setModalMode("preview");
  }

  function closeModal() {
    setModalMode(null);
    setActiveQuestion(null);
  }

  function updateOption(idx, value) {
    const next = [...form.options];
    next[idx] = value;
    setForm({ ...form, options: next });
  }

  function addOption() {
    setForm({ ...form, options: [...form.options, ""] });
  }

  function validate() {
    if (!form.text.trim()) return "Question text is required";
    if (!form.moduleId || !form.module) return "Module is required";
    if (!form.topicId || !form.topic) return "Topic is required";
    if (!form.marks || Number.isNaN(Number(form.marks))) return "Marks must be numeric";

    if (form.type === "MCQ") {
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return "MCQ must have at least 2 options";
      if (!form.correctAnswer) return "Correct answer is required";
      if (!options.includes(form.correctAnswer)) return "Correct answer must be one of the options";
    }

    if (form.type === "MSQ") {
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return "Multiple Select must have at least 2 options";
      if (form.msqCorrect.length === 0) return "Select at least one correct option";
    }

    if (form.type === "FILL_BLANK") {
      if (!form.correctAnswer.trim()) return "Correct answer is required";
    }

    if (form.type === "INTEGER") {
      if (form.correctAnswer === "") return "Correct integer answer is required";
      if (!Number.isInteger(Number(form.correctAnswer))) return "Answer must be an integer";
    }

    if (form.type === "MATCH") {
      const pairs = parsePairs(form.pairText);
      if (pairs.length === 0) return "Enter matching pairs using Left|Right per line";
    }

    if (form.type === "DRAG_DROP") {
      const pairs = buildDragDropPairs(form.dragOrderText);
      if (pairs.length === 0) return "Enter ordered items for drag and drop";
    }

    if (form.type === "TRUE_FALSE") {
      if (!form.correctAnswer) return "Select the correct answer";
    }

    return "";
  }

  async function saveQuestion(e) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const options = form.options.map((o) => o.trim()).filter(Boolean);
    let payload = {
      text: form.text,
      moduleId: form.moduleId,
      topicId: form.topicId,
      subject: form.module,
      topic: form.topic,
      difficulty: form.difficulty,
      type: form.type,
      marks: Number(form.marks || 1),
      options,
      imageUrl: form.imageUrl,
      audioUrl: form.audioUrl,
      explanation: form.explanation
    };

    if (form.type === "MCQ") {
      payload = { ...payload, correctAnswer: form.correctAnswer };
    }

    if (form.type === "MSQ") {
      payload = { ...payload, correctAnswer: form.msqCorrect };
    }

    if (form.type === "FILL_BLANK") {
      payload = { ...payload, correctAnswer: form.correctAnswer };
    }

    if (form.type === "INTEGER") {
      payload = { ...payload, correctAnswer: Number(form.correctAnswer) };
    }

    if (form.type === "MATCH") {
      const pairs = parsePairs(form.pairText);
      const correctAnswer = pairs.reduce((acc, p) => {
        acc[p.left] = p.right;
        return acc;
      }, {});
      payload = { ...payload, pairs, correctAnswer };
    }

    if (form.type === "DRAG_DROP") {
      const pairs = buildDragDropPairs(form.dragOrderText);
      const correctAnswer = pairs.reduce((acc, p) => {
        acc[p.left] = p.right;
        return acc;
      }, {});
      payload = { ...payload, pairs, correctAnswer };
    }

    if (form.type === "TRUE_FALSE") {
      payload = { ...payload, options: ["True", "False"], correctAnswer: form.correctAnswer };
    }

    try {
      if (modalMode === "edit" && activeQuestion) {
        await apiClient.put(`/questions/${activeQuestion.id}`, payload, withAuth(token));
      } else {
        await apiClient.post("/questions", payload, withAuth(token));
      }
      closeModal();
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function removeQuestion(id) {
    if (!window.confirm("Delete this question?")) return;
    try {
      await apiClient.delete(`/questions/${id}`, withAuth(token));
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function handleSearch() {
    if (!search.trim()) {
      load();
      return;
    }
    try {
      const res = await apiClient.get(`/questions/search?keyword=${encodeURIComponent(search)}`, withAuth(token));
      setQuestions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function applyFilters() {
    try {
      if (!filters.moduleIds.length) {
        setError("Please select at least one module");
        return;
      }
      const selectedModuleNames = modules
        .filter((item) => filters.moduleIds.includes(item._id))
        .map((item) => item.name);
      const selectedTopicNames = filterTopics
        .filter((item) => filters.topicIds.includes(item._id))
        .map((item) => item.name);
      const res = await apiClient.post("/questions/filter", {
        modules: selectedModuleNames,
        topics: selectedTopicNames,
        difficulty: filters.difficulty ? [filters.difficulty] : [],
        type: filters.type || "",
        moduleIds: filters.moduleIds,
        topicIds: filters.topicIds
      }, withAuth(token));
      setQuestions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function resetFilters() {
    setFilters({ moduleIds: [], topicIds: [], difficulty: "", type: "" });
    setSearch("");
    load();
  }

  function collectValues(event) {
    return Array.from(event.target.selectedOptions).map((option) => option.value);
  }

  return (
    <AdminShell title="Question Bank">
      {error && <div className="error">{error}</div>}

      <div className="qb-controls card">
        <div className="qb-top-row">
          <div className="search-row">
            <input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="ghost" onClick={handleSearch}>Search</button>
          </div>
          <div className="row-actions">
            <button onClick={openAddModal}>Add Question</button>
          </div>
        </div>

        <div className="module-card-row">
          {modules.map((m) => (
            <Link
              key={m._id}
              className="module-card"
              to={`/admin/question-bank/module/${encodeURIComponent(m.name)}`}
            >
              <span>{m.name}</span>
            </Link>
          ))}
        </div>
        <p className="muted">Manage and organize questions by modules and topics. Selecting multiple modules allows you to build more comprehensive exams.</p>

        <div className="filter-controls">
          <div className="question-bank-filter-block">
            <div className="selection-toolbar">
              <button
                type="button"
                className="ghost"
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  moduleIds: prev.moduleIds.length === modules.length ? [] : modules.map((item) => item._id),
                  topicIds: []
                }))}
              >
                {filters.moduleIds.length === modules.length ? "Clear Modules" : "Select All Modules"}
              </button>
              {!!filters.moduleIds.length && (
                <div className="selection-chips">
                  {modules
                    .filter((item) => filters.moduleIds.includes(item._id))
                    .map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        className="selection-chip"
                        onClick={() => setFilters((prev) => ({
                          ...prev,
                          moduleIds: prev.moduleIds.filter((id) => id !== item._id),
                          topicIds: []
                        }))}
                      >
                        {item.name} ×
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="row-actions">
              <div>
                <label>Modules</label>
                <select
                  className="multi-select"
                  multiple
                  size={Math.min(Math.max(modules.length, 3), 6)}
                  value={filters.moduleIds}
                  onChange={(e) => setFilters((prev) => ({
                    ...prev,
                    moduleIds: collectValues(e),
                    topicIds: []
                  }))}
                >
                  {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label>Topics</label>
                <select
                  className="multi-select"
                  multiple
                  size={Math.min(Math.max(filterTopics.length, 3), 6)}
                  value={filters.topicIds}
                  onChange={(e) => setFilters((prev) => ({ ...prev, topicIds: collectValues(e) }))}
                >
                  {filterTopics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
            <option value="">All Difficulty</option>
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="ghost" onClick={applyFilters}>Apply Filters</button>
          <button className="ghost" onClick={resetFilters}>Reset</button>
          <span className="pill-count">{filteredQuestions.length} questions</span>
        </div>
      </div>

      <QuestionTable
        questions={filteredQuestions}
        onEdit={openEditModal}
        onDelete={removeQuestion}
        onPreview={openPreviewModal}
        onDuplicate={duplicateQuestion}
      />

      {modalMode && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === "preview" ? "Question Preview" : modalMode === "edit" ? "Edit Question" : "Add Question"}</h3>
              <button className="ghost" onClick={closeModal}>Close</button>
            </div>

            {modalMode === "preview" && activeQuestion && (
              <div className="modal-body">
                <h4>{activeQuestion.text}</h4>
                <p className="muted">{activeQuestion.subject} | {activeQuestion.topic} | {activeQuestion.difficulty}</p>
                {activeQuestion.imageUrl && (
                  <div className="media-block">
                    <img src={activeQuestion.imageUrl} alt="Question visual" />
                  </div>
                )}
                {activeQuestion.audioUrl && (
                  <div className="media-block">
                    <audio controls src={activeQuestion.audioUrl} />
                  </div>
                )}
                {Array.isArray(activeQuestion.options) && activeQuestion.options.length > 0 && (
                  <ul className="preview-options">
                    {activeQuestion.options.map((o) => <li key={o}>{o}</li>)}
                  </ul>
                )}
                {activeQuestion.pairs && (
                  <div className="preview-pairs">
                    {(activeQuestion.pairs || []).map((p) => (
                      <div key={`${p.left}-${p.right}`}>{p.left} → {p.right}</div>
                    ))}
                  </div>
                )}
                {activeQuestion.correctAnswer && (
                  <p><strong>Correct:</strong> {Array.isArray(activeQuestion.correctAnswer) ? activeQuestion.correctAnswer.join(", ") : String(activeQuestion.correctAnswer)}</p>
                )}
              </div>
            )}

            {(modalMode === "add" || modalMode === "edit") && (
              <form className="modal-body" onSubmit={saveQuestion}>
                <div className="form-step">
                  <h4>Step 1: Basic Details</h4>
                  <label>Question Text</label>
                  <textarea
                    placeholder="Example: What is the capital of India?"
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                  />
                  <label>Image URL (optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  />
                  <label>Audio URL (optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={form.audioUrl}
                    onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
                  />
                  <label>Explanation (optional)</label>
                  <textarea
                    placeholder="Optional explanation shown in review"
                    value={form.explanation}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  />

                  <div className="row-actions">
                    <div>
                      <label>Module</label>
                      <select
                        value={form.moduleId}
                        onChange={(e) => {
                          const nextModule = modules.find((m) => m._id === e.target.value);
                          setForm({
                            ...form,
                            moduleId: nextModule?._id || "",
                            module: nextModule?.name || "",
                            topicId: "",
                            topic: ""
                          });
                        }}
                      >
                        <option value="">Select module</option>
                        {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Topic</label>
                      <select
                        value={form.topicId}
                        onChange={(e) => {
                          const nextTopic = formTopics.find((t) => t._id === e.target.value);
                          setForm({
                            ...form,
                            topicId: nextTopic?._id || "",
                            topic: nextTopic?.name || ""
                          });
                        }}
                      >
                        <option value="">Select topic</option>
                        {formTopics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="row-actions">
                    <div>
                      <label>Difficulty</label>
                      <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                        {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Marks</label>
                      <input type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="form-step">
                  <h4>Step 2: Question Type</h4>
                  <div className="type-grid">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`type-pill ${form.type === t.value ? "active" : ""}`}
                        onClick={() => setForm({ ...form, type: t.value, correctAnswer: "", msqCorrect: [], pairText: "", dragOrderText: "" })}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="hint">{TYPE_HELP[form.type]}</p>
                </div>

                <div className="form-step">
                  <h4>Step 3: Answers</h4>

                {(form.type === "MCQ" || form.type === "MSQ") && (
                  <>
                    <label>Options</label>
                    {form.options.map((o, idx) => (
                      <input
                        key={idx}
                        placeholder={`Option ${idx + 1}`}
                        value={o}
                        onChange={(e) => updateOption(idx, e.target.value)}
                      />
                    ))}
                    <button type="button" className="ghost" onClick={addOption}>Add Option</button>
                  </>
                )}

                {form.type === "MCQ" && (
                  <>
                    <label>Correct Answer</label>
                    <select value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
                      <option value="">Select correct option</option>
                      {form.options.filter(Boolean).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </>
                )}

                {form.type === "MSQ" && (
                  <>
                    <label>Correct Answers</label>
                    <div className="checkbox-list">
                      {form.options.map((o) => o.trim()).filter(Boolean).map((o) => (
                        <label key={o}>
                          <input
                            type="checkbox"
                            checked={form.msqCorrect.includes(o)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.msqCorrect, o]
                                : form.msqCorrect.filter((v) => v !== o);
                              setForm({ ...form, msqCorrect: next });
                            }}
                          />
                          {o}
                        </label>
                      ))}
                    </div>
                    {form.options.map((o) => o.trim()).filter(Boolean).length === 0 && (
                      <p className="muted">Add the answer options above, then select one or more correct answers here.</p>
                    )}
                  </>
                )}

                {form.type === "FILL_BLANK" && (
                  <>
                    <label>Correct Answer</label>
                    <input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} />
                  </>
                )}

                {form.type === "INTEGER" && (
                  <>
                    <label>Correct Integer Answer</label>
                    <input type="number" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} />
                  </>
                )}

                {form.type === "MATCH" && (
                  <>
                    <label>Pairs (Left|Right per line)</label>
                    <textarea value={form.pairText} onChange={(e) => setForm({ ...form, pairText: e.target.value })} />
                  </>
                )}

                {form.type === "DRAG_DROP" && (
                  <>
                    <label>Items in Correct Order (one per line)</label>
                    <textarea value={form.dragOrderText} onChange={(e) => setForm({ ...form, dragOrderText: e.target.value })} />
                  </>
                )}

                {form.type === "TRUE_FALSE" && (
                  <>
                    <label>Correct Answer</label>
                    <select value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
                      <option value="">Select</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  </>
                )}

                </div>
                <button type="submit">{modalMode === "edit" ? "Update Question" : "Save Question"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
