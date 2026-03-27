/**
 * popup.js
 *
 * Auth flow:
 * 1. On open, check chrome.storage for a saved Clerk token.
 * 2. If none → show sign-in screen with a button that opens the LeetFocus web app.
 *    The clerk_bridge content script running on that page will automatically
 *    capture the token and send it here via the background service worker.
 * 3. If valid token → call GET /api/today/ + GET /api/profile/ and render status.
 */

import { getToken, clearToken } from "../utils/auth.js";
import { fetchTodayProblem, fetchProfile } from "../utils/api.js";

const app = document.getElementById("app");

// ── Minimal DOM helper ────────────────────────────────────────────────────────
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") node.className = v;
    else if (k === "style") Object.assign(node.style, v);
    else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function render(node) {
  app.innerHTML = "";
  app.appendChild(node);
}

// ── Screens ───────────────────────────────────────────────────────────────────

function screenLoading() {
  const s = el("div", { className: "screen", id: "screen-loading" });
  s.appendChild(el("div", { className: "loader" }));
  return s;
}

function screenSignIn(note = null) {
  const s = el("div", { className: "screen", id: "screen-signin" });

  s.appendChild(el("div", { className: "brand" }, "leetfocus"));
  s.appendChild(el("div", { className: "headline" }, "Connect your account"));
  s.appendChild(
    el("div", { className: "subtext" },
      "Sign in to the LeetFocus web app. The extension will pick up your session automatically."
    )
  );

  const openBtn = el("button", {
    className: "btn-primary",
    style: { marginTop: "4px" },
    onClick: () => {
      chrome.tabs.create({ url: "http://localhost:5173/dashboard" });
    },
  }, "open leet focus →");
  s.appendChild(openBtn);

  // After signing in on the web app, user clicks this to refresh
  const refreshBtn = el("button", {
    className: "btn-ghost",
    style: { marginTop: "10px", alignSelf: "flex-start" },
    onClick: () => boot(),
  }, "already signed in? refresh");
  s.appendChild(refreshBtn);

  if (note) {
    s.appendChild(el("div", { className: "error-banner", style: { marginTop: "10px" } }, note));
  }

  return s;
}

function screenMain({ problem, profile, solved }) {
  const s = el("div", { className: "screen", id: "screen-main" });

  // Top bar
  const topBar = el("div", { className: "top-bar" });
  topBar.appendChild(el("div", { className: "brand" }, "leetfocus"));
  topBar.appendChild(el("div", { className: "user-email" }, profile?.email ?? ""));
  s.appendChild(topBar);

  // Problem card
  const card = el("div", { className: "problem-card" });

  const meta = el("div", { className: "problem-meta" });
  const dateStr = problem.assigned_date
    ? new Date(problem.assigned_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "today";
  meta.appendChild(el("div", { className: "problem-date" }, dateStr));
  meta.appendChild(
    el("div", { className: `difficulty-badge difficulty-${problem.problem_difficulty}` },
      problem.problem_difficulty
    )
  );
  card.appendChild(meta);
  card.appendChild(el("div", { className: "problem-title" }, problem.problem_title));
  card.appendChild(
    el("a", {
      className: "problem-link",
      href: problem.problem_url,
      onClick: (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: problem.problem_url });
      },
    }, "open on leetcode →")
  );
  s.appendChild(card);

  // Status banner
  if (solved) {
    const statusEl = el("div", { className: "status-solved" });
    statusEl.appendChild(el("div", { className: "check" }, "✓"));
    const txt = el("div");
    txt.appendChild(el("div", { className: "solved-label" }, "problem solved"));
    txt.appendChild(el("div", { className: "solved-sub" }, "great work — see you tomorrow"));
    statusEl.appendChild(txt);
    s.appendChild(statusEl);
  } else {
    const statusEl = el("div", { className: "status-unsolved" });
    statusEl.appendChild(document.createTextNode("not solved yet — "));
    statusEl.appendChild(el("span", {}, "go crush it"));
    s.appendChild(statusEl);
  }

  // Footer
  const footer = el("div", { className: "footer" });
  footer.appendChild(
    el("button", { className: "btn-ghost", onClick: handleSignOut }, "sign out")
  );
  s.appendChild(footer);

  return s;
}

function screenError(message) {
  const s = el("div", { className: "screen", id: "screen-signin" });
  s.appendChild(el("div", { className: "brand" }, "leetfocus"));
  s.appendChild(el("div", { className: "error-banner" }, message));
  s.appendChild(
    el("button", {
      className: "btn-ghost",
      style: { marginTop: "12px" },
      onClick: () => render(screenSignIn()),
    }, "← back")
  );
  return s;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleSignOut() {
  await clearToken();
  chrome.runtime.sendMessage({ type: "SIGN_OUT" });
  render(screenSignIn());
}

async function loadMain(token) {
  render(screenLoading());
  try {
    const [problem, profile] = await Promise.all([
      fetchTodayProblem(token),
      fetchProfile(token),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    chrome.storage.local.set({
      lf_today_problem_url: problem.problem_url,
      lf_today_solved: problem.solved,
      lf_today_date: today,
    });
    render(screenMain({ problem, profile, solved: problem.solved }));
  } catch (err) {
    const msg = err.message ?? "Unknown error";
    if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("unauthorized")) {
      await clearToken();
      render(screenSignIn("Session expired — please open the web app and sign in again."));
    } else if (msg.includes("No problems")) {
      render(screenError("No problems in your pool yet.\nImport your LeetCode history in Settings."));
    } else {
      render(screenError(`Error: ${msg}`));
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  render(screenLoading());
  const token = await getToken();
  if (!token) {
    render(screenSignIn());
    return;
  }
  await loadMain(token);
}

boot();
