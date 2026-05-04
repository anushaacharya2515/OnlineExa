import { useMemo } from "react";

export default function Timer({ remainingMs, isWarning = false }) {
  const formatted = useMemo(() => {
    const total = Math.max(0, Math.floor(remainingMs / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [remainingMs]);

  return <div className={`sidebar-time ${isWarning ? "sidebar-time-warning" : ""}`.trim()}>{formatted}</div>;
}
