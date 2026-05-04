export default function ExamPreview({ questions, compact = false }) {
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  if (compact) {
    return (
      <div className="card compact-side-card">
        <div className="table-header compact-card-head">
          <div>
            <h3>Exam Preview</h3>
            <p className="muted">Review selected questions before saving.</p>
          </div>
          <div className="pill-count">
            {questions.length} Questions | {totalMarks} Marks
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="selection-empty">No questions selected yet.</div>
        ) : (
          <div className="compact-list">
            {questions.slice(0, 5).map((q) => (
              <div key={q.id} className="compact-item">
                <div className="compact-item-title">{q.text}</div>
                <div className="compact-item-meta">
                  <span>{q.subject}</span>
                  <span>{q.topic}</span>
                  <span>{q.difficulty}</span>
                  <span>{q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
            {questions.length > 5 && (
              <div className="muted compact-footnote">Showing 5 of {questions.length} selected questions.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-header">
        <div>
          <h3>Exam Preview</h3>
          <p className="muted">Review selected questions before saving.</p>
        </div>
        <div className="pill-count">
          {questions.length} Questions | {totalMarks} Marks
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Module</th>
              <th>Topic</th>
              <th>Difficulty</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-cell">No questions selected.</td>
              </tr>
            )}
            {questions.map((q) => (
              <tr key={q.id}>
                <td>{q.text}</td>
                <td>{q.subject}</td>
                <td>{q.topic}</td>
                <td>{q.difficulty}</td>
                <td>{q.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
