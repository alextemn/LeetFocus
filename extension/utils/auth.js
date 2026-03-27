/**
 * auth.js
 * Handles storing and retrieving the Clerk JWT token in chrome.storage.local.
 * The token is set by the popup after the user signs in via the web app.
 */

const TOKEN_KEY = "lf_clerk_token";
const TOKEN_EXPIRY_KEY = "lf_clerk_token_expiry";

/**
 * Save a Clerk JWT and its expiry timestamp to local storage.
 * @param {string} token - The raw JWT string.
 * @param {number} expiresAt - Unix timestamp (seconds) when the token expires.
 */
export async function saveToken(token, expiresAt) {
  await chrome.storage.local.set({
    [TOKEN_KEY]: token,
    [TOKEN_EXPIRY_KEY]: expiresAt,
  });
}

/**
 * Retrieve the stored token. Returns null if missing or expired.
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  const data = await chrome.storage.local.get([TOKEN_KEY, TOKEN_EXPIRY_KEY]);
  const token = data[TOKEN_KEY];
  const expiry = data[TOKEN_EXPIRY_KEY];

  if (!token) return null;

  // Treat as expired if within 30 seconds of expiry
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiry && nowSeconds >= expiry - 30) {
    await clearToken();
    return null;
  }

  return token;
}

/**
 * Remove the stored token (sign-out).
 */
export async function clearToken() {
  await chrome.storage.local.remove([TOKEN_KEY, TOKEN_EXPIRY_KEY]);
}

/**
 * Parse the exp claim from a JWT without verifying the signature.
 * @param {string} token
 * @returns {number|null} - Unix timestamp in seconds, or null on parse failure.
 */
export function parseTokenExpiry(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.exp ?? null;
  } catch {
    return null;
  }
}
