import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

export default function StudentShell({ active = "exams", children }) {
  const { session, logout } = useAuth();
  const name = (session.user.name || session.user.email || "Student").split("@")[0];
  const initials = name.slice(0, 1).toUpperCase();
  const profilePhotoUrl = session.user.profilePhotoUrl || "";

  return (
    <div className="se-shell">
      <aside className="se-sidebar">
        <div className="se-sidebar-brand"><BrandLogo compact /></div>

        <div className="se-profile">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt="Profile"
              className="se-avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="se-avatar">{initials}</div>
          )}
          <div className="se-profile-text">
            <strong>{name}</strong>
            <span>Student</span>
          </div>
        </div>

        <nav className="se-nav">
          <Link to="/student/exams" className={`se-nav-item ${active === "exams" ? "se-nav-item--active" : ""}`}>
            <span>📝</span> Exams
          </Link>
          <Link to="/student/profile" className={`se-nav-item ${active === "profile" ? "se-nav-item--active" : ""}`}>
            <span>👤</span> Profile
          </Link>
        </nav>

        <button className="se-logout" onClick={logout}>🚪 Logout</button>
      </aside>

      <main className="se-main">
        {children}
      </main>
    </div>
  );
}
