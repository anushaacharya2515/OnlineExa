import AdminShell from "../components/AdminShell";
import { useState } from "react";

const STORAGE_KEY = "admin_exam_preferences";

export default function AdminSettings() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        negativeMarking: Boolean(parsed.negativeMarking),
        negativeMarkValue: Number(parsed.negativeMarkValue ?? 0.25)
      };
    } catch {
      return { negativeMarking: false, negativeMarkValue: 0.25 };
    }
  });
  const [saved, setSaved] = useState(false);

  function update(patch) {
    setSaved(false);
    setPrefs((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    const next = {
      negativeMarking: Boolean(prefs.negativeMarking),
      negativeMarkValue: Number(prefs.negativeMarkValue || 0.25)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
  }

  return (
    <AdminShell title="Settings">
      <div className="card">
        <h3>Settings</h3>
        <p className="muted">Configure default exam preferences here.</p>

        <div className="field-block" style={{ marginTop: 12 }}>
          <label>Negative Marking</label>
          <button
            type="button"
            className={`toggle-chip ${prefs.negativeMarking ? "active" : ""}`}
            onClick={() => update({ negativeMarking: !prefs.negativeMarking })}
          >
            {prefs.negativeMarking ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="field-block" style={{ marginTop: 12 }}>
          <label>Negative Mark Value (per wrong answer)</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={prefs.negativeMarkValue}
            onChange={(e) => update({ negativeMarkValue: e.target.value })}
            disabled={!prefs.negativeMarking}
          />
          <small className="muted">Example: 0.25 means -0.25 × question marks on wrong attempted answers.</small>
        </div>

        <div className="create-exam-actions" style={{ marginTop: 12 }}>
          <button type="button" className="action-button" onClick={handleSave}>
            Save Settings
          </button>
          {saved && <span className="muted">Saved.</span>}
        </div>
      </div>
    </AdminShell>
  );
}
