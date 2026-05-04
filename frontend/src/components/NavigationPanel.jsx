function hasAnswer(answer) {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string") return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "object") {
    const vals = Object.values(answer);
    return vals.length > 0 && vals.some(v => (Array.isArray(v) ? v.length > 0 : String(v || "").trim().length > 0));
  }
  return true;
}

export default function NavigationPanel({ questions, answers, reviewMap, currentIndex, onSelect, sections = [] }) {
  const answered   = questions.filter(q => hasAnswer(answers[q.id]) && !reviewMap[q.id]).length;
  const marked     = questions.filter(q => reviewMap[q.id]).length;
  const notVisited = questions.filter((q, i) => !hasAnswer(answers[q.id]) && !reviewMap[q.id] && i !== currentIndex).length;
  const notAnswered = questions.length - answered - marked - notVisited;

  const groups = sections.length > 0
    ? sections.map(sec => ({ label: sec.name, ids: new Set(sec.questionIds || []) }))
    : [{ label: null, ids: new Set(questions.map(q => q.id)) }];

  return (
    <div className="nav-panel">
      <div className="nav-panel-header">
        <span className="nav-panel-title">Question Navigator</span>
        <span className="nav-panel-count">{questions.length} Qs</span>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="nav-group">
          {group.label && <div className="nav-group-label">{group.label}</div>}
          <div className="nav-grid">
            {questions.map((q, idx) => {
              if (sections.length > 0 && !group.ids.has(q.id)) return null;
              const ans = hasAnswer(answers[q.id]);
              const rev = reviewMap[q.id];
              const isCurrent = idx === currentIndex;
              let cls = "nav-btn";
              if (isCurrent)  cls += " nav-btn--current";
              else if (rev)   cls += " nav-btn--review";
              else if (ans)   cls += " nav-btn--answered";
              else            cls += " nav-btn--unvisited";
              return (
                <button key={q.id} type="button" className={cls} onClick={() => onSelect(idx)}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
