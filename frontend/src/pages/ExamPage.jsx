import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import Timer from "../components/Timer";
import NavigationPanel from "../components/NavigationPanel";
import Modal from "../components/Modal";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TAB_LIMIT = 3;

function hasAnswer(a) {
  if (a === null || a === undefined) return false;
  if (typeof a === "string") return a.trim().length > 0;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "object") { const v = Object.values(a); return v.length > 0 && v.some(x => Array.isArray(x) ? x.length > 0 : String(x||"").trim().length > 0); }
  return true;
}
function toNum(v) { if (v===""||v==null) return ""; const n=Number(v); return Number.isFinite(n)?n:""; }

function MatchBoard({ question, value, onChange }) {
  const lefts = question.pairs?.map(p=>p.left)||[];
  const rights = question.pairs?.map(p=>p.right)||[];
  const [sel, setSel] = useState(null);
  const rev = useMemo(()=>{ const m={}; Object.entries(value||{}).forEach(([l,r])=>{m[r]=l;}); return m; },[value]);
  return (
    <div className="match-board">
      <div className="match-col">
        <div className="match-col-title"><span>A</span> Column A</div>
        {lefts.map((l,i)=>(
          <button key={l} type="button" className={`match-card left ${sel===l?"is-selected":""}`} onClick={()=>setSel(l)}>
            <div className="match-label">Term {i+1}</div><div className="match-text">{l}</div>
            {value?.[l]&&<small className="match-meta" onClick={e=>{e.stopPropagation();const n={...value};delete n[l];onChange(n);}}>Linked: {value[l]} (clear)</small>}
          </button>
        ))}
      </div>
      <div className="match-middle" aria-hidden><span>{"<->"}</span></div>
      <div className="match-col">
        <div className="match-col-title"><span>B</span> Column B</div>
        {rights.map((r,i)=>(
          <button key={r} type="button" className={`match-card right ${rev[r]?"is-linked":""}`}
            onClick={()=>{ if(!sel)return; onChange({...(value||{}),[sel]:r}); setSel(null); }}>
            <div className="match-label">Def {String.fromCharCode(65+i)}</div><div className="match-text">{r}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DragDropBoard({ question, value, onChange }) {
  const lefts = question.pairs?.map(p=>p.left)||[];
  const rights = question.pairs?.map(p=>p.right)||[];
  const [drag, setDrag] = useState("");
  const boardRef = useRef(null);
  const lRefs = useRef({}); const rRefs = useRef({});
  const [lines, setLines] = useState([]);
  useEffect(()=>{
    function recalc(){
      const board=boardRef.current; if(!board)return;
      const br=board.getBoundingClientRect(); const nl=[];
      Object.entries(value||{}).forEach(([l,r])=>{
        const le=lRefs.current[l]; const re=rRefs.current[r]; if(!le||!re)return;
        const lb=le.getBoundingClientRect(); const rb=re.getBoundingClientRect();
        nl.push({x1:lb.right-br.left,y1:lb.top+lb.height/2-br.top,x2:rb.left-br.left,y2:rb.top+rb.height/2-br.top});
      });
      setLines(nl);
    }
    recalc(); window.addEventListener("resize",recalc); return()=>window.removeEventListener("resize",recalc);
  },[value,lefts,rights]);
  return (
    <div className="match-board drag-board" ref={boardRef}>
      <svg className="match-lines" width="100%" height="100%" aria-hidden>
        {lines.map((ln,i)=><path key={i} d={`M ${ln.x1} ${ln.y1} C ${ln.x1+80} ${ln.y1}, ${ln.x2-80} ${ln.y2}, ${ln.x2} ${ln.y2}`}/>)}
      </svg>
      <div className="match-col">
        <div className="match-col-title"><span>A</span> Drag Targets</div>
        {lefts.map((l,i)=>(
          <div key={l} className="match-card left" ref={el=>{lRefs.current[l]=el;}} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(!drag)return;onChange({...(value||{}),[l]:drag});setDrag("");}}>
            <div className="match-label">Item {i+1}</div><div className="match-text">{l}</div>
            {value?.[l]&&<small className="match-meta" onClick={()=>{const n={...value};delete n[l];onChange(n);}}>Dropped: {value[l]} (clear)</small>}
          </div>
        ))}
      </div>
      <div className="match-middle" aria-hidden><span>{"<->"}</span></div>
      <div className="match-col">
        <div className="match-col-title"><span>B</span> Draggable</div>
        {rights.map((r,i)=>(
          <div key={r} className="match-card right drag-source" ref={el=>{rRefs.current[r]=el;}} draggable onDragStart={()=>setDrag(r)}>
            <div className="match-label">Option {String.fromCharCode(65+i)}</div><div className="match-text">{r}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExamPage() {
  const { attemptId } = useParams();
  const { session } = useAuth();
  const token = session.token;
  const navigate = useNavigate();

  const [exam,       setExam]       = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [sections,   setSections]   = useState([]);
  const [answers,    setAnswers]    = useState({});
  const [reviewMap,  setReviewMap]  = useState({});
  const [remainingMs,setRemainingMs]= useState(0);
  const [error,      setError]      = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [tabCount,   setTabCount]   = useState(0);
  const [tabWarn,    setTabWarn]    = useState("");
  const [showTabWarn,setShowTabWarn]= useState(false);

  const submittedRef  = useRef(false);
  const tabCountRef   = useRef(0);
  const tabHandledRef = useRef(false);

  const currentQ   = questions[currentIndex];
  const answered   = questions.filter(q=>hasAnswer(answers[q.id])).length;
  const unanswered = Math.max(questions.length - answered, 0);
  const reviewed   = questions.filter(q=>reviewMap[q.id]).length;
  const isLastFive = remainingMs > 0 && remainingMs <= FIVE_MINUTES_MS;

  useEffect(()=>{
    api(`/student/attempts/${attemptId}`,{token}).then(d=>{
      setExam(d.exam); setQuestions(d.questions);
      setSections(d.sections||[]); setAnswers(d.attempt.answers||{}); setRemainingMs(d.remainingMs);
    }).catch(err=>setError(err.message));
  },[attemptId]);

  useEffect(()=>{
    if(remainingMs<=0||submittedRef.current)return;
    const t=setTimeout(()=>setRemainingMs(ms=>Math.max(0,ms-1000)),1000);
    return()=>clearTimeout(t);
  },[remainingMs]);

  useEffect(()=>{ if(remainingMs===0&&!submittedRef.current&&exam)doSubmit(true); },[remainingMs,exam]);
  useEffect(()=>{ if(currentIndex>questions.length-1&&questions.length>0)setCurrentIndex(questions.length-1); },[questions.length,currentIndex]);
  useEffect(()=>{ tabCountRef.current=tabCount; },[tabCount]);

  useEffect(()=>{
    if(!exam)return;
    function onVis(){
      if(document.visibilityState==="visible"){tabHandledRef.current=false;return;}
      if(submittedRef.current||tabHandledRef.current)return;
      tabHandledRef.current=true;
      const n=tabCountRef.current+1; tabCountRef.current=n; setTabCount(n);
      if(n<=TAB_LIMIT){
        const rem=TAB_LIMIT-n;
        setTabWarn(rem>0?`Warning ${n}/${TAB_LIMIT}: ${rem} more violation${rem===1?"":"s"} will auto-submit.`:"Final warning: one more tab switch will auto-submit.");
        setShowTabWarn(true);
      } else { setShowTabWarn(false); doSubmit(true); }
    }
    document.addEventListener("visibilitychange",onVis);
    return()=>document.removeEventListener("visibilitychange",onVis);
  },[exam]);

  async function saveAnswer(qId,ans){
    setAnswers(p=>({...p,[qId]:ans}));
    try{ await api(`/student/attempts/${attemptId}/answers`,{token,method:"PATCH",body:{answers:{[qId]:ans}}}); }
    catch(err){ setError(err.message); }
  }
  function toggleMsq(qId,opt,checked){
    const prev=Array.isArray(answers[qId])?answers[qId]:[];
    saveAnswer(qId,checked?[...new Set([...prev,opt])]:prev.filter(v=>v!==opt));
  }
  async function doSubmit(auto=false){
    if(submittedRef.current)return;
    submittedRef.current=true;
    try{
      await api(`/student/attempts/${attemptId}/answers`,{token,method:"PATCH",body:{answers}});
      await api(`/student/attempts/${attemptId}/submit`,{token,method:"POST"});
      if(auto)alert("Time is up. Exam auto-submitted.");
      navigate("/student/exams");
    }catch(err){ submittedRef.current=false; setError(err.message); }
  }
  function goNext(){
    if(currentIndex<questions.length-1)setCurrentIndex(p=>p+1);
    else setShowSubmit(true);
  }

  const initials=(session.user.name||session.user.email||"S").slice(0,1).toUpperCase();
  const rawStudentId = String(session.user.id || "");
  const displayStudentId = rawStudentId
    ? `STU-${rawStudentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`
    : "STU-NA";
  const profilePhotoUrl = session.user.profilePhotoUrl || "";

  return (
    <div className="ep2-shell">
      {/* Top bar */}
      <header className="ep2-topbar">
        <div className="ep2-topbar-left">
          <div className="ep2-topbar-info">
            <span className="ep2-exam-name">{exam?.title||exam?.examName||"Exam"}</span>
          </div>
        </div>
        <div className="ep2-topbar-right">
          {tabCount>0&&<span className="ep2-warn-chip">⚠ {tabCount}/{TAB_LIMIT}</span>}
        </div>
      </header>

      <div className="ep2-body">
        {/* Left */}
        <main className="ep2-left">
          {error&&<div className="ep2-error">{error}</div>}
          {isLastFive&&<div className="ep2-alert">⚠ Less than 5 minutes remaining!</div>}

          {/* Section tabs */}
          {sections.length>1&&(
            <div className="ep2-section-tabs">
              {sections.map((sec,si)=>{
                const firstIdx=questions.findIndex(q=>(sec.questionIds||[]).includes(q.id));
                const isActive=(sec.questionIds||[]).includes(currentQ?.id);
                const secAns=questions.filter(q=>(sec.questionIds||[]).includes(q.id)&&hasAnswer(answers[q.id])).length;
                return(
                  <button key={si} type="button" className={`ep2-sec-tab ${isActive?"ep2-sec-tab--active":""}`}
                    onClick={()=>firstIdx>=0&&setCurrentIndex(firstIdx)}>
                    {sec.name}<span className="ep2-sec-count">{secAns}/{(sec.questionIds||[]).length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Question card */}
          <div className="ep2-question-card">
            {!currentQ ? <div className="ep2-empty">No questions loaded.</div> : (<>
              <div className={`ep2-inline-timer ${isLastFive?"ep2-timer--warn":""}`}>
                Time Left: <Timer remainingMs={remainingMs} isWarning={isLastFive}/>
              </div>
              <div className="ep2-q-meta">
                <span className="ep2-q-type">{currentQ.type?.replace(/_/g," ")||"Question"}</span>
                <span className="ep2-q-num">Question No: {currentIndex+1} / {questions.length}</span>
              </div>
              {currentQ.passage&&currentQ.type==="PARAGRAPH_CASE"&&<div className="ep2-passage">{currentQ.passage}</div>}
              {currentQ.type==="ASSERTION_REASON"&&<div className="ep2-passage"><strong>Assertion:</strong> {currentQ.assertion}<br/><strong>Reason:</strong> {currentQ.reason}</div>}
              {currentQ.imageUrl&&<div className="ep2-media"><img src={currentQ.imageUrl} alt=""/></div>}
              {currentQ.audioUrl&&<div className="ep2-media"><audio controls src={currentQ.audioUrl}/></div>}
              <p className="ep2-q-text">{currentQ.text}</p>

              {["MCQ","SINGLE_MCQ","PARAGRAPH_CASE","ASSERTION_REASON","TRUE_FALSE","LOGICAL_REASONING"].includes(currentQ.type)&&(
                <div className="ep2-options">
                  {(currentQ.options||[]).map((o,i)=>(
                    <label key={i} className={`ep2-option ${answers[currentQ.id]===o?"ep2-option--selected":""}`}>
                      <input type="radio" name={currentQ.id} checked={answers[currentQ.id]===o} onChange={()=>saveAnswer(currentQ.id,o)}/>
                      <span className="ep2-opt-key">{String.fromCharCode(97+i)})</span>
                      <span className="ep2-opt-text">{o}</span>
                    </label>
                  ))}
                </div>
              )}
              {currentQ.type==="MSQ"&&(
                <div className="ep2-options">
                  {(currentQ.options||[]).map((o,i)=>{
                    const checked=Array.isArray(answers[currentQ.id])&&answers[currentQ.id].includes(o);
                    return(
                      <label key={i} className={`ep2-option ${checked?"ep2-option--selected":""}`}>
                        <input type="checkbox" checked={checked} onChange={e=>toggleMsq(currentQ.id,o,e.target.checked)}/>
                        <span className="ep2-opt-key">{String.fromCharCode(97+i)})</span>
                        <span className="ep2-opt-text">{o}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {currentQ.type==="FILL_BLANK"&&<input className="ep2-text-input" type="text" placeholder="Type your answer…" value={answers[currentQ.id]||""} onChange={e=>saveAnswer(currentQ.id,e.target.value)}/>}
              {currentQ.type==="NAT"&&<input className="ep2-text-input" type="number" step="any" placeholder="Numerical answer" value={toNum(answers[currentQ.id])} onChange={e=>saveAnswer(currentQ.id,e.target.value)}/>}
              {currentQ.type==="INTEGER"&&<input className="ep2-text-input" type="number" step="1" placeholder="Integer answer" value={toNum(answers[currentQ.id])} onChange={e=>saveAnswer(currentQ.id,e.target.value)}/>}
              {currentQ.type==="INTEGER_RANGE"&&<input className="ep2-text-input" type="number" step="1" placeholder={`${currentQ.integerRange?.min??""} – ${currentQ.integerRange?.max??""}`} value={toNum(answers[currentQ.id])} onChange={e=>saveAnswer(currentQ.id,e.target.value)}/>}
              {currentQ.type==="MATCH"&&<MatchBoard question={currentQ} value={answers[currentQ.id]} onChange={v=>saveAnswer(currentQ.id,v)}/>}
              {currentQ.type==="DRAG_DROP"&&<DragDropBoard question={currentQ} value={answers[currentQ.id]} onChange={v=>saveAnswer(currentQ.id,v)}/>}
              {currentQ.type==="MATRIX"&&(
                <div className="matrix-wrap">
                  <table className="matrix-table">
                    <thead><tr><th>Rows/Cols</th>{(currentQ.matrixCols||[]).map(c=><th key={c}>{c}</th>)}</tr></thead>
                    <tbody>{(currentQ.matrixRows||[]).map(row=>(
                      <tr key={row}><td>{row}</td>{(currentQ.matrixCols||[]).map(col=>{
                        const checked=Array.isArray(answers[currentQ.id]?.[row])&&answers[currentQ.id][row].includes(col);
                        return<td key={col}><input type="checkbox" checked={checked} onChange={e=>{
                          const prev=answers[currentQ.id]||{};
                          const arr=Array.isArray(prev[row])?prev[row]:[];
                          saveAnswer(currentQ.id,{...prev,[row]:e.target.checked?[...new Set([...arr,col])]:arr.filter(c=>c!==col)});
                        }}/></td>;
                      })}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>)}
          </div>

          {/* Actions */}
          <div className="ep2-actions">
            <div className="ep2-actions-left">
              <button className="ep2-btn ep2-btn--review" onClick={()=>{if(currentQ)setReviewMap(p=>({...p,[currentQ.id]:true}));goNext();}}>
                🔖 Mark for Review &amp; Next
              </button>
              <button className="ep2-btn ep2-btn--clear" onClick={()=>{
                if(!currentQ)return;
                if(["MATCH","DRAG_DROP","MATRIX"].includes(currentQ.type))saveAnswer(currentQ.id,{});
                else if(currentQ.type==="MSQ")saveAnswer(currentQ.id,[]);
                else saveAnswer(currentQ.id,"");
              }}>✕ Clear Response</button>
            </div>
            <div className="ep2-actions-right">
              {currentIndex>0&&<button className="ep2-btn ep2-btn--ghost" onClick={()=>setCurrentIndex(p=>p-1)}>← Prev</button>}
              <button className="ep2-btn ep2-btn--save" onClick={goNext}>
                {currentIndex<questions.length-1?"Save & Next →":"Review & Submit"}
              </button>
            </div>
          </div>
        </main>

        {/* Right */}
        <aside className="ep2-right">
          <div className="ep2-student-card">
            {profilePhotoUrl ? (
              <img className="ep2-student-photo" src={profilePhotoUrl} alt="Candidate" />
            ) : (
              <div className="ep2-student-avatar">{initials}</div>
            )}
            <div className="ep2-student-info">
              <span className="ep2-student-name">{session.user.name||session.user.email}</span>
              <span className="ep2-student-id">ID: {displayStudentId}</span>
            </div>
          </div>
          <NavigationPanel questions={questions} answers={answers} reviewMap={reviewMap}
            currentIndex={currentIndex} onSelect={setCurrentIndex} sections={sections}
            style={{ marginTop: "10px" }}/>

          {/* Legend — above submit */}
          <div className="nav-legend">
            <div className="nav-legend-item"><span className="nav-dot nav-dot--answered"/><span>Answered</span><strong>{answered}</strong></div>
            <div className="nav-legend-item"><span className="nav-dot nav-dot--unvisited"/><span>Not Visited</span><strong>{questions.filter((q,i)=>!hasAnswer(answers[q.id])&&!reviewMap[q.id]&&i!==currentIndex).length}</strong></div>
            <div className="nav-legend-item"><span className="nav-dot nav-dot--unanswered"/><span>Not Answered</span><strong>{questions.length - answered - reviewed - questions.filter((q,i)=>!hasAnswer(answers[q.id])&&!reviewMap[q.id]&&i!==currentIndex).length}</strong></div>
            <div className="nav-legend-item"><span className="nav-dot nav-dot--review"/><span>Marked for Review</span><strong>{reviewed}</strong></div>
          </div>

          <button className="ep2-submit-btn" onClick={()=>setShowSubmit(true)}>Submit Exam</button>
        </aside>
      </div>

      {/* Submit modal */}
      <Modal open={showSubmit} title="Confirm Submission" onClose={()=>setShowSubmit(false)}>
        <div className="submit-confirm">
          <div className="submit-confirm-icon" aria-hidden>!</div>
          <h4>Ready to submit?</h4>
          <p>After submission, answers cannot be changed.</p>
          <div className="submit-summary">
            <div className="submit-summary-row"><span>Total</span><strong>{questions.length}</strong></div>
            <div className="submit-summary-row"><span>Answered</span><strong className="ok">{answered}</strong></div>
            <div className="submit-summary-row"><span>Unanswered</span><strong className="warn">{unanswered}</strong></div>
            <div className="submit-summary-row"><span>Marked for Review</span><strong className="note">{reviewed}</strong></div>
          </div>
          <div className="submit-confirm-actions">
            <button type="button" className="ghost" onClick={()=>setShowSubmit(false)}>Keep Reviewing</button>
            <button type="button" className="danger" onClick={()=>{setShowSubmit(false);doSubmit(false);}}>Submit Now</button>
          </div>
        </div>
      </Modal>

      {/* Tab warning modal */}
      <Modal open={showTabWarn} title="Security Warning" onClose={()=>setShowTabWarn(false)}>
        <div className="submit-confirm">
          <div className="submit-confirm-icon" aria-hidden>!</div>
          <h4>Stay on the exam tab</h4>
          <p>{tabWarn}</p>
          <div className="submit-confirm-actions">
            <button type="button" className="danger" onClick={()=>setShowTabWarn(false)}>I Understand</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



