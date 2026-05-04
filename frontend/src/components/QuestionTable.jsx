export default function QuestionTable({ questions, onEdit, onDelete, onPreview, onDuplicate }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Question Text</th>
            <th>Module</th>
            <th>Topic</th>
            <th>Difficulty</th>
            <th>Question Type</th>
            <th>Marks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.length === 0 && (
            <tr>
              <td colSpan="8" className="empty-cell">No questions found.</td>
            </tr>
          )}
          {questions.map((q) => (
            <tr key={q.id}>
              <td className="mono">{q.id}</td>
              <td>{q.text || q.question_text}</td>
              <td>{q.subject}</td>
              <td>{q.topic}</td>
              <td>{q.difficulty}</td>
              <td>{q.type}</td>
              <td>{q.marks}</td>
              <td className="row-actions">
                <button className="ghost" onClick={() => onPreview(q)}>Preview</button>
                {onDuplicate && (
                  <button className="ghost" onClick={() => onDuplicate(q)}>Duplicate</button>
                )}
                <button className="ghost" onClick={() => onEdit(q)}>Edit</button>
                <button onClick={() => onDelete(q.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
