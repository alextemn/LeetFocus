/**
 * leetcode_checker.js
 * Runs on https://leetcode.com/problems/*
 *
 * Every 10 seconds, checks if the current page contains the word "challenge".
 * When detected, sends a message to the background service worker to call
 * POST /api/today/verify/ and mark the daily problem as solved.
 *
 * Uses a per-page flag so the verify call is made at most once per page load.
 */

let verified = false;

function isAccepted() {
  // Look for the LeetCode "More challenges" heading element that appears
  // after a successful submission: <div class="text-label-3 ...">...challenges</div>
  const els = document.querySelectorAll(
    'div.text-label-3.dark\\:text-dark-label-3.text-md.font-medium'
  );
  for (const el of els) {
    if (/more challenges/i.test(el.textContent) && el.offsetParent !== null) {
      return true;
    }
  }

  return false;
}

function check() {
  if (verified) return;
  if (!isAccepted()) return;

  verified = true; // set immediately to prevent double-firing
  chrome.runtime.sendMessage({ type: "PROBLEM_ACCEPTED" }, (response) => {
    if (chrome.runtime.lastError) {
      // Background might not be ready; retry once after a short delay
      verified = false;
    }
  });
}

// Check immediately in case the page loaded on a successful result
check();

// Then check every 10 seconds
setInterval(check, 10_000);
