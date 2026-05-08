import { useEffect, useState } from "react";
import StudentShell from "../components/StudentShell";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useRef } from "react";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentProfilePage() {
  const { session, updateSessionUser } = useAuth();
  const token = session.token;
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    dob: "",
    profilePhotoUrl: "",
    resumeUrl: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [resumeName, setResumeName] = useState("");

  useEffect(() => {
    api("/student/profile", { token })
      .then((data) => setForm(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function onChange(e) {
    setSuccess("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPhotoName(file.name);
    setForm((prev) => ({ ...prev, profilePhotoUrl: dataUrl }));
  }

  async function onResumeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setResumeName(file.name);
    setForm((prev) => ({ ...prev, resumeUrl: dataUrl }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api("/student/profile", { token, method: "PUT", body: form });
      updateSessionUser({
        name: updated.name,
        mobileNumber: updated.mobileNumber,
        dob: updated.dob,
        profilePhotoUrl: updated.profilePhotoUrl,
        resumeUrl: updated.resumeUrl
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudentShell active="profile">
      <header className="se-header se-profile-head">
        <div>
          <p className="se-header-sub">Student Portal</p>
          <h1 className="se-header-title">My Profile</h1>
        </div>
      </header>
      {loading && <div className="se-loading">Loading profile...</div>}
      {error && <div className="se-error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {!loading && (
        <form className="card admin-form se-profile-form" onSubmit={onSave}>
          <div className="create-exam-grid se-profile-grid">
            <div className="field-block">
              <label>Full Name</label>
              <input name="name" value={form.name || ""} onChange={onChange} />
            </div>
            <div className="field-block">
              <label>Email</label>
              <input value={form.email || ""} disabled />
            </div>
            <div className="field-block">
              <label>Mobile Number</label>
              <input name="mobileNumber" value={form.mobileNumber || ""} onChange={onChange} />
            </div>
            <div className="field-block">
              <label>Date Of Birth</label>
              <input type="date" name="dob" value={form.dob || ""} onChange={onChange} />
            </div>
            <div className="field-block field-span-2">
              <label>Profile Photo (PNG/JPG/JPEG/SVG)</label>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoUpload} />
              {(photoName || form.profilePhotoUrl) && (
                <small className="muted">{photoName || "Photo uploaded"}</small>
              )}
              {form.profilePhotoUrl && (
                <div className="se-profile-preview-wrap">
                  <img src={form.profilePhotoUrl} alt="Profile" className="se-profile-preview" />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, profilePhotoUrl: "" }));
                      setPhotoName("");
                      if (photoInputRef.current) photoInputRef.current.value = "";
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>
            <div className="field-block field-span-2">
              <label>Resume Upload (PDF/DOC/DOCX)</label>
              <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" onChange={onResumeUpload} />
              {(resumeName || form.resumeUrl) && (
                <small className="muted">{resumeName || "Resume uploaded"}</small>
              )}
              {form.resumeUrl && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <a href={form.resumeUrl} target="_blank" rel="noreferrer">View Uploaded Resume</a>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, resumeUrl: "" }));
                      setResumeName("");
                      if (resumeInputRef.current) resumeInputRef.current.value = "";
                    }}
                  >
                    Remove Resume
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="create-exam-actions se-profile-actions">
            <button className="action-button" disabled={saving} type="submit">{saving ? "Saving..." : "Save Profile"}</button>
          </div>
        </form>
      )}
    </StudentShell>
  );
}
