import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { formatAttemptId } from "../utils/attemptId";

const DEFAULT_FILTERS = {
  exam: "",
  status: ""
};

export default function AdminResults() {
  const { session } = useAuth();
  const token = session.token;
  const [results, setResults] = useState([]);
  const [examOptions, setExamOptions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          sort: "latest"
        });

        if (search.trim()) params.set("search", search.trim());
        if (filters.exam) params.set("exam", filters.exam);
        if (filters.status) params.set("status", filters.status);

        const data = await api(`/admin/results?${params.toString()}`, { token });
        setResults(data.results || []);
        setExamOptions(data.exams || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [page, search, filters, token]);

  function formatDuration(ms) {
    if (!ms && ms !== 0) return "-";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function updateFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  }

  function downloadCsv() {
    if (!results.length) return;
    const header = ["Student Name", "Student Email", "Roll Number", "Attempt ID", "Exam", "Status", "Score", "Time Taken", "Submitted At"];
    const rows = results.map((r) => [
      r.studentName || "Unknown",
      r.studentEmail || "",
      r.rollNumber || "",
      formatAttemptId(r.id),
      r.examTitle || r.examId || "",
      r.resultStatus || "",
      r.score ?? 0,
      formatDuration(r.timeTakenMs),
      formatDate(r.submittedAt)
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `results-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Results">
      <style>{`
        .results-card { width: 100%; overflow: hidden; display: flex; flex-direction: column; }
        .results-card .table-wrap { overflow-x: auto; overflow-y: auto; width: 100%; flex: 1; min-height: 0; scrollbar-width: thin; scrollbar-color: #d4c5ff transparent; }
        .results-card .table-wrap::-webkit-scrollbar { height: 5px; width: 5px; }
        .results-card .table-wrap::-webkit-scrollbar-thumb { background: #d4c5ff; border-radius: 999px; }
        .ar-table { table-layout: auto; min-width: 860px; width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .ar-table th, .ar-table td { padding: 9px 10px; border-bottom: 1px solid #edf1f7; white-space: nowrap; text-align: left; }
        .ar-table thead tr { background: #f1f3f7; position: sticky; top: 0; z-index: 1; }
        .ar-table thead th { color: #263246; font-weight: 700; }
        .ar-table tbody tr:hover { background: #f6f8fc; }
        .ar-table td:nth-child(4) { font-family: monospace; font-size: 0.78rem; color: #4b5a72; }
        .ar-table td:nth-child(9) { font-size: 0.78rem; color: #4c5c72; }
        .ar-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
        .ar-toolbar { display: flex; gap: 8px; flex-wrap: nowrap; align-items: center; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #f0ebff; }
        .ar-toolbar input { flex: 1; min-width: 0; height: 38px; padding: 0 12px; border: 1.5px solid #e0d9f7; border-radius: 8px; font-size: 0.85rem; background: #faf8ff; outline: none; }
        .ar-toolbar input:focus { border-color: #9b6bff; }
        .ar-toolbar select { height: 38px; padding: 0 10px; border: 1.5px solid #e0d9f7; border-radius: 8px; font-size: 0.85rem; min-width: 130px; max-width: 160px; background: #faf8ff; outline: none; cursor: pointer; flex-shrink: 0; }
        .ar-count { font-size: 0.8rem; font-weight: 700; color: #9b8ec4; white-space: nowrap; flex-shrink: 0; }
        .ar-action-btn { height: 38px; padding: 0 16px; border: 1.5px solid #e0d9f7; border-radius: 8px; background: #faf8ff; color: #6f4cff; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
        .ar-action-btn:hover { background: #f0ebff; border-color: #c4b0ff; }
        .ar-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ar-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; font-size: 0.8rem; color: #4c5c72; }
        .ar-pagination { display: flex; align-items: center; gap: 10px; justify-content: flex-end; padding-top: 10px; font-size: 0.88rem; }
        .ar-pagination .ar-muted { margin-right: auto; color: #4c5c72; font-size: 0.82rem; }
        .empty-cell { text-align: center; padding: 28px; color: #6f7c99; }
      `}</style>

      {error && <div className="error">{error}</div>}

      <div className="card results-card">
        {/* Single compact bar: search + dropdowns + count + actions */}
        <div className="ar-toolbar">
          <input
            type="text"
            placeholder="🔍 Search name, email, roll no…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select value={filters.exam} onChange={(e) => updateFilter("exam", e.target.value)}>
            <option value="">All Exams</option>
            {examOptions.map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
            <option value="">All Status</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          <span className="ar-count">{total} results</span>
          <button className="ar-action-btn" onClick={clearFilters}>Clear</button>
          <button className="ar-action-btn" onClick={downloadCsv} disabled={!results.length}>⬇ CSV</button>
        </div>

        <div className="table-wrap">
          <table className="ar-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Roll No</th>
                <th>Attempt ID</th>
                <th>Exam</th>
                <th>Status</th>
                <th>Score</th>
                <th>Time</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="9" className="empty-cell">Loading results...</td></tr>
              )}
              {!loading && results.length === 0 && (
                <tr><td colSpan="9" className="empty-cell">No results found.</td></tr>
              )}
              {!loading && results.map((r) => (
                <tr key={r.id}>
                  <td title={r.studentName}>{r.studentName || "Unknown"}</td>
                  <td title={r.studentEmail}>{r.studentEmail || "-"}</td>
                  <td title={r.rollNumber}>{r.rollNumber ? String(r.rollNumber).slice(0, 12) : "-"}</td>
                  <td title={formatAttemptId(r.id)}>{formatAttemptId(r.id)}</td>
                  <td title={r.examTitle || r.examId}>{r.examTitle || r.examId}</td>
                  <td>
                    <span className={`result-badge ${(r.resultStatus || "").toLowerCase()}`}>
                      {r.resultStatus || "-"}
                    </span>
                  </td>
                  <td>{r.score ?? 0}</td>
                  <td>{formatDuration(r.timeTakenMs)}</td>
                  <td title={formatDate(r.submittedAt)}>{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ar-pagination">
          <span className="ar-muted">Latest attempts first</span>
          <button className="ghost" disabled={page === 1 || loading} onClick={() => setPage((prev) => prev - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="ghost" disabled={page === totalPages || loading} onClick={() => setPage((prev) => prev + 1)}>Next</button>
        </div>
      </div>
    </AdminShell>
  );
}
