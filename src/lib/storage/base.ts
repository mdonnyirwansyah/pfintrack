/**
 * Shared localStorage helpers for all repositories.
 * SSR-safe: all reads/writes guard `typeof window`.
 */

export function readKey<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(key);
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[storage] key "${key}" is not an array — resetting to []`);
      return [];
    }
    return parsed as T[];
  } catch (err) {
    console.warn(`[storage] failed to parse key "${key}":`, err);
    return [];
  }
}

export function writeKey<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
