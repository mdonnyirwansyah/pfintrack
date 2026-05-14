import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "skip", "end")).toBe("base end");
    expect(cn("base", true && "added")).toBe("base added");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("handles object syntax", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});
