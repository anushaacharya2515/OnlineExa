import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import loginIllustration from "../assets/login-illustration.jpg";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

const REGISTER_FEATURES = ["Secure & Fair Exams", "Instant Results", "User-Friendly Platform"];
const REGISTER_CHIPS = ["Get exam alerts", "Detailed reports"];

function getEmptyForm() {
  return { name: "", email: "", mobileNumber: "", password: "", confirmPassword: "" };
}

/* ── Forgot Password Modal ── */
function ForgotPasswordModal({ onClose }) {
  const [step,            setStep]            = useState("email");
  const [email,           setEmail]           = useState("");
  const [code,            setCode]            = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [resetCode,       setResetCode]       = useState("");

  async function handleRequestCode(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await api("/auth/forgot-password", { method: "POST", body: { email } });
      setResetCode(data.resetCode || "");
      setStep("reset");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const data = await api("/auth/reset-password", {
        method: "POST",
        body: { email, token: code, password, confirmPassword }
      });
      setSuccess(data.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fp-modal">
        <button className="fp-close" onClick={onClose} aria-label="Close">✕</button>

        {success ? (
          <div className="fp-success-state">
            <div className="fp-success-icon">✓</div>
            <h3>Password Reset!</h3>
            <p>{success}</p>
            <button className="login-submit" onClick={onClose}>Back to Sign In</button>
          </div>
        ) : step === "email" ? (
          <form onSubmit={handleRequestCode}>
            <h3>Forgot Password</h3>
            <p className="fp-sub">Enter your registered email to receive a reset code.</p>
            <label>Email Address</label>
            <input required type="email" placeholder="your@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <h3>Reset Password</h3>
            <p className="fp-sub">Enter the reset code sent to <strong>{email}</strong>.</p>
            {resetCode && (
              <div className="fp-code-hint">
                Your reset code: <strong>{resetCode}</strong>
                <span className="fp-code-note"> (demo — use email in production)</span>
              </div>
            )}
            <label>Reset Code</label>
            <input required placeholder="6-character code" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6} style={{ letterSpacing: "0.2em", textTransform: "uppercase" }} />
            <label>New Password</label>
            <div className="password-wrap">
              <input required type={showPass ? "text" : "password"} placeholder="New password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="toggle-pass" onClick={() => setShowPass(s => !s)}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            <label>Confirm New Password</label>
            <div className="password-wrap">
              <input required type={showPass ? "text" : "password"} placeholder="Confirm new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button type="button" className="toggle-pass" onClick={() => setShowPass(s => !s)}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button type="button" className="ghost" onClick={() => { setStep("email"); setError(""); }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(getEmptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(new Date());
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMode() {
    setError("");
    setSuccess("");
    setForm(getEmptyForm());
    setMode((current) => (current === "login" ? "register" : "login"));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) {
          setError("Password and confirm password must match.");
          return;
        }
        await api("/auth/register", { method: "POST", body: form });
        const registeredEmail = form.email;
        setForm({ ...getEmptyForm(), email: registeredEmail });
        setSuccess("Registration successful. Please sign in with your email and password.");
        setMode("login");
      } else {
        const data = await api("/auth/login", {
          method: "POST",
          body: { email: form.email, password: form.password }
        });
        login(data);
        navigate(`/${data.user.role}`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={`center-wrap login-page ${mode === "register" ? "register-mode" : ""}`.trim()}>
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
      <div className={`login-surface ${mode === "register" ? "is-register" : ""}`.trim()}>
        <aside className={`login-left ${mode === "register" ? "is-register" : ""}`.trim()}>
          {mode === "register" ? (
            <div className="register-showcase">
              <BrandLogo compact className="register-left-logo" />
              <div className="register-copy">
                <h1>Join Us Today!</h1>
                <p>Sign up to start taking secure online assessments.</p>
              </div>

              <div className="register-feature-list">
                {REGISTER_FEATURES.map((feature) => (
                  <div key={feature} className="register-feature">
                    <span className="register-feature-icon" aria-hidden />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="register-visual-card">
                <img className="login-illustration register-illustration" src={loginIllustration} alt="Online examination illustration" />
              </div>

              <div className="register-chip-row">
                {REGISTER_CHIPS.map((chip) => (
                  <span key={chip} className="register-chip">{chip}</span>
                ))}
              </div>

              <div className="slide-dots register-dots">
                <span className="active" />
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : (
            <>
              <BrandLogo compact className="login-left-logo" />
              <img className="login-illustration" src={loginIllustration} alt="Online examination illustration" />
              <p className="eyebrow login-eyebrow">Secure Online Exams</p>
              <h1>Welcome Back!</h1>
              <p>
                Unleash your academic success with a real-time online examination platform.
              </p>
              <div className="login-features">
                <span>Live timer</span>
                <span>Auto submit</span>
                <span>AI retake questions</span>
              </div>
              <div className="slide-dots">
                <span className="active" />
                <span />
                <span />
              </div>
            </>
          )}
        </aside>

        <form className={`login-right ${mode === "register" ? "is-register" : ""}`.trim()} onSubmit={handleSubmit}>
          <div className={`login-form-panel ${mode === "register" ? "is-register" : ""}`.trim()}>
            <h2 className="login-brand">{mode === "login" ? "Your Assessment Starts Here" : "Create Your Account"}</h2>
            <p className="login-sub">
              {mode === "login" ? "Securely sign in to access your online examination portal!" : "It's quick and easy. Get started now!"}
            </p>

            {mode === "register" ? (
              <div className="login-field-grid register-grid">
                <div className="login-field field-span-2">
                  <label>Full Name</label>
                  <input
                    required
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="login-field field-span-2">
                  <label>Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="login-field field-span-2">
                  <label>Mobile Number</label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    placeholder="Mobile number"
                    value={form.mobileNumber}
                    onChange={(e) => updateField("mobileNumber", e.target.value)}
                  />
                </div>
                <div className="login-field field-span-2">
                  <label>Password</label>
                  <div className="password-wrap">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                    />
                    <button type="button" className="toggle-pass" onClick={() => setShowPassword((s) => !s)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="login-field field-span-2">
                  <label>Confirm Password</label>
                  <div className="password-wrap">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                    />
                    <button type="button" className="toggle-pass" onClick={() => setShowPassword((s) => !s)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label>Email</label>
                <input
                  required
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />

                <label>Password</label>
                <div className="password-wrap">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                  <button type="button" className="toggle-pass" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </>
            )}

            {mode === "login" && (
              <div className="login-meta-row">
                <small>Live: {now.toLocaleTimeString()}</small>
                <button
                  type="button"
                  className="text-link-button fp-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <button type="submit" className="login-submit">{mode === "login" ? "Sign in" : "Sign Up"}</button>

            <div className="login-divider"><span>or</span></div>
            <button type="button" className="google-btn">
              {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
            </button>

            {mode === "register" ? (
              <>
                <small className="register-policy-note">By signing up, you agree to our Privacy Policy.</small>
                <div className="login-switch-inline">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    className="text-link-button"
                    onClick={toggleMode}
                  >
                    Login
                  </button>
                </div>
              </>
            ) : (
              <small className="admin-hint">Admin demo: admin@exam.com / admin123</small>
            )}

            {mode === "login" && (
              <button
                type="button"
                className="ghost"
                onClick={toggleMode}
              >
                New user? Create account
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
