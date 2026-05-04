import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

function formatDateTime(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export default function AdminStudents() {
  const { session } = useAuth();
  const token = session.token;
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/admin/students", { token });
        setStudents(data || []);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => [
      s.name,
      s.email,
      s.mobileNumber
    ].join(" ").toLowerCase().includes(q));
  }, [students, search]);

  return (
    <AdminShell title="Students">
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="table-header">
          <div>
            <h3>Students</h3>
            <p className="muted">All registered students, profile details, and performance summary.</p>
          </div>
          <div className="search-row">
            <input
              placeholder="Search name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Registered</th>
                <th>Exams Taken</th>
                <th>Average Score</th>
                <th>Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-cell">No students found.</td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.mobileNumber || "-"}</td>
                  <td>{formatDateTime(s.registeredAt)}</td>
                  <td>{s.examsTaken}</td>
                  <td>{s.averageScore}</td>
                  <td>{formatDateTime(s.lastAttempt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
