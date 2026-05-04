export function formatAttemptId(value) {
  if (!value) return "-";
  const compact = String(value).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!compact) return "-";
  return `ATT-${compact.slice(0, 8)}`;
}
