import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

export default function AdminShell({ title, children }) {
  const { session, logout } = useAuth();

  return (
    <div className="admin-shell">
      <main className="admin-shell-main admin-page">
        <aside className="admin-left-nav">
          <div className="nav-title">
            <BrandLogo compact />
          </div>
          <nav>
            <NavLink end to="/admin">
              <span className="nav-ico">D</span>Dashboard
            </NavLink>
            <NavLink to="/admin/question-bank">
              <span className="nav-ico">Q</span>Question Bank
            </NavLink>
            <NavLink to="/admin/modules">
              <span className="nav-ico">M</span>Modules & Topics
            </NavLink>
            <NavLink to="/admin/exams">
              <span className="nav-ico">E</span>Create Exam
            </NavLink>
            <NavLink to="/admin/results">
              <span className="nav-ico">R</span>Results
            </NavLink>
            <NavLink to="/admin/students">
              <span className="nav-ico">S</span>Students
            </NavLink>
          </nav>
          <button className="ghost logout-top" type="button" onClick={logout}>Logout</button>
        </aside>

        <div className="admin-content">
          <div className="admin-shell-top">
            <div>
              <p className="eyebrow">Control Center</p>
              <h2>{title}</h2>
            </div>
            <div className="header-actions">
              <div className="user-pill">{session.user.name || session.user.email}</div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
