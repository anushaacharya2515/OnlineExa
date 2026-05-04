export default function Dropdowns({
  modules,
  topics,
  moduleIds,
  topicIds,
  onModulesChange,
  onTopicsChange,
  loadingModules,
  loadingTopics
}) {
  const allModuleIds = modules.map((item) => item._id);
  const allTopicsSelected = topics.length > 0 && (topicIds || []).length === topics.length;
  const topicGroups = modules
    .filter((module) => (moduleIds || []).includes(module._id))
    .map((module) => ({
      ...module,
      topics: topics.filter((topic) => topic.moduleId === module._id)
    }));

  function toggleModule(id) {
    const next = moduleIds.includes(id)
      ? moduleIds.filter((item) => item !== id)
      : [...moduleIds, id];
    onModulesChange(next);
  }

  function toggleTopic(id) {
    const next = topicIds.includes(id)
      ? topicIds.filter((item) => item !== id)
      : [...topicIds, id];
    onTopicsChange(next);
  }

  return (
    <div className="module-selection-block">
      <div className="selection-panel">
        <div className="selection-panel-head">
          <div>
            <label>Modules</label>
            <p className="muted">Pick one or more modules to build a blended exam.</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => onModulesChange(moduleIds?.length === modules.length ? [] : allModuleIds)}
          >
            {moduleIds?.length === modules.length ? "Clear Modules" : "Select All Modules"}
          </button>
        </div>
        <div className="chip-grid">
          {loadingModules && <span className="muted">Loading modules...</span>}
          {!loadingModules && modules.map((module) => (
            <button
              key={module._id}
              type="button"
              className={`selection-chip module-chip ${moduleIds.includes(module._id) ? "active" : ""}`}
              onClick={() => toggleModule(module._id)}
            >
              {module.name}
            </button>
          ))}
        </div>
        {!!moduleIds?.length && (
          <div className="selection-chips">
            {modules
              .filter((item) => moduleIds.includes(item._id))
              .map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="selection-chip selected-chip"
                  onClick={() => onModulesChange(moduleIds.filter((id) => id !== item._id))}
                >
                  {item.name} x
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="selection-panel">
        <div className="selection-panel-head">
          <div>
            <label>Topics</label>
            <p className="muted">Topics are dynamically filtered based on selected modules.</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => onTopicsChange(allTopicsSelected ? [] : topics.map((item) => item._id))}
            disabled={!topics.length}
          >
            {allTopicsSelected ? "Clear Topics" : "Select All Topics"}
          </button>
        </div>
        {loadingTopics && <span className="muted">Loading topics...</span>}
        {!loadingTopics && !moduleIds.length && (
          <div className="selection-empty">Select modules first to reveal topic filters.</div>
        )}
        {!loadingTopics && !!moduleIds.length && topicGroups.map((group) => (
          <div key={group._id} className="topic-group">
            <div className="topic-group-title">{group.name}</div>
            <div className="topic-chip-row">
              {group.topics.length === 0 && <span className="muted">No topics found for this module.</span>}
              {group.topics.map((topic) => (
                <button
                  key={topic._id}
                  type="button"
                  className={`selection-chip topic-chip ${topicIds.includes(topic._id) ? "active" : ""}`}
                  onClick={() => toggleTopic(topic._id)}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!!topicIds?.length && (
          <div className="selection-chips">
            {topics
              .filter((item) => topicIds.includes(item._id))
              .map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="selection-chip selected-chip topic-selected-chip"
                  onClick={() => onTopicsChange(topicIds.filter((id) => id !== item._id))}
                >
                  {item.name} x
                </button>
              ))}
          </div>
        )}
        </div>
    </div>
  );
}
