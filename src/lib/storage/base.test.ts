import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readKey, writeKey } from "./base";

const KEY = "test_key";

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
});

afterEach(() => {
  mockStorage.clear();
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
});

describe("readKey", () => {
  it("returns empty array when key does not exist", () => {
    expect(readKey(KEY)).toEqual([]);
  });

  it("returns parsed array from localStorage", () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify([{ id: "1" }, { id: "2" }]));
    expect(readKey(KEY)).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("returns empty array for malformed JSON", () => {
    globalThis.localStorage.setItem(KEY, "not-json");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readKey(KEY)).toEqual([]);
    warnSpy.mockRestore();
  });

  it("returns empty array when value is not an array", () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify({ id: "1" }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readKey(KEY)).toEqual([]);
    warnSpy.mockRestore();
  });

  it("preserves typed data", () => {
    const data = [{ id: "abc", amount: 12345, is_active: true }];
    globalThis.localStorage.setItem(KEY, JSON.stringify(data));
    expect(readKey<{ id: string; amount: number; is_active: boolean }>(KEY)).toEqual(data);
  });

  it("returns empty array when window is undefined (SSR)", () => {
    Object.defineProperty(globalThis, "window", { value: undefined, writable: true, configurable: true });
    expect(readKey(KEY)).toEqual([]);
  });
});

describe("writeKey", () => {
  it("serializes array to localStorage", () => {
    const data = [{ id: "1", name: "BCA" }];
    writeKey(KEY, data);
    expect(JSON.parse(globalThis.localStorage.getItem(KEY)!)).toEqual(data);
  });

  it("overwrites existing value", () => {
    writeKey(KEY, [{ id: "old" }]);
    writeKey(KEY, [{ id: "new" }]);
    expect(JSON.parse(globalThis.localStorage.getItem(KEY)!)).toEqual([{ id: "new" }]);
  });

  it("writes empty array", () => {
    writeKey(KEY, []);
    expect(JSON.parse(globalThis.localStorage.getItem(KEY)!)).toEqual([]);
  });

  it("roundtrips: write then read returns same data", () => {
    const data = [{ id: "1", val: 999 }, { id: "2", val: 0 }];
    writeKey(KEY, data);
    expect(readKey(KEY)).toEqual(data);
  });

  it("is a no-op when window is undefined (SSR)", () => {
    Object.defineProperty(globalThis, "window", { value: undefined, writable: true, configurable: true });
    expect(() => writeKey(KEY, [{ id: "1" }])).not.toThrow();
  });
});
