const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`;

export async function api(path, { token, method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    console.log("Error object:", error);
    throw new Error("Cannot connect to backend. Please try again later.");
  }

  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    const error = new Error(msg.message || "Action not allowed.");
    error.status = res.status;
    console.log("Error object:", error);
    throw error;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    return await res.text();
  }

  return await res.json();
}
