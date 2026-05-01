const ANON_ID_KEY = "anon_id";

/**
 * Get or create the anonymous user ID.
 * Uses crypto.randomUUID() — no external package.
 * Safe to call multiple times; only generates once per browser.
 */
export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") {
    // SSR: return placeholder (never persisted)
    return "ssr-placeholder";
  }

  const existing = localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const newId = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, newId);
  return newId;
}

/**
 * Read the anon_id without creating one.
 * Returns null if not yet initialized.
 */
export function readAnonId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ANON_ID_KEY);
}
