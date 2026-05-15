import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { getOrCreateAnonId, readAnonId } from "./anon-id";

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
}

let mockStorage: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  mockStorage = makeLocalStorageMock();
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true, configurable: true });
  Object.defineProperty(globalThis, "crypto", { value: { randomUUID }, writable: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
});

describe("getOrCreateAnonId", () => {
  it("creates and stores a UUID on first call", () => {
    const id = getOrCreateAnonId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(globalThis.localStorage.getItem("anon_id")).toBe(id);
  });

  it("returns the same ID on subsequent calls", () => {
    const first = getOrCreateAnonId();
    const second = getOrCreateAnonId();
    expect(first).toBe(second);
  });

  it("returns existing ID if already stored", () => {
    globalThis.localStorage.setItem("anon_id", "preset-id-123");
    expect(getOrCreateAnonId()).toBe("preset-id-123");
  });

  it("generates unique IDs across fresh sessions", () => {
    const id1 = getOrCreateAnonId();
    mockStorage.clear();
    const id2 = getOrCreateAnonId();
    expect(id1).not.toBe(id2);
  });

  it("returns ssr-placeholder when window is undefined (SSR)", () => {
    Object.defineProperty(globalThis, "window", { value: undefined, writable: true, configurable: true });
    expect(getOrCreateAnonId()).toBe("ssr-placeholder");
  });
});

describe("readAnonId", () => {
  it("returns null when no ID exists", () => {
    expect(readAnonId()).toBeNull();
  });

  it("returns stored ID", () => {
    globalThis.localStorage.setItem("anon_id", "test-id-456");
    expect(readAnonId()).toBe("test-id-456");
  });

  it("does not create a new ID (read-only)", () => {
    readAnonId();
    expect(globalThis.localStorage.getItem("anon_id")).toBeNull();
  });

  it("returns null when window is undefined (SSR)", () => {
    Object.defineProperty(globalThis, "window", { value: undefined, writable: true, configurable: true });
    expect(readAnonId()).toBeNull();
  });
});
