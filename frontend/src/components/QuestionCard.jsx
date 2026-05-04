export default function QuestionCard({ question, index, total, children }) {
  if (!question) {
    return <div className="empty-block">No questions loaded for this attempt.</div>;
  }

  return (
    <>
      <div className="question-head">
        <div className="question-pill">Question {index + 1} of {total}</div>
        <div className="question-type-tag">{question.type}</div>
      </div>
      <h2 className="question-title">{question.text}</h2>
      {children}
    </>
  );
}
