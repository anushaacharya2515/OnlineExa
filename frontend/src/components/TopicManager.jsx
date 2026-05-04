import { useEffect, useMemo, useState } from "react";
import { apiClient, withAuth } from "../apiClient";

export default function TopicManager({ token, moduleId }) {
  const [topics, setTopics] = useState([]);
  const [topicName, setTopicName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!moduleId) {
      setTopics([]);
      return;
    }

    const res = await apiClient.get("/topics", { ...withAuth(token), params: { moduleId } });
    setTopics(res.data || []);
  }

  useEffect(() => {
    load();
  }, [moduleId]);

  const lowerTopics = useMemo(
    () => topics.map((t) => t.name.trim().toLowerCase()),
    [topics]
  );

  async function addTopic(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    const name = topicName.trim();
    if (!moduleId) return setError("Select a module first");
    if (!name) return setError("Topic name is required");
    if (lowerTopics.includes(name.toLowerCase())) {
      return setError("Topic already exists");
    }

    setLoading(true);
    try {
      await apiClient.post("/topics", { name, moduleId }, withAuth(token));
      setTopicName("");
      setMessage("Topic added");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeTopic(id) {
    await apiClient.delete(`/topics/${id}`, withAuth(token));
    await load();
  }

  return (
    <div className="topic-manager">
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <form className="topic-add" onSubmit={addTopic}>
        <input
          placeholder="Add a new topic"
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
        />
        <button type="submit" disabled={loading}>Add Topic</button>
      </form>

      <div className="topic-list">
        {topics.length === 0 && <div className="muted">No topics yet.</div>}
        {topics.map((t) => (
          <div key={t._id} className="topic-item">
            <div className="topic-row">
              <strong>{t.name}</strong>
              <div className="topic-actions">
                <button type="button" className="ghost" onClick={() => removeTopic(t._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
