import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import {
  calcExpenses,
  calcIncome,
  calcLoan,
  calcBalanceCorrection,
  calcPeriodSummary,
  calcCategoryBreakdown,
  getTransactionsForCategory,
  generateMonthList,
  calculateMonthlySummary,
  currentMonthStart,
  currentMonthEnd,
} from "./calculations";

// ── Fixtures ────────────────────────────────────────────────────────────────

function tx(overrides: Partial<Transaction> & { type: Transaction["type"] }): Transaction {
  return {
    id: randomUUID(),
    anon_id: "test",
    wallet_id: "w1",
    destination_wallet_id: null,
    amount: 100_000,
    title: null,
    category: null,
    description: null,
    transaction_date: "2026-05-10",
    transaction_time: "10:00",
    is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

function loan(overrides: Partial<LoanEntry> & { type: LoanEntry["type"] }): LoanEntry {
  return {
    id: randomUUID(),
    anon_id: "test",
    counterparty_id: "cp1",
    wallet_id: null,
    amount: 100_000,
    note: null,
    transaction_date: "2026-05-10",
    transaction_time: "10:00",
    is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

function hist(overrides: Partial<WalletBalanceHistory>): WalletBalanceHistory {
  return {
    id: randomUUID(),
    anon_id: "test",
    wallet_id: "w1",
    previous_balance: 0,
    new_balance: 100_000,
    delta: 100_000,
    corrected_at: "2026-05-10T10:00:00.000Z",
    is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

const PERIOD = { start: "2026-05-01", end: "2026-05-31" };

// ── calcExpenses ─────────────────────────────────────────────────────────────

describe("calcExpenses", () => {
  it("sums active expense transactions in period", () => {
    const txs = [
      tx({ type: "expense", amount: 50_000 }),
      tx({ type: "expense", amount: 30_000 }),
    ];
    expect(calcExpenses(txs, PERIOD.start, PERIOD.end)).toBe(80_000);
  });

  it("excludes income transactions", () => {
    const txs = [tx({ type: "income", amount: 500_000 })];
    expect(calcExpenses(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });

  it("excludes inactive transactions", () => {
    const txs = [tx({ type: "expense", amount: 50_000, is_active: false })];
    expect(calcExpenses(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });

  it("excludes transactions outside period", () => {
    const txs = [tx({ type: "expense", amount: 50_000, transaction_date: "2026-04-30" })];
    expect(calcExpenses(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });

  it("excludes Balance Correction category", () => {
    const txs = [tx({ type: "expense", amount: 50_000, category: "Balance Correction" })];
    expect(calcExpenses(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(calcExpenses([], PERIOD.start, PERIOD.end)).toBe(0);
  });
});

// ── calcIncome ───────────────────────────────────────────────────────────────

describe("calcIncome", () => {
  it("sums active income transactions in period", () => {
    const txs = [
      tx({ type: "income", amount: 3_000_000 }),
      tx({ type: "income", amount: 500_000 }),
    ];
    expect(calcIncome(txs, PERIOD.start, PERIOD.end)).toBe(3_500_000);
  });

  it("excludes expense transactions", () => {
    const txs = [tx({ type: "expense", amount: 100_000 })];
    expect(calcIncome(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });

  it("excludes Balance Correction category", () => {
    const txs = [tx({ type: "income", amount: 100_000, category: "Balance Correction" })];
    expect(calcIncome(txs, PERIOD.start, PERIOD.end)).toBe(0);
  });
});

// ── calcLoan ─────────────────────────────────────────────────────────────────

describe("calcLoan", () => {
  it("returns null when no loan entries in period", () => {
    expect(calcLoan([], PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("returns null when get and give cancel out", () => {
    const entries = [
      loan({ type: "get", amount: 100_000 }),
      loan({ type: "give", amount: 100_000 }),
    ];
    expect(calcLoan(entries, PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("net = get − give (positive: received more than gave)", () => {
    const entries = [
      loan({ type: "get", amount: 300_000 }),
      loan({ type: "give", amount: 100_000 }),
    ];
    expect(calcLoan(entries, PERIOD.start, PERIOD.end)).toBe(200_000);
  });

  it("net = get − give (negative: gave more than received)", () => {
    const entries = [
      loan({ type: "give", amount: 500_000 }),
      loan({ type: "get", amount: 200_000 }),
    ];
    expect(calcLoan(entries, PERIOD.start, PERIOD.end)).toBe(-300_000);
  });

  it("excludes inactive entries", () => {
    const entries = [loan({ type: "get", amount: 100_000, is_active: false })];
    expect(calcLoan(entries, PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("excludes entries outside period", () => {
    const entries = [loan({ type: "get", amount: 100_000, transaction_date: "2026-04-01" })];
    expect(calcLoan(entries, PERIOD.start, PERIOD.end)).toBeNull();
  });
});

// ── calcBalanceCorrection ────────────────────────────────────────────────────

describe("calcBalanceCorrection", () => {
  it("returns null for empty history", () => {
    expect(calcBalanceCorrection([], PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("sums deltas in period", () => {
    const h = [
      hist({ delta: 50_000, corrected_at: "2026-05-10T10:00:00.000Z" }),
      hist({ delta: -20_000, corrected_at: "2026-05-15T10:00:00.000Z" }),
    ];
    expect(calcBalanceCorrection(h, PERIOD.start, PERIOD.end)).toBe(30_000);
  });

  it("returns null when sum is zero", () => {
    const h = [
      hist({ delta: 100_000, corrected_at: "2026-05-10T10:00:00.000Z" }),
      hist({ delta: -100_000, corrected_at: "2026-05-10T10:00:00.000Z" }),
    ];
    expect(calcBalanceCorrection(h, PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("excludes history outside period", () => {
    const h = [hist({ delta: 100_000, corrected_at: "2026-04-01T10:00:00.000Z" })];
    expect(calcBalanceCorrection(h, PERIOD.start, PERIOD.end)).toBeNull();
  });

  it("excludes inactive history", () => {
    const h = [hist({ delta: 100_000, is_active: false })];
    expect(calcBalanceCorrection(h, PERIOD.start, PERIOD.end)).toBeNull();
  });
});

// ── calcPeriodSummary ────────────────────────────────────────────────────────

describe("calcPeriodSummary", () => {
  it("balance = income − expenses", () => {
    const txs = [
      tx({ type: "income", amount: 5_000_000 }),
      tx({ type: "expense", amount: 1_500_000 }),
    ];
    const summary = calcPeriodSummary(txs, [], [], PERIOD.start, PERIOD.end);
    expect(summary.income).toBe(5_000_000);
    expect(summary.expenses).toBe(1_500_000);
    expect(summary.balance).toBe(3_500_000);
    expect(summary.loan).toBeNull();
    expect(summary.balanceCorrection).toBeNull();
  });

  it("includes loan and balanceCorrection when present", () => {
    const loans = [loan({ type: "give", amount: 200_000 })];
    const history = [hist({ delta: 50_000 })];
    const summary = calcPeriodSummary([], loans, history, PERIOD.start, PERIOD.end);
    expect(summary.loan).toBe(-200_000);
    expect(summary.balanceCorrection).toBe(50_000);
  });
});

// ── calcCategoryBreakdown ────────────────────────────────────────────────────

describe("calcCategoryBreakdown", () => {
  it("returns empty array when no transactions", () => {
    expect(calcCategoryBreakdown([], PERIOD.start, PERIOD.end)).toEqual([]);
  });

  it("groups by category and sorts descending", () => {
    const txs = [
      tx({ type: "expense", amount: 100_000, category: "Food" }),
      tx({ type: "expense", amount: 200_000, category: "Transport" }),
      tx({ type: "expense", amount: 50_000, category: "Food" }),
    ];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result[0].category).toBe("Transport");
    expect(result[0].total).toBe(200_000);
    expect(result[1].category).toBe("Food");
    expect(result[1].total).toBe(150_000);
  });

  it("calculates percentage correctly", () => {
    const txs = [
      tx({ type: "expense", amount: 300_000, category: "Food" }),
      tx({ type: "expense", amount: 700_000, category: "Transport" }),
    ];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result.find(r => r.category === "Transport")!.percentage).toBeCloseTo(70);
    expect(result.find(r => r.category === "Food")!.percentage).toBeCloseTo(30);
  });

  it("collapses >8 categories into Lainnya", () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      tx({ type: "expense", amount: (10 - i) * 10_000, category: `Cat${i}` })
    );
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result).toHaveLength(9); // 8 + Lainnya
    expect(result[8].category).toBe("Lainnya");
  });

  it("excludes income when type=expense (default)", () => {
    const txs = [
      tx({ type: "income", amount: 1_000_000, category: "Salary" }),
      tx({ type: "expense", amount: 200_000, category: "Food" }),
    ];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Food");
  });

  it("filters by type=income when specified", () => {
    const txs = [
      tx({ type: "income", amount: 1_000_000, category: "Salary" }),
      tx({ type: "expense", amount: 200_000, category: "Food" }),
    ];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end, "income");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Salary");
  });

  it("uses 'Other' for null category", () => {
    const txs = [tx({ type: "expense", amount: 100_000, category: null })];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result[0].category).toBe("Other");
  });

  it("returns empty array when all transaction amounts are zero (grandTotal === 0)", () => {
    const txs = [tx({ type: "expense", amount: 0, category: "Food" })];
    const result = calcCategoryBreakdown(txs, PERIOD.start, PERIOD.end);
    expect(result).toEqual([]);
  });
});

// ── getTransactionsForCategory ───────────────────────────────────────────────

describe("getTransactionsForCategory", () => {
  it("returns transactions matching specific category", () => {
    const txs = [
      tx({ type: "expense", category: "Food", amount: 50_000 }),
      tx({ type: "expense", category: "Transport", amount: 30_000 }),
      tx({ type: "expense", category: "Food", amount: 20_000 }),
    ];
    const result = getTransactionsForCategory(txs, PERIOD.start, PERIOD.end, "Food");
    expect(result).toHaveLength(2);
    expect(result.every(t => t.category === "Food")).toBe(true);
  });

  it("for Lainnya: returns all active expense transactions in period", () => {
    const txs = [
      tx({ type: "expense", category: "Food" }),
      tx({ type: "expense", category: "Transport" }),
      tx({ type: "income", category: "Salary" }),
    ];
    const result = getTransactionsForCategory(txs, PERIOD.start, PERIOD.end, "Lainnya");
    expect(result).toHaveLength(2);
    expect(result.every(t => t.type === "expense")).toBe(true);
  });

  it("excludes Balance Correction", () => {
    const txs = [
      tx({ type: "expense", category: "Balance Correction" }),
      tx({ type: "expense", category: "Food" }),
    ];
    const result = getTransactionsForCategory(txs, PERIOD.start, PERIOD.end, "Food");
    expect(result).toHaveLength(1);
  });

  it("excludes transactions outside period", () => {
    const txs = [
      tx({ type: "expense", category: "Food", transaction_date: "2026-04-30" }),
      tx({ type: "expense", category: "Food" }),
    ];
    expect(getTransactionsForCategory(txs, PERIOD.start, PERIOD.end, "Food")).toHaveLength(1);
  });

  it("matches null category as 'Other' when looking up by 'Other'", () => {
    const txs = [
      tx({ type: "expense", category: null, amount: 50_000 }),
      tx({ type: "expense", category: "Food", amount: 30_000 }),
    ];
    const result = getTransactionsForCategory(txs, PERIOD.start, PERIOD.end, "Other");
    expect(result).toHaveLength(1);
    expect(result[0].category).toBeNull();
  });
});

// ── generateMonthList ────────────────────────────────────────────────────────

describe("generateMonthList", () => {
  it("returns empty array for no transactions", () => {
    expect(generateMonthList([])).toEqual([]);
  });

  it("returns single month for same-month transactions", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10" }),
      tx({ type: "expense", transaction_date: "2026-05-20" }),
    ];
    const result = generateMonthList(txs);
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe("2026-05-01");
    expect(result[0].end).toBe("2026-05-31");
  });

  it("returns months in descending order (latest first)", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10" }),
      tx({ type: "income", transaction_date: "2026-03-15" }),
    ];
    const result = generateMonthList(txs);
    expect(result).toHaveLength(3); // May, Apr, Mar
    expect(result[0].start).toBe("2026-05-01");
    expect(result[2].start).toBe("2026-03-01");
  });

  it("excludes inactive transactions", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10" }),
      tx({ type: "income", transaction_date: "2026-01-01", is_active: false }),
    ];
    const result = generateMonthList(txs);
    expect(result).toHaveLength(1);
  });
});

// ── calculateMonthlySummary ──────────────────────────────────────────────────

describe("calculateMonthlySummary", () => {
  it("calculates income, expenses, balance for a month", () => {
    const txs = [
      tx({ type: "income", amount: 5_000_000, transaction_date: "2026-05-10" }),
      tx({ type: "expense", amount: 1_000_000, transaction_date: "2026-05-15" }),
    ];
    const result = calculateMonthlySummary(txs, [], [], PERIOD.start, PERIOD.end);
    expect(result.income).toBe(5_000_000);
    expect(result.expenses).toBe(1_000_000);
    expect(result.balance).toBe(4_000_000);
  });

  it("startBalance accumulates transactions before period", () => {
    const txs = [
      tx({ type: "income", amount: 3_000_000, transaction_date: "2026-04-10" }), // before
      tx({ type: "expense", amount: 500_000, transaction_date: "2026-04-15" }), // before
      tx({ type: "income", amount: 1_000_000, transaction_date: "2026-05-10" }), // in period
    ];
    const result = calculateMonthlySummary(txs, [], [], PERIOD.start, PERIOD.end);
    expect(result.startBalance).toBe(2_500_000); // 3M - 500K
    expect(result.endBalance).toBe(3_500_000); // 2.5M + 1M
  });

  it("endBalance includes balanceCorrection", () => {
    const txs = [tx({ type: "income", amount: 1_000_000, transaction_date: "2026-05-10" })];
    const history = [hist({ delta: 200_000 })];
    const result = calculateMonthlySummary(txs, [], history, PERIOD.start, PERIOD.end);
    expect(result.balanceCorrection).toBe(200_000);
    expect(result.endBalance).toBe(1_200_000);
  });

  it("startBalance accumulates balance corrections before period", () => {
    // Covers prevCorrections reducer: history entries before period.start
    // must be summed into the carried-over startBalance.
    const history = [
      hist({ delta: 150_000, corrected_at: "2026-04-05T10:00:00.000Z" }), // before
      hist({ delta: -50_000, corrected_at: "2026-04-20T10:00:00.000Z" }), // before
      hist({ delta: 999_999, corrected_at: "2026-05-10T10:00:00.000Z" }), // in period (ignored for prevCorrections)
      hist({ delta: 77_000, corrected_at: "2026-03-01T10:00:00.000Z", is_active: false }), // inactive
    ];
    const result = calculateMonthlySummary([], [], history, PERIOD.start, PERIOD.end);
    expect(result.startBalance).toBe(100_000); // 150K + (-50K)
    expect(result.balanceCorrection).toBe(999_999);
    expect(result.endBalance).toBe(1_099_999); // 100K + 0 (no in-period tx) + 999_999
  });
});

// ── currentMonthStart / currentMonthEnd ──────────────────────────────────────

describe("currentMonthStart", () => {
  it("returns first day of current month in YYYY-MM-DD", () => {
    const result = currentMonthStart();
    expect(result).toMatch(/^\d{4}-\d{2}-01$/);
    // Should be today's year and month
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    expect(result).toBe(expected);
  });
});

describe("currentMonthEnd", () => {
  it("returns last day of current month in YYYY-MM-DD", () => {
    const result = currentMonthEnd();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Day should be 28–31
    const day = Number.parseInt(result.split("-")[2], 10);
    expect(day).toBeGreaterThanOrEqual(28);
    expect(day).toBeLessThanOrEqual(31);
  });
});
