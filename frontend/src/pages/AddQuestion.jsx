import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";

const TYPE_OPTIONS = [
  { label: "MCQ", value: "MCQ" },
  { label: "Multiple Select", value: "MSQ" },
  { label: "Fill in the Blank", value: "FILL_BLANK" },
  { label: "Integer Type", value: "INTEGER" },
  { label: "Logical Reasoning", value: "LOGICAL_REASONING" },
  { label: "Matching", value: "MATCH" },
  { label: "Drag and Drop", value: "DRAG_DROP" },
  { label: "True / False", value: "TRUE_FALSE" }
];

function parsePairs(text) {
  return text
    .split("\n")
    .map((line) => {
      const [left, right] = line.split("|");
      return { left: (left || "").trim(), right: (right || "").trim() };
    })
    .filter((p) => p.left && p.right);
}

export default function AddQuestion() {
  const { session } = useAuth();
  const token = session.token;
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    text: "",
    subject: "",
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
    if (!form.subject.trim()) return "Subject is required";
    if (!form.topic.trim()) return "Topic is required";

    if (form.type === "MCQ" || form.type === "LOGICAL_REASONING") {
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return "At least 2 options are required for MCQ";
      if (!form.correctAnswer) return "Correct answer is required";
      if (!options.includes(form.correctAnswer)) return "Correct answer must be one of the options";
    }

    if (form.type === "MSQ") {
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return "At least 2 options are required for Multiple Select";
      if (form.msqCorrect.length === 0) return "Select at least one correct option";
    }

    if (form.type === "FILL_BLANK") {
      if (!form.correctAnswer.trim()) return "Correct answer is required";
    }

    if (form.type === "INTEGER") {
      if (form.correctAnswer === "") return "Correct integer answer is required";
      if (!Number.isInteger(Number(form.correctAnswer))) return "Answer must be an integer";
    }

    if (form.type === "MATCH" || form.type === "DRAG_DROP") {
      const pairs = parsePairs(form.pairText);
      if (pairs.length === 0) return "Enter matching pairs using Left|Right per line";
    }

    if (form.type === "TRUE_FALSE") {
      if (!form.correctAnswer) return "Select the correct answer";
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    const options = form.options.map((o) => o.trim()).filter(Boolean);
    let payload = {
      text: form.text,
      subject: form.subject,
      topic: form.topic,
      difficulty: form.difficulty,
      type: form.type,
      marks: Number(form.marks || 1),
      options,
      imageUrl: form.imageUrl,
      audioUrl: form.audioUrl,
      explanation: form.explanation
    };

    if (form.type === "MCQ" || form.type === "LOGICAL_REASONING") {
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

    if (form.type === "MATCH" || form.type === "DRAG_DROP") {
      const pairs = parsePairs(form.pairText);
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
      await apiClient.post("/questions", payload, withAuth(token));
      navigate("/admin/question-bank");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <AdminShell title="Add Question">
      {error && <div className="error">{error}</div>}

      <form className="card admin-form" onSubmit={handleSubmit}>
        <label>Question Text</label>
        <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        <label>Image URL (optional)</label>
        <input type="text" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <label>Audio URL (optional)</label>
        <input type="text" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
        <label>Explanation (optional)</label>
        <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />

        <div className="row-actions">
          <div>
            <label>Subject</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label>Topic</label>
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
        </div>

        <div className="row-actions">
          <div>
            <label>Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label>Question Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, correctAnswer: "", msqCorrect: [], pairText: "", dragOrderText: "" })}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(form.type === "MCQ" || form.type === "MSQ" || form.type === "LOGICAL_REASONING") && (
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

        {(form.type === "MCQ" || form.type === "LOGICAL_REASONING") && (
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
              {form.options.filter(Boolean).map((o) => (
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

        {(form.type === "MATCH" || form.type === "DRAG_DROP") && (
          <>
            <label>Pairs (Left|Right per line)</label>
            <textarea value={form.pairText} onChange={(e) => setForm({ ...form, pairText: e.target.value })} />
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

        <label>Marks</label>
        <input type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
        <button type="submit">Save Question</button>
      </form>
    </AdminShell>
  );
}
