/**
 * Shared localStorage helpers for all repositories.
 * SSR-safe: all reads/writes guard `typeof window`.
 */

export function readKey<T>(key: string): T[] {
  if (globalThis.window === undefined) return [];

  const raw = globalThis.localStorage.getItem(key);
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
  if (globalThis.window === undefined) return;
  globalThis.localStorage.setItem(key, JSON.stringify(value));
}
