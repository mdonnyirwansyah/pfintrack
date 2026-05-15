const ANON_ID_KEY = "anon_id";

export function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback for legacy runtimes: derive UUID v4 from a CSPRNG via
  // crypto.getRandomValues. Math.random() is unsuitable because it is not
  // cryptographically secure and SonarQube/javascript:S2245 flags it for
  // any identity-bearing value.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Per RFC 4122 §4.4: set version (4) and variant (10xx) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
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
