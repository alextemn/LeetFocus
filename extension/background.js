/**
 * background.js — Service Worker (ES Module)
 *
 * Handles:
 * - CLERK_TOKEN: saves the token captured from the web app
 * - PROBLEM_ACCEPTED: calls POST /api/today/verify/ when LeetCode detects a solve
 * - SIGN_OUT: clears stored token
 */

import { saveToken, getToken, clearToken, parseTokenExpiry } from "./utils/auth.js";
import { verifyTodaySolved, fetchTodayProblem } from "./utils/api.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CLERK_TOKEN") {
    handleNewToken(message.token).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "PROBLEM_ACCEPTED") {
    handleProblemAccepted().then((result) => sendResponse(result));
    return true;
  }

  if (message.type === "SIGN_OUT") {
    clearToken().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function fetchAndCachePotd(token) {
  try {
    const problem = await fetchTodayProblem(token);
    const today = new Date().toISOString().slice(0, 10);
    if (problem.assigned === false) {
      await chrome.storage.local.set({
        lf_today_problem_url: null,
        lf_today_solved: false,
        lf_today_date: today,
      });
      return;
    }
    await chrome.storage.local.set({
      lf_today_problem_url: problem.problem_url,
      lf_today_solved: problem.solved,
      lf_today_date: today,
    });
  } catch {
    // Fail open — no redirect when POTD is unavailable
  }
}

async function handleNewToken(token) {
  const expiry = parseTokenExpiry(token);
  if (!expiry) return;
  await saveToken(token, expiry);
  fetchAndCachePotd(token);
}

function isAllowedUrl(url, potdUrl) {
  try {
    const { hostname } = new URL(url);
    if (hostname === "google.com" || hostname.endsWith(".google.com")) return true;
  } catch {
    // ignore invalid URLs
  }
  return (
    url.startsWith("https://leetfocus.com") ||
    url.startsWith("https://www.leetfocus.com") ||
    url.startsWith("https://leetfocus-production.up.railway.app") ||
    url.startsWith(potdUrl)
  );
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const url = changeInfo.url;
  if (!url) return;
  if (!url.startsWith("http")) return;

  const token = await getToken();
  if (!token) return;

  const data = await chrome.storage.local.get([
    "lf_today_problem_url",
    "lf_today_solved",
    "lf_today_date",
  ]);

  const today = new Date().toISOString().slice(0, 10);
  if (data.lf_today_date !== today) {
    fetchAndCachePotd(token);
    return;
  }

  if (data.lf_today_solved) return;
  if (!data.lf_today_problem_url) return;

  if (isAllowedUrl(url, data.lf_today_problem_url)) return;

  chrome.tabs.update(tabId, { url: data.lf_today_problem_url });
});

async function handleProblemAccepted() {
  const token = await getToken();
  if (!token) return { ok: false, error: "not authenticated" };

  try {
    const data = await verifyTodaySolved(token);
    await chrome.storage.local.set({ lf_today_solved: true });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
