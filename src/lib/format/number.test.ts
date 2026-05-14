import { describe, it, expect, beforeEach } from "vitest";
import { formatIDR, formatIDRSigned, parseIDR, setFormatDecimals } from "./number";

describe("formatIDR", () => {
  beforeEach(() => setFormatDecimals(false));

  it("formats whole number without decimals", () => {
    expect(formatIDR(1000000)).toBe("1.000.000");
  });

  it("formats zero", () => {
    expect(formatIDR(0)).toBe("0");
  });

  it("formats small number", () => {
    expect(formatIDR(500)).toBe("500");
  });

  it("formats large number", () => {
    expect(formatIDR(999999999999)).toBe("999.999.999.999");
  });

  it("with decimals enabled: shows 2 decimal places", () => {
    setFormatDecimals(true);
    expect(formatIDR(823110.46)).toBe("823.110,46");
  });

  it("with decimals enabled: rounds to 2 decimal places", () => {
    setFormatDecimals(true);
    expect(formatIDR(1000)).toBe("1.000,00");
  });
});

describe("formatIDRSigned", () => {
  beforeEach(() => setFormatDecimals(false));

  it("prefix + for positive values", () => {
    expect(formatIDRSigned(5000)).toBe("+ 5.000");
  });

  it("prefix - for negative values", () => {
    expect(formatIDRSigned(-17000)).toBe("- 17.000");
  });

  it("no prefix for zero", () => {
    expect(formatIDRSigned(0)).toBe("0");
  });
});

describe("parseIDR", () => {
  it("parses formatted IDR string", () => {
    expect(parseIDR("823.110")).toBe(823110);
  });

  it("parses with decimal comma", () => {
    expect(parseIDR("823.110,46")).toBe(823110.46);
  });

  it("parses plain number string", () => {
    expect(parseIDR("500000")).toBe(500000);
  });

  it("returns NaN for empty string", () => {
    expect(Number.isNaN(parseIDR(""))).toBe(true);
  });

  it("parses zero", () => {
    expect(parseIDR("0")).toBe(0);
  });

  it("round-trips: parse(format(x)) === x for whole numbers", () => {
    const values = [0, 1000, 500000, 999999999];
    for (const v of values) {
      expect(parseIDR(formatIDR(v))).toBe(v);
    }
  });
});
