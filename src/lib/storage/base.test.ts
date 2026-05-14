// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readKey, writeKey } from "./base";

const KEY = "test_key";

beforeEach(() => {
  localStorage.clear();
  // Ensure window is defined so guards pass
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });
});

describe("readKey", () => {
  it("returns empty array when key does not exist", () => {
    expect(readKey(KEY)).toEqual([]);
  });

  it("returns parsed array from localStorage", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: "1" }, { id: "2" }]));
    expect(readKey(KEY)).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("returns empty array for malformed JSON", () => {
    localStorage.setItem(KEY, "not-json");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readKey(KEY)).toEqual([]);
    warnSpy.mockRestore();
  });

  it("returns empty array when value is not an array", () => {
    localStorage.setItem(KEY, JSON.stringify({ id: "1" }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(readKey(KEY)).toEqual([]);
    warnSpy.mockRestore();
  });

  it("preserves typed data", () => {
    const data = [{ id: "abc", amount: 12345, is_active: true }];
    localStorage.setItem(KEY, JSON.stringify(data));
    expect(readKey<{ id: string; amount: number; is_active: boolean }>(KEY)).toEqual(data);
  });
});

describe("writeKey", () => {
  it("serializes array to localStorage", () => {
    const data = [{ id: "1", name: "BCA" }];
    writeKey(KEY, data);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(data);
  });

  it("overwrites existing value", () => {
    writeKey(KEY, [{ id: "old" }]);
    writeKey(KEY, [{ id: "new" }]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([{ id: "new" }]);
  });

  it("writes empty array", () => {
    writeKey(KEY, []);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
  });

  it("roundtrips: write then read returns same data", () => {
    const data = [{ id: "1", val: 999 }, { id: "2", val: 0 }];
    writeKey(KEY, data);
    expect(readKey(KEY)).toEqual(data);
  });
});
