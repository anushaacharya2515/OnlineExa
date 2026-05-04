import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import TopicManager from "../components/TopicManager";

export default function ManageModules() {
  const { session } = useAuth();
  const token = session.token;

  const [modules,        setModules]        = useState([]);
  const [allTopics,      setAllTopics]      = useState([]);
  const [moduleName,     setModuleName]     = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState("");
  const [error,    setError]    = useState("");

  async function loadModules() {
    const res = await apiClient.get("/modules", withAuth(token));
    setModules(res.data || []);
  }
  async function loadAllTopics() {
    const res = await apiClient.get("/topics", withAuth(token));
    setAllTopics(res.data || []);
  }

  useEffect(() => { loadModules(); loadAllTopics(); }, []);

  async function addModule(e) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!moduleName.trim()) return setError("Module name is required");
    setLoading(true);
    try {
      await apiClient.post("/modules", { name: moduleName }, withAuth(token));
      setModuleName("");
      setMessage("Module added successfully.");
      loadModules(); loadAllTopics();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setLoading(false); }
  }

  async function removeModule(id) {
    if (!window.confirm("Delete this module and all its topics?")) return;
    await apiClient.delete(`/modules/${id}`, withAuth(token));
    loadModules(); loadAllTopics();
  }

  const topicMap = useMemo(() => {
    const map = {};
    allTopics.forEach(t => {
      if (!map[t.moduleId]) map[t.moduleId] = [];
      map[t.moduleId].push(t);
    });
    return map;
  }, [allTopics]);

  return (
    <AdminShell title="Modules & Topics">
      <div className="mm-shell">

        {/* ── Left column ── */}
        <div className="mm-col">

          {/* Add Module card */}
          <div className="mm-card">
            <div className="mm-card-hd">
              <h3>Add Module</h3>
              <span className="mm-badge">{modules.length} modules</span>
            </div>
            {error   && <div className="mm-alert mm-alert--error">{error}</div>}
            {message && <div className="mm-alert mm-alert--success">{message}</div>}
            <form className="mm-add-form" onSubmit={addModule}>
              <input className="mm-input" value={moduleName}
                onChange={e => setModuleName(e.target.value)}
                placeholder="Enter module name…" />
              <button className="mm-btn-primary" type="submit" disabled={loading}>
                {loading ? "Adding…" : "+ Add"}
              </button>
            </form>
            <div className="mm-list">
              {modules.length === 0 && <div className="mm-empty">No modules yet.</div>}
              {modules.map(m => (
                <div key={m._id} className="mm-list-item">
                  <div className="mm-list-left">
                    <span className="mm-dot" />
                    <div>
                      <b>{m.name}</b>
                      <span className="mm-topic-count">
                        {(topicMap[m._id] || []).length} topic{(topicMap[m._id] || []).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <button className="mm-btn-danger" type="button" onClick={() => removeModule(m._id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Topic card */}
          <div className="mm-card">
            <div className="mm-card-hd"><h3>Add Topic</h3></div>
            <label className="mm-label">Select Module</label>
            <select className="mm-select" value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}>
              <option value="">— Choose a module —</option>
              {modules.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <button className="mm-btn-primary" type="button"
              disabled={!selectedModule} onClick={() => setShowTopicModal(true)}>
              + Manage Topics
            </button>
          </div>
        </div>

        {/* ── Right column — Hierarchy ── */}
        <div className="mm-col mm-col--wide">
          <div className="mm-card mm-card--fill">
            <div className="mm-card-hd">
              <h3>Module → Topic Hierarchy</h3>
              <span className="mm-badge">{allTopics.length} total topics</span>
            </div>
            <div className="mm-hierarchy">
              {modules.length === 0 && <div className="mm-empty">No modules yet.</div>}
              {modules.map(m => {
                const topics = topicMap[m._id] || [];
                return (
                  <div key={m._id} className="mm-module-row">
                    <div className="mm-module-hd">
                      <span className="mm-module-icon">📦</span>
                      <span className="mm-module-name">{m.name}</span>
                      <span className="mm-topic-pill">{topics.length} topics</span>
                    </div>
                    {topics.length > 0 && (
                      <div className="mm-topics-grid">
                        {topics.map(t => (
                          <span key={t._id} className="mm-topic-chip">{t.name}</span>
                        ))}
                      </div>
                    )}
                    {topics.length === 0 && (
                      <p className="mm-no-topics">No topics added yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showTopicModal} title="Manage Topics"
        onClose={() => { setShowTopicModal(false); loadAllTopics(); }}>
        <TopicManager token={token} moduleId={selectedModule} />
      </Modal>
    </AdminShell>
  );
}
