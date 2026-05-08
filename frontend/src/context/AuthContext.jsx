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

  const updateSessionUser = (userPatch) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, ...userPatch } };
      localStorage.setItem("exam_session", JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("exam_session");
  };

  const value = useMemo(() => ({ session, login, logout, updateSessionUser }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
