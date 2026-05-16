import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { getOrCreateAnonId, readAnonId } from "./anon-id";
import * as bootstrapAnonId from "@/lib/bootstrap/anon-id";

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
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

describe("storage/anon-id re-exports", () => {
  it("re-exports getOrCreateAnonId from bootstrap", () => {
    expect(getOrCreateAnonId).toBe(bootstrapAnonId.getOrCreateAnonId);
  });

  it("re-exports readAnonId from bootstrap", () => {
    expect(readAnonId).toBe(bootstrapAnonId.readAnonId);
  });

  it("re-exported getOrCreateAnonId behaves identically (creates & persists UUID)", () => {
    const id = getOrCreateAnonId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(mockStorage.getItem("anon_id")).toBe(id);
    // Subsequent call returns the same persisted value.
    expect(getOrCreateAnonId()).toBe(id);
  });

  it("re-exported readAnonId returns null when nothing stored and value when present", () => {
    expect(readAnonId()).toBeNull();
    mockStorage.setItem("anon_id", "preset-storage-id");
    expect(readAnonId()).toBe("preset-storage-id");
  });
});
