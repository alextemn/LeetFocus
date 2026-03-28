/**
 * clerk_bridge.js
 * Runs on localhost:5173 (the LeetFocus web app).
 *
 * The frontend's ExtensionBridge component calls window.postMessage with a
 * fresh Clerk JWT whenever auth state changes (sign-in, token refresh).
 * Content scripts can receive postMessage from the page, so this is
 * instant and works across SPA navigation — no polling, no race condition.
 */

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "__LEETFOCUS_TOKEN__") return;
  const token = event.data.token;
  if (token) {
    chrome.runtime.sendMessage({ type: "CLERK_TOKEN", token }, () => {
      void chrome.runtime.lastError;
    });
  }
});
