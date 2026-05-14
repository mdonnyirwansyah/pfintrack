import { describe, it, expect } from "vitest";
import {
  formatDisplayDate,
  formatDateRange,
  formatDisplayDateLocale,
  formatDateRangeLocale,
  formatMonthLabelLocale,
  todayISO,
  currentTimeHHMM,
  nowISO,
} from "./date";

describe("formatDisplayDate", () => {
  it("formats date in Indonesian locale", () => {
    expect(formatDisplayDate("2026-05-14", "id")).toBe("Kam, 14 Mei 2026");
  });

  it("formats date in English locale", () => {
    expect(formatDisplayDate("2026-05-14", "en")).toBe("Thu, 14 May 2026");
  });

  it("defaults to Indonesian locale", () => {
    expect(formatDisplayDate("2026-01-01")).toBe("Kam, 01 Jan 2026");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDisplayDate("not-a-date")).toBe("");
  });

  it("accepts Date object", () => {
    const result = formatDisplayDate(new Date("2026-05-14"), "en");
    expect(result).toContain("May 2026");
  });
});

describe("formatDateRange", () => {
  it("formats date range in Indonesian", () => {
    expect(formatDateRange("2026-05-01", "2026-05-31", "id")).toBe(
      "01 Mei 2026 - 31 Mei 2026"
    );
  });

  it("formats date range in English", () => {
    expect(formatDateRange("2026-05-01", "2026-05-31", "en")).toBe(
      "01 May 2026 - 31 May 2026"
    );
  });

  it("returns empty string if either date is invalid", () => {
    expect(formatDateRange("invalid", "2026-05-31")).toBe("");
    expect(formatDateRange("2026-05-01", "invalid")).toBe("");
  });
});

describe("formatDisplayDateLocale", () => {
  it("delegates to formatDisplayDate with given locale", () => {
    expect(formatDisplayDateLocale("2026-05-14", "id")).toBe(formatDisplayDate("2026-05-14", "id"));
    expect(formatDisplayDateLocale("2026-05-14", "en")).toBe(formatDisplayDate("2026-05-14", "en"));
  });
});

describe("formatDateRangeLocale", () => {
  it("delegates to formatDateRange with given locale", () => {
    expect(formatDateRangeLocale("2026-05-01", "2026-05-31", "id")).toBe(
      formatDateRange("2026-05-01", "2026-05-31", "id")
    );
  });
});

describe("formatMonthLabelLocale", () => {
  it("formats month label in Indonesian", () => {
    expect(formatMonthLabelLocale(new Date("2026-05-01"), "id")).toBe("Mei 2026");
  });

  it("formats month label in English", () => {
    expect(formatMonthLabelLocale(new Date("2026-05-01"), "en")).toBe("May 2026");
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("currentTimeHHMM", () => {
  it("returns HH:MM format", () => {
    expect(currentTimeHHMM()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("nowISO", () => {
  it("returns valid ISO 8601 timestamp", () => {
    const ts = nowISO();
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
