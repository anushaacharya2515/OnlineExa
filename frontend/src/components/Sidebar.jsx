import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="admin-shell-sidebar">
      <div className="admin-brand">
        <div className="brand-icon">OE</div>
        <div>
          <h3>Online Examination System</h3>
          <small>Admin</small>
        </div>
      </div>

      <nav className="admin-nav">
        <NavLink end to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">D</span> Dashboard
        </NavLink>
        <NavLink to="/admin/question-bank" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">Q</span> Question Bank
        </NavLink>
        <NavLink to="/admin/exams" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">E</span> Create Exam
        </NavLink>
        <NavLink to="/admin/results" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">R</span> Results
        </NavLink>
        <NavLink to="/admin/students" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">S</span> Students
        </NavLink>
      </nav>

      <button className="logout-btn" onClick={logout}>Logout</button>
    </aside>
  );
}
