import { useEffect, useMemo, useState } from "react";
import { apiClient, withAuth } from "../apiClient";
import { DIFFICULTY_OPTIONS } from "../pages/questionBankData";

export default function QuestionSelectorModal({
  open,
  token,
  moduleIds,
  topicIds,
  selectedIds,
  onClose,
  onConfirm
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filters, setFilters] = useState({
    moduleIds: [],
    topicIds: [],
    difficulty: "",
    type: ""
  });

  function collectValues(event) {
    return Array.from(event.target.selectedOptions).map((option) => option.value);
  }

  useEffect(() => {
    if (!open) return;
    apiClient.get("/modules", withAuth(token)).then((res) => setModules(res.data || []));
  }, [open, token]);

  useEffect(() => {
    if (!filters.moduleIds.length) {
      setTopics([]);
      return;
    }
    apiClient
      .get("/topics", { ...withAuth(token), params: { moduleIds: filters.moduleIds.join(",") } })
      .then((res) => setTopics(res.data || []));
  }, [filters.moduleIds, token]);

  useEffect(() => {
    if (!open) return;
    if (!filters.moduleIds.length) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const selectedModuleNames = modules
      .filter((item) => filters.moduleIds.includes(item._id))
      .map((item) => item.name);
    const selectedTopicNames = topics
      .filter((item) => filters.topicIds.includes(item._id))
      .map((item) => item.name);
    apiClient
      .post("/questions/filter", {
        modules: selectedModuleNames,
        topics: selectedTopicNames,
        difficulty: filters.difficulty ? [filters.difficulty] : [],
        type: filters.type || "",
        moduleIds: filters.moduleIds,
        topicIds: filters.topicIds
      }, withAuth(token))
      .then((res) => setQuestions(res.data || []))
      .finally(() => setLoading(false));
  }, [open, token, filters, modules, topics]);

  const [localSelected, setLocalSelected] = useState([]);

  useEffect(() => {
    setLocalSelected(selectedIds || []);
    if (open) {
      setFilters((prev) => ({
        ...prev,
        moduleIds: moduleIds || [],
        topicIds: topicIds || []
      }));
    }
  }, [selectedIds, open, moduleIds, topicIds]);

  const totalMarks = useMemo(() => {
    return questions
      .filter((q) => localSelected.includes(q.id))
      .reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [questions, localSelected]);

  const groupedQuestions = useMemo(() => {
    return questions.reduce((acc, question) => {
      const key = question.subject || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(question);
      return acc;
    }, {});
  }, [questions]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3>Select Questions</h3>
            <p className="muted">Choose questions to add to this exam.</p>
          </div>
          <button className="ghost" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="row-actions">
            <div>
              <label>Modules</label>
              <select
                className="multi-select"
                multiple
                size={Math.min(Math.max(modules.length, 3), 6)}
                value={filters.moduleIds}
                onChange={(e) => setFilters({ ...filters, moduleIds: collectValues(e), topicIds: [] })}
              >
                {modules.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Topics</label>
              <select
                className="multi-select"
                multiple
                size={Math.min(Math.max(topics.length, 3), 6)}
                value={filters.topicIds}
                onChange={(e) => setFilters({ ...filters, topicIds: collectValues(e) })}
              >
                {topics.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="muted">Select one or more modules. Leave topics empty to browse all questions from those modules.</p>

          <div className="row-actions">
            <div>
              <label>Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              >
                <option value="">All</option>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All</option>
                <option value="MCQ">MCQ</option>
                <option value="MSQ">MSQ</option>
                <option value="NAT">NAT</option>
                <option value="INTEGER_RANGE">INTEGER_RANGE</option>
                <option value="MATCH">MATCH</option>
                <option value="DRAG_DROP">DRAG_DROP</option>
                <option value="TRUE_FALSE">TRUE_FALSE</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Question</th>
                  <th>Module</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="6" className="empty-cell">Loading...</td>
                  </tr>
                )}
                {!loading && !filters.moduleIds.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">Please select at least one module.</td>
                  </tr>
                )}
                {!loading && !!filters.moduleIds.length && questions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-cell">No questions found.</td>
                  </tr>
                )}
                {!loading && Object.entries(groupedQuestions).flatMap(([moduleName, moduleQuestions]) => (
                  [
                    <tr key={`group-${moduleName}`} className="group-row">
                      <td colSpan="6"><strong>{moduleName}</strong></td>
                    </tr>,
                    ...moduleQuestions.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={localSelected.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setLocalSelected([...localSelected, q.id]);
                              } else {
                                setLocalSelected(localSelected.filter((id) => id !== q.id));
                              }
                            }}
                          />
                        </td>
                        <td>{q.text}</td>
                        <td>{q.subject}</td>
                        <td>{q.topic}</td>
                        <td>{q.difficulty}</td>
                        <td>{q.marks}</td>
                      </tr>
                    ))
                  ]
                ))}
              </tbody>
            </table>
          </div>

          <div className="row-actions" style={{ justifyContent: "space-between" }}>
            <div className="muted">Selected: {localSelected.length} | Marks: {totalMarks}</div>
            <button type="button" onClick={() => onConfirm(localSelected)}>
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
