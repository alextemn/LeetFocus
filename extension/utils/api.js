/**
 * api.js
 * Thin wrapper around fetch() for talking to the LeetFocus backend.
 */

const API_BASE = "http://localhost:8000/api";

async function request(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? body.detail ?? message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export async function fetchTodayProblem(token) {
  return request("/today/", token);
}

export async function fetchProfile(token) {
  return request("/profile/", token);
}

export async function verifyTodaySolved(token) {
  return request("/today/verify/", token, { method: "POST" });
}
