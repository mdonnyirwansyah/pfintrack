const ANON_ID_KEY = "anon_id";

export function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Get or create the anonymous user ID.
 * Uses crypto.randomUUID() — no external package.
 * Safe to call multiple times; only generates once per browser.
 */
export function getOrCreateAnonId(): string {
  if (globalThis.window === undefined) {
    // SSR: return placeholder (never persisted)
    return "ssr-placeholder";
  }

  const existing = globalThis.localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const newId = generateUUID();
  globalThis.localStorage.setItem(ANON_ID_KEY, newId);
  return newId;
}

/**
 * Read the anon_id without creating one.
 * Returns null if not yet initialized.
 */
export function readAnonId(): string | null {
  if (globalThis.window === undefined) return null;
  return globalThis.localStorage.getItem(ANON_ID_KEY);
}
