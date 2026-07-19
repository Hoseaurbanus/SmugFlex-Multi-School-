/**
 * CSRF Protection Utility for SMugFlex 2.0
 *
 * NOTE: This utility is currently unused for Super Admin routes because
 * JWT Bearer tokens stored in localStorage are NOT automatically attached
 * by browsers on cross-origin requests, making CSRF attacks impossible.
 * CSRF protection is only necessary for cookie-based authentication.
 *
 * This module is retained for potential future use if the auth model changes.
 */

const CSRF_TOKEN_KEY = 'smugflex_csrf_token';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a CSRF token
 */
export function getCsrfToken(): string {
  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    if (stored) {
      const { token, expiry } = JSON.parse(stored);
      if (Date.now() < expiry) {
        return token;
      }
    }
  } catch {
    // Invalid stored data
  }

  // Generate new token
  const token = generateToken();
  const data = {
    token,
    expiry: Date.now() + CSRF_TOKEN_EXPIRY,
  };
  localStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(data));
  return token;
}

/**
 * Get CSRF token for inclusion in requests
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return {
    'X-CSRF-Token': token,
  };
}

/**
 * Clear the stored CSRF token (on logout)
 */
export function clearCsrfToken(): void {
  localStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Validate CSRF token (backend helper - for reference)
 * The actual validation should happen server-side
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) return false;
    const { token: storedToken, expiry } = JSON.parse(stored);
    return storedToken === token && Date.now() < expiry;
  } catch {
    return false;
  }
}
