// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateAnonId, readAnonId } from "./anon-id";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });
});

describe("getOrCreateAnonId", () => {
  it("creates and stores a UUID on first call", () => {
    const id = getOrCreateAnonId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem("anon_id")).toBe(id);
  });

  it("returns the same ID on subsequent calls", () => {
    const first = getOrCreateAnonId();
    const second = getOrCreateAnonId();
    expect(first).toBe(second);
  });

  it("returns existing ID if already stored", () => {
    localStorage.setItem("anon_id", "preset-id-123");
    expect(getOrCreateAnonId()).toBe("preset-id-123");
  });

  it("generates unique IDs across fresh sessions", () => {
    const id1 = getOrCreateAnonId();
    localStorage.clear();
    const id2 = getOrCreateAnonId();
    expect(id1).not.toBe(id2);
  });
});

describe("readAnonId", () => {
  it("returns null when no ID exists", () => {
    expect(readAnonId()).toBeNull();
  });

  it("returns stored ID", () => {
    localStorage.setItem("anon_id", "test-id-456");
    expect(readAnonId()).toBe("test-id-456");
  });

  it("does not create a new ID (read-only)", () => {
    readAnonId();
    expect(localStorage.getItem("anon_id")).toBeNull();
  });
});
