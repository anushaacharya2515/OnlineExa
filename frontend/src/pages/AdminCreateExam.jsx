import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiClient, withAuth } from "../apiClient";
import { useAuth } from "../context/AuthContext";
import { DIFFICULTY_OPTIONS } from "./questionBankData";
import QuestionSelectorModal from "../components/QuestionSelectorModal";
import Dropdowns from "../components/Dropdowns";
import Modal from "../components/Modal";

const PREFS_KEY = "admin_exam_preferences";

function SurfaceCard({ className = "", children }) {
  return <section className={`create-exam-section ${className}`.trim()}>{children}</section>;
}

function SectionHeader({ title, description }) {
  return (
    <div className="section-head">
      <h4>{title}</h4>
      {description && <p className="muted">{description}</p>}
    </div>
  );
}

function InputField({ label, className = "", children }) {
  return (
    <div className={`field-block ${className}`.trim()}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function AdminCreateExam() {
  const savedPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        negativeMarking: Boolean(parsed.negativeMarking),
        negativeMarkValue: Number(parsed.negativeMarkValue ?? 0.25)
      };
    } catch {
      return { negativeMarking: false, negativeMarkValue: 0.25 };
    }
  }, []);

  const { session } = useAuth();
  const token = session.token;
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [step, setStep] = useState(1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [mode, setMode] = useState("auto");
  const [examDraft, setExamDraft] = useState({
    examName: "",
    moduleIds: [],
    topicIds: [],
    durationMinutes: 30,
    startDate: "",
    endDate: "",
    marksPerQuestion: 1,
    randomizeQuestions: true,
    negativeMarking: savedPrefs.negativeMarking,
    negativeMarkValue: savedPrefs.negativeMarkValue,
    selectionRules: { counts: { Easy: 5, Medium: 3, Hard: 2 } }
  });

  const selectedModuleNames = useMemo(
    () => modules.filter((item) => examDraft.moduleIds.includes(item._id)).map((item) => item.name),
    [modules, examDraft.moduleIds]
  );

  const selectedTopicNames = useMemo(
    () => topics.filter((item) => examDraft.topicIds.includes(item._id)).map((item) => item.name),
    [topics, examDraft.topicIds]
  );

  const totalSelectedMarks = useMemo(
    () => previewQuestions.reduce((sum, q) => sum + (q.marks || 0), 0),
    [previewQuestions]
  );

  const totalSelectedQuestions = previewQuestions.length;
  const estimatedCount = mode === "auto"
    ? Number(examDraft.selectionRules.counts.Easy || 0)
      + Number(examDraft.selectionRules.counts.Medium || 0)
      + Number(examDraft.selectionRules.counts.Hard || 0)
    : selectedIds.length;
  const estimatedMarks = mode === "auto"
    ? estimatedCount * Number(examDraft.marksPerQuestion || 0)
    : totalSelectedMarks;
  const isReadyToCreate = Boolean(
    examDraft.examName.trim()
    && Number(examDraft.durationMinutes) > 0
    && examDraft.moduleIds.length
    && (mode === "auto" ? estimatedCount > 0 : selectedIds.length > 0)
  );

  useEffect(() => {
    if (mode === "manual" && selectedIds.length === 0) {
      setPreviewQuestions([]);
    }
  }, [mode, selectedIds]);

  function updateExamDraft(patch) {
    setIsSubmitted(false);
    setExamDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateSelectionCounts(level, value) {
    setIsSubmitted(false);
    setExamDraft((prev) => ({
      ...prev,
      selectionRules: {
        ...prev.selectionRules,
        counts: {
          ...prev.selectionRules.counts,
          [level]: Number(value)
        }
      }
    }));
  }

  useEffect(() => {
    setLoadingModules(true);
    apiClient
      .get("/modules", withAuth(token))
      .then((res) => setModules(res.data || []))
      .finally(() => setLoadingModules(false));
  }, []);

  useEffect(() => {
    if (!examDraft.moduleIds.length) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    apiClient
      .get("/topics", { ...withAuth(token), params: { moduleIds: examDraft.moduleIds.join(",") } })
      .then((res) => setTopics(res.data || []))
      .finally(() => setLoadingTopics(false));
  }, [examDraft.moduleIds]);

  async function handleGeneratePreview() {
    setError("");
    setIsSubmitted(false);
    if (!examDraft.moduleIds.length) {
      setError("Please select at least one module");
      return;
    }

    if (mode === "manual" && selectedIds.length === 0) {
      setError("Please select at least one question.");
      return;
    }

    setLoadingPreview(true);
    try {
      if (mode === "auto") {
        const payload = {
          name: examDraft.examName,
          duration: Number(examDraft.durationMinutes),
          moduleIds: examDraft.moduleIds,
          topicIds: examDraft.topicIds,
          marksPerQuestion: Number(examDraft.marksPerQuestion || 1),
          randomizeQuestions: examDraft.randomizeQuestions,
          easyCount: Number(examDraft.selectionRules.counts.Easy || 0),
          mediumCount: Number(examDraft.selectionRules.counts.Medium || 0),
          hardCount: Number(examDraft.selectionRules.counts.Hard || 0),
          negativeMarking: Boolean(examDraft.negativeMarking),
          negativeMarkValue: Number(examDraft.negativeMarkValue || 0.25),
          preview: true
        };
        const res = await apiClient.post("/exams/auto-generate", payload, withAuth(token));
        setPreviewQuestions(res.data.questions || []);
        return;
      }

      const res = await apiClient.get("/questions", {
        ...withAuth(token),
        params: { ids: selectedIds.join(",") }
      });
      setPreviewQuestions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function saveManualExam() {
    setError("");
    setIsSubmitted(false);
    try {
      if (!examDraft.examName.trim()) {
        setError("Exam name is required.");
        return;
      }
      if (!examDraft.durationMinutes || Number(examDraft.durationMinutes) <= 0) {
        setError("Duration must be greater than 0.");
        return;
      }
      if (!examDraft.moduleIds.length) {
        setError("Please select at least one module");
        return;
      }
      if (selectedIds.length === 0) {
        setError("Please select at least one question.");
        return;
      }
      const payload = {
        name: examDraft.examName,
        duration: Number(examDraft.durationMinutes),
        selectedQuestions: selectedIds,
        marksPerQuestion: Number(examDraft.marksPerQuestion || 1),
        randomizeQuestions: examDraft.randomizeQuestions,
        negativeMarking: Boolean(examDraft.negativeMarking),
        negativeMarkValue: Number(examDraft.negativeMarkValue || 0.25),
        startDate: examDraft.startDate || null,
        endDate: examDraft.endDate || null
      };
      await apiClient.post("/exams/manual", payload, withAuth(token));
      setSelectedIds([]);
      setPreviewQuestions([]);
      setExamDraft({
        examName: "",
        moduleIds: [],
        topicIds: [],
        durationMinutes: 30,
        startDate: "",
        endDate: "",
        marksPerQuestion: 1,
        randomizeQuestions: true,
        negativeMarking: savedPrefs.negativeMarking,
        negativeMarkValue: savedPrefs.negativeMarkValue,
        selectionRules: { counts: { Easy: 5, Medium: 3, Hard: 2 } }
      });
      setStep(1);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function createAutoExam() {
    setError("");
    setIsSubmitted(false);
    try {
      if (!examDraft.examName.trim()) {
        setError("Exam name is required.");
        return;
      }
      if (!examDraft.durationMinutes || Number(examDraft.durationMinutes) <= 0) {
        setError("Duration must be greater than 0.");
        return;
      }
      if (!examDraft.moduleIds.length) {
        setError("Please select at least one module");
        return;
      }
      const payload = {
        name: examDraft.examName,
        duration: Number(examDraft.durationMinutes),
        moduleIds: examDraft.moduleIds,
        topicIds: examDraft.topicIds,
        marksPerQuestion: Number(examDraft.marksPerQuestion || 1),
        randomizeQuestions: examDraft.randomizeQuestions,
        easyCount: Number(examDraft.selectionRules.counts.Easy || 0),
        mediumCount: Number(examDraft.selectionRules.counts.Medium || 0),
        hardCount: Number(examDraft.selectionRules.counts.Hard || 0),
        negativeMarking: Boolean(examDraft.negativeMarking),
        negativeMarkValue: Number(examDraft.negativeMarkValue || 0.25),
        startDate: examDraft.startDate || null,
        endDate: examDraft.endDate || null
      };
      await apiClient.post("/exams/auto-generate", payload, withAuth(token));
      setExamDraft({
        examName: "",
        moduleIds: [],
        topicIds: [],
        durationMinutes: 30,
        startDate: "",
        endDate: "",
        marksPerQuestion: 1,
        randomizeQuestions: true,
        negativeMarking: savedPrefs.negativeMarking,
        negativeMarkValue: savedPrefs.negativeMarkValue,
        selectionRules: { counts: { Easy: 5, Medium: 3, Hard: 2 } }
      });
      setPreviewQuestions([]);
      setSelectedIds([]);
      setStep(1);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function handleCreateExam() {
    if (mode === "auto") {
      await createAutoExam();
      return;
    }

    await saveManualExam();
  }

  async function loadSelectedQuestions(ids) {
    if (!ids.length) {
      setPreviewQuestions([]);
      return;
    }
    const res = await apiClient.get("/questions", {
      ...withAuth(token),
      params: { ids: ids.join(",") }
    });
    setPreviewQuestions(res.data || []);
  }

  function validateStep(targetStep) {
    if (targetStep <= 1) return true;
    if (!examDraft.examName.trim()) {
      setError("Please add exam name first.");
      return false;
    }
    if (!examDraft.durationMinutes || Number(examDraft.durationMinutes) <= 0) {
      setError("Duration must be greater than 0.");
      return false;
    }
    if (targetStep >= 3 && !examDraft.moduleIds.length) {
      setError("Please select at least one module.");
      return false;
    }
    return true;
  }

  function goToStep(next) {
    setError("");
    setIsSubmitted(false);
    if (!validateStep(next)) return;
    setStep(Math.max(1, Math.min(4, next)));
  }

  function openPreviewModal() {
    setError("");
    setShowPreviewModal(true);
  }

  async function handleViewQuestionPaper() {
    setError("");
    let qs = previewQuestions;

    // If no questions yet, generate them first
    if (!qs.length) {
      if (mode === "manual" && !selectedIds.length) {
        setError("Please select questions first.");
        return;
      }
      setLoadingPreview(true);
      try {
        if (mode === "auto") {
          const payload = {
            name: examDraft.examName,
            duration: Number(examDraft.durationMinutes),
            moduleIds: examDraft.moduleIds,
            topicIds: examDraft.topicIds,
            marksPerQuestion: Number(examDraft.marksPerQuestion || 1),
            randomizeQuestions: examDraft.randomizeQuestions,
            easyCount: Number(examDraft.selectionRules.counts.Easy || 0),
            mediumCount: Number(examDraft.selectionRules.counts.Medium || 0),
            hardCount: Number(examDraft.selectionRules.counts.Hard || 0),
            negativeMarking: Boolean(examDraft.negativeMarking),
            negativeMarkValue: Number(examDraft.negativeMarkValue || 0.25),
            preview: true
          };
          const res = await apiClient.post("/exams/auto-generate", payload, withAuth(token));
          qs = res.data.questions || [];
          setPreviewQuestions(qs);
        } else {
          const res = await apiClient.get("/questions", { ...withAuth(token), params: { ids: selectedIds.join(",") } });
          qs = res.data || [];
          setPreviewQuestions(qs);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoadingPreview(false);
        return;
      }
      setLoadingPreview(false);
    }

    if (!qs.length) { setError("No questions available to preview."); return; }
    openQuestionPaperWith(qs);
  }

  function openQuestionPaperWith(qs) {
    if (!qs.length) return;

    function esc(str) {
      return String(str || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const questionsHtml = qs.map((q, idx) => {
      const optsHtml = (q.options || []).map((o, i) =>
        `<div class="opt"><span class="opt-key">(${String.fromCharCode(97+i)})</span> ${esc(o)}</div>`
      ).join("");
      const passageHtml  = q.passage   ? `<div class="passage">${esc(q.passage)}</div>` : "";
      const assertHtml   = q.assertion ? `<div class="passage"><strong>Assertion:</strong> ${esc(q.assertion)}<br/><strong>Reason:</strong> ${esc(q.reason)}</div>` : "";
      const imgHtml      = q.imageUrl  ? `<img src="${esc(q.imageUrl)}" class="q-img" alt="Question image"/>` : "";
      const blankHtml    = ["NAT","INTEGER","FILL_BLANK"].includes(q.type) ? `<div class="blank">Answer: ___________________________</div>` : "";
      const optsWrap     = optsHtml ? `<div class="opts">${optsHtml}</div>` : "";
      return [
        `<div class="question">`,
        `<div class="q-row">`,
        `<span class="q-num">Q${idx+1}.</span>`,
        `<div class="q-body">`,
        `<div class="q-text">${esc(q.text)}</div>`,
        passageHtml, assertHtml, imgHtml, optsWrap, blankHtml,
        `</div>`,
        `<span class="q-marks">[${q.marks||1}M]</span>`,
        `</div></div>`
      ].join("");
    }).join("");

    const css = [
      "* { box-sizing:border-box; margin:0; padding:0; }",
      "body { font-family:'Times New Roman',Times,serif; background:#f0ebff; padding:24px; color:#111; }",
      ".paper { background:#fff; max-width:860px; margin:0 auto; padding:40px 48px; border-radius:12px; box-shadow:0 8px 32px rgba(111,76,255,.15); }",
      ".brand { text-align:center; font-family:sans-serif; font-size:11px; font-weight:800; color:#6f4cff; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px; }",
      "h1 { text-align:center; font-size:22px; font-weight:900; color:#1e1b4b; text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px; font-family:sans-serif; }",
      ".meta { display:flex; justify-content:center; gap:32px; font-size:13px; color:#333; margin-bottom:6px; font-family:sans-serif; flex-wrap:wrap; }",
      ".meta strong { color:#1e1b4b; }",
      ".instructions { margin:14px 0; background:#faf8ff; border:1px solid #e0d9f7; border-radius:8px; padding:10px 16px; font-size:12px; font-family:sans-serif; }",
      ".instructions strong { color:#4b3fa0; }",
      ".instructions ol { margin:6px 0 0 18px; }",
      ".instructions li { margin-bottom:3px; }",
      "hr { border:none; border-top:2px solid #1e1b4b; margin:16px 0 10px; }",
      ".question { margin-bottom:16px; page-break-inside:avoid; }",
      ".q-row { display:grid; grid-template-columns:30px 1fr 38px; gap:6px; align-items:start; }",
      ".q-num { font-weight:800; font-size:13px; color:#1e1b4b; padding-top:1px; }",
      ".q-body { display:flex; flex-direction:column; gap:6px; }",
      ".q-text { font-size:13.5px; line-height:1.6; }",
      ".passage { background:#f8f5ff; border-left:3px solid #9b6bff; padding:8px 12px; font-size:12px; border-radius:0 6px 6px 0; line-height:1.5; }",
      ".q-img { max-width:100%; max-height:200px; border-radius:6px; border:1px solid #e0d9f7; object-fit:contain; margin-top:4px; }",
      ".opts { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; margin-top:6px; }",
      ".opt { display:flex; gap:6px; font-size:13px; align-items:flex-start; }",
      ".opt-key { font-weight:700; color:#4b3fa0; flex-shrink:0; }",
      ".blank { font-size:12px; color:#555; border-bottom:1px solid #aaa; padding-bottom:2px; margin-top:6px; }",
      ".q-marks { font-size:11px; font-weight:700; color:#6f4cff; text-align:right; padding-top:2px; white-space:nowrap; font-family:sans-serif; }",
      ".footer { text-align:center; margin-top:28px; padding-top:14px; border-top:1px solid #e0d9f7; font-size:12px; color:#9b8ec4; font-family:sans-serif; }",
      ".print-btn { display:block; margin:0 auto 20px; padding:10px 28px; background:linear-gradient(135deg,#6f4cff,#9b6bff); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; font-family:sans-serif; }",
      "@media print { .print-btn { display:none; } body { background:#fff; padding:0; } .paper { box-shadow:none; border-radius:0; padding:20px 28px; } }"
    ].join("\n");

    const totalMarks = qs.reduce((s, q) => s + (q.marks || 1), 0);
    const body = [
      `<button class="print-btn" onclick="window.print()">&#128424; Print / Save as PDF</button>`,
      `<div class="paper">`,
      `<div class="brand">Elogixa Assess</div>`,
      `<h1>${esc(examDraft.examName || "Examination")}</h1>`,
      `<div class="meta">`,
      `<span>Duration: <strong>${examDraft.durationMinutes} minutes</strong></span>`,
      `<span>Total Marks: <strong>${totalMarks}</strong></span>`,
      `<span>Total Questions: <strong>${qs.length}</strong></span>`,
      `</div>`,
      `<div class="instructions"><strong>General Instructions:</strong><ol>`,
      `<li>All questions are compulsory.</li>`,
      `<li>Each question carries marks as indicated.</li>`,
      `<li>Read each question carefully before answering.</li>`,
      `<li>No negative marking unless specified.</li>`,
      `</ol></div>`,
      `<hr/>`,
      questionsHtml,
      `<div class="footer">&#8212; End of Question Paper &#8212;</div>`,
      `</div>`
    ].join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(examDraft.examName || "Question Paper")}</title><style>${css}</style></head><body>${body}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href   = url;
    a.target = "_blank";
    a.rel    = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);  }

  function resetBuilder() {
    setError("");
    setIsSubmitted(false);
    setSelectedIds([]);
    setPreviewQuestions([]);
    setStep(1);
    setExamDraft({
      examName: "",
      moduleIds: [],
      topicIds: [],
      durationMinutes: 30,
      startDate: "",
      endDate: "",
      marksPerQuestion: 1,
      randomizeQuestions: true,
      negativeMarking: savedPrefs.negativeMarking,
      negativeMarkValue: savedPrefs.negativeMarkValue,
      selectionRules: { counts: { Easy: 5, Medium: 3, Hard: 2 } }
    });
  }

  return (
    <AdminShell title="Create Exam">
      {error && <div className="error">{error}</div>}
      {isSubmitted && <div className="success">Exam created successfully.</div>}

      <div className="create-exam-container">
        <div className="create-exam-shell">
        <form
          id="create-exam-form"
          className="card admin-form create-exam-form"
          onSubmit={(e) => e.preventDefault()}
        >
          <SurfaceCard className="create-exam-header-card">
            <div className="create-exam-header">
              <div className="create-exam-header-text">
                <span className="eyebrow">Exam Builder</span>
                <h3>Create A Balanced Exam</h3>
                <p className="muted">Build exams step by step — set details, pick modules, configure questions, then review.</p>
              </div>
              <div className="mode-toggle mode-toggle-modern">
                <label className={`mode-pill ${mode === "auto" ? "active" : ""}`}>
                  <input type="radio" checked={mode === "auto"} onChange={() => { setIsSubmitted(false); setMode("auto"); }} />
                  ⚡ Auto Generate
                </label>
                <label className={`mode-pill ${mode === "manual" ? "active" : ""}`}>
                  <input type="radio" checked={mode === "manual"} onChange={() => { setIsSubmitted(false); setMode("manual"); }} />
                  ✏️ Manual Selection
                </label>
              </div>
            </div>
            <div className="create-stepper">
              {["Details", "Modules", "Settings", "Review"].map((label, idx) => {
                const n = idx + 1;
                return (
                  <div key={label} className="stepper-item">
                    {idx > 0 && <div className={`stepper-line ${step > idx ? "stepper-line--done" : ""}`} />}
                    <button
                      type="button"
                      className={`step-pill ${step === n ? "active" : ""} ${step > n ? "done" : ""}`}
                      onClick={() => goToStep(n)}
                    >
                      <span className="step-circle">{step > n ? "✓" : n}</span>
                      <span className="step-label">{label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          {step === 1 && (
          <SurfaceCard>
            <SectionHeader
              title="Exam Details"
              description="Define the exam name, duration, and availability window."
            />
            <div className="create-exam-grid">
              <InputField label="Exam Name" className="field-span-2">
                <input
                  placeholder="Example: Mixed Assessment - Round 1"
                  value={examDraft.examName}
                  onChange={(e) => updateExamDraft({ examName: e.target.value })}
                />
              </InputField>
              <InputField label="Duration (minutes)">
                <input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={examDraft.durationMinutes}
                  onChange={(e) => updateExamDraft({ durationMinutes: e.target.value })}
                />
              </InputField>
              <InputField label="Start Date">
                <input type="datetime-local" value={examDraft.startDate} onChange={(e) => updateExamDraft({ startDate: e.target.value })} />
              </InputField>
              <InputField label="End Date">
                <input type="datetime-local" value={examDraft.endDate} onChange={(e) => updateExamDraft({ endDate: e.target.value })} />
              </InputField>
              <div className="field-block field-span-2">
                <small className="muted">
                  Students get up to the configured duration, but the exam will auto-close at the selected end date if it comes first.
                </small>
              </div>
            </div>
          </SurfaceCard>
          )}

          {step === 2 && (
          <SurfaceCard>
            <SectionHeader
              title="Module & Topic Selection"
              description="Select one or more modules to create a diverse and balanced exam. You can optionally filter by topics to refine your question set."
            />
            <Dropdowns
              modules={modules}
              topics={topics}
              moduleIds={examDraft.moduleIds}
              topicIds={examDraft.topicIds}
              loadingModules={loadingModules}
              loadingTopics={loadingTopics}
              onModulesChange={(values) => updateExamDraft({ moduleIds: values, topicIds: [] })}
              onTopicsChange={(values) => updateExamDraft({ topicIds: values })}
            />
          </SurfaceCard>
          )}

          {step === 3 && (
          <SurfaceCard>
            <SectionHeader
              title="Question Configuration"
              description="Tune the difficulty mix, marks, and how questions should be assembled."
            />
            <div className="create-exam-grid config-grid">
              <InputField label="Marks Per Question">
                <input
                  type="number"
                  min="1"
                  value={examDraft.marksPerQuestion}
                  onChange={(e) => updateExamDraft({ marksPerQuestion: e.target.value })}
                />
              </InputField>
              <div className="field-block">
                <label>Randomization</label>
                <button
                  type="button"
                  className={`toggle-chip ${examDraft.randomizeQuestions ? "active" : ""}`}
                  onClick={() => updateExamDraft({ randomizeQuestions: !examDraft.randomizeQuestions })}
                >
                  {examDraft.randomizeQuestions ? "Randomize Question Order" : "Keep Current Order"}
                </button>
              </div>
              <div className="field-block">
                <label>Negative Marking</label>
                <button
                  type="button"
                  className={`toggle-chip ${examDraft.negativeMarking ? "active" : ""}`}
                  onClick={() => updateExamDraft({ negativeMarking: !examDraft.negativeMarking })}
                >
                  {examDraft.negativeMarking ? "Enabled" : "Disabled"}
                </button>
              </div>
              <InputField label="Negative Mark Value">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={examDraft.negativeMarkValue}
                  onChange={(e) => updateExamDraft({ negativeMarkValue: e.target.value })}
                  disabled={!examDraft.negativeMarking}
                />
              </InputField>
              <div className="field-block field-span-2">
                <label>Question Count By Difficulty</label>
                {mode === "auto" ? (
                  <div className="count-grid difficulty-grid">
                {DIFFICULTY_OPTIONS.map((level) => (
                  <div key={level} className={`count-field difficulty-card difficulty-${level.toLowerCase()}`}>
                    <label>
                      <span className="difficulty-dot" />
                      {level}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={examDraft.selectionRules.counts[level] ?? 0}
                      onChange={(e) => updateSelectionCounts(level, e.target.value)}
                    />
                  </div>
                ))}
                  </div>
                ) : (
                  <div className="selection-empty">
                    Manual mode lets the admin choose the exact questions instead of using difficulty counts.
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
          )}

          {step === 4 && (
          <SurfaceCard>
            <SectionHeader
              title="Review & Create"
              description="Check your exam summary, then view the question paper or create the exam."
            />
            <div className="review-grid">
              <div className="review-item"><span>Name</span><strong>{examDraft.examName || "-"}</strong></div>
              <div className="review-item"><span>Duration</span><strong>{examDraft.durationMinutes || "-"} min</strong></div>
              <div className="review-item"><span>Modules</span><strong>{selectedModuleNames.length || 0}</strong></div>
              <div className="review-item"><span>Topics</span><strong>{selectedTopicNames.length || 0}</strong></div>
              <div className="review-item"><span>Mode</span><strong>{mode === "auto" ? "Auto Generate" : "Manual Selection"}</strong></div>
              <div className="review-item"><span>Negative Marking</span><strong>{examDraft.negativeMarking ? `Yes (${examDraft.negativeMarkValue})` : "No"}</strong></div>
              <div className="review-item"><span>Estimated</span><strong>{estimatedCount} Q / {estimatedMarks} Marks</strong></div>
            </div>

            <div className="create-exam-actions">
              {mode === "manual" && (
                <button type="button" className="ghost action-button" onClick={() => setShowSelector(true)}>
                  Select Questions
                </button>
              )}
              <button
                type="button"
                className="action-button"
                onClick={handleViewQuestionPaper}
                disabled={loadingPreview}
              >
                {loadingPreview ? "Generating..." : "📄 View Question Paper"}
              </button>
              {mode === "manual" && (
                <div className="action-summary">
                  <strong>{selectedIds.length}</strong><span>Selected</span>
                  <strong>{totalSelectedMarks}</strong><span>Marks</span>
                </div>
              )}
            </div>
          </SurfaceCard>
          )}
                  

          <div className="create-exam-nav">
            <button type="button" className="ghost action-button" onClick={() => goToStep(step - 1)} disabled={step === 1}>
              Back
            </button>
            <div className="create-exam-nav-right">
              <span className="muted">Review all details before final submission in the last step.</span>
              <button type="button" className="ghost action-button" onClick={resetBuilder}>Reset</button>
              {step < 4 ? (
                <button type="button" className="action-button" onClick={() => goToStep(step + 1)}>Next</button>
              ) : (
                <button type="button" className="submit-btn create-exam-submit" onClick={handleCreateExam} disabled={!isReadyToCreate}>Create Exam</button>
              )}
            </div>
          </div>
        </form>
        </div>

        {/* Summary bar — pinned at bottom inside container */}
        <div className="create-summary-bar">
          <div className="csb-stat"><b>{estimatedCount}</b><span>Questions</span></div>
          <div className="csb-sep" />
          <div className="csb-stat"><b>{examDraft.durationMinutes || 0}</b><span>Minutes</span></div>
          <div className="csb-sep" />
          <div className="csb-stat"><b>{mode === "auto" ? "Auto" : "Manual"}</b><span>Mode</span></div>
          <div className="csb-sep" />
          <div className="csb-stat">
            <b style={{ color: isReadyToCreate ? "#22c55e" : "#f59e0b" }}>
              {isReadyToCreate ? "✓ Ready" : "Incomplete"}
            </b>
            <span>Status</span>
          </div>
          <div className="csb-actions">
            <button type="button" className="csb-btn-ghost" onClick={openPreviewModal} disabled={!previewQuestions.length}>
              Preview
            </button>
            <button type="button" className="csb-btn-primary" onClick={handleCreateExam} disabled={!isReadyToCreate}>
              Create Exam
            </button>
          </div>
        </div>
      </div>

      <QuestionSelectorModal
        open={showSelector}
        token={token}
        moduleIds={examDraft.moduleIds}
        topicIds={examDraft.topicIds}
        selectedIds={selectedIds}
        onClose={() => setShowSelector(false)}
        onConfirm={(ids) => {
          setSelectedIds(ids);
          setShowSelector(false);
          loadSelectedQuestions(ids);
        }}
      />
      <Modal open={showPreviewModal} title="Exam Preview" onClose={() => setShowPreviewModal(false)}>
        {!previewQuestions.length && (
          <div className="selection-empty">No preview questions available yet. Generate preview first.</div>
        )}
        {!!previewQuestions.length && (
          <div className="compact-list preview-question-list">
            {previewQuestions.map((q) => (
              <div key={q.id} className="compact-item">
                <div className="compact-item-title">{q.text}</div>
                <div className="compact-item-meta">
                  <span>{q.subject || "General"}</span>
                  <span>{q.topic || "Topic"}</span>
                  <span>{q.difficulty || "Level"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
