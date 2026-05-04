import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("exam_session");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (payload) => {
    setSession(payload);
    localStorage.setItem("exam_session", JSON.stringify(payload));
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("exam_session");
  };

  const value = useMemo(() => ({ session, login, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
