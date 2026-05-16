import { describe, it, expect } from "vitest";
import type { Transaction } from "@/lib/types/transaction";
import {
  selectByDate,
  computeDailySummary,
  getTitleSuggestions,
  getCategorySuggestions,
} from "./useTransactionStore";

function tx(overrides: Partial<Transaction> & { type: Transaction["type"] }): Transaction {
  return {
    id: crypto.randomUUID(),
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

describe("selectByDate", () => {
  it("returns only transactions for the given date", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10" }),
      tx({ type: "expense", transaction_date: "2026-05-11" }),
      tx({ type: "income", transaction_date: "2026-05-10" }),
    ];
    const result = selectByDate(txs, "2026-05-10");
    expect(result).toHaveLength(2);
    expect(result.every(t => t.transaction_date === "2026-05-10")).toBe(true);
  });

  it("excludes inactive transactions", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10", is_active: false }),
      tx({ type: "income", transaction_date: "2026-05-10" }),
    ];
    expect(selectByDate(txs, "2026-05-10")).toHaveLength(1);
  });

  it("sorts by time descending (latest first)", () => {
    const txs = [
      tx({ type: "income", transaction_date: "2026-05-10", transaction_time: "08:00" }),
      tx({ type: "income", transaction_date: "2026-05-10", transaction_time: "14:00" }),
      tx({ type: "income", transaction_date: "2026-05-10", transaction_time: "11:00" }),
    ];
    const result = selectByDate(txs, "2026-05-10");
    expect(result[0].transaction_time).toBe("14:00");
    expect(result[1].transaction_time).toBe("11:00");
    expect(result[2].transaction_time).toBe("08:00");
  });

  it("returns empty array when no transactions on date", () => {
    const txs = [tx({ type: "income", transaction_date: "2026-05-11" })];
    expect(selectByDate(txs, "2026-05-10")).toEqual([]);
  });
});

describe("computeDailySummary", () => {
  it("sums income and expenses correctly", () => {
    const txs = [
      tx({ type: "income", amount: 3_000_000 }),
      tx({ type: "income", amount: 500_000 }),
      tx({ type: "expense", amount: 200_000 }),
    ];
    const result = computeDailySummary(txs);
    expect(result.income).toBe(3_500_000);
    expect(result.expenses).toBe(200_000);
    expect(result.balance).toBe(3_300_000);
  });

  it("ignores transfer transactions", () => {
    const txs = [
      tx({ type: "income", amount: 1_000_000 }),
      tx({ type: "transfer", amount: 500_000 }),
    ];
    const result = computeDailySummary(txs);
    expect(result.income).toBe(1_000_000);
    expect(result.expenses).toBe(0);
  });

  it("excludes Balance Correction category", () => {
    const txs = [
      tx({ type: "income", amount: 1_000_000, category: "Balance Correction" }),
      tx({ type: "expense", amount: 200_000, category: "Balance Correction" }),
    ];
    const result = computeDailySummary(txs);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.balance).toBe(0);
  });

  it("returns zeros for empty list", () => {
    expect(computeDailySummary([])).toEqual({ income: 0, expenses: 0, balance: 0 });
  });

  it("balance = income − expenses", () => {
    const txs = [
      tx({ type: "income", amount: 5_000_000 }),
      tx({ type: "expense", amount: 1_500_000 }),
    ];
    const { income, expenses, balance } = computeDailySummary(txs);
    expect(balance).toBe(income - expenses);
  });
});

describe("getTitleSuggestions", () => {
  it("returns unique title+category pairs for the given type", () => {
    const txs = [
      tx({ type: "expense", title: "Makan Siang", category: "Food", created_at: "2026-05-10T12:00:00.000Z" }),
      tx({ type: "expense", title: "Ojek", category: "Transport", created_at: "2026-05-10T11:00:00.000Z" }),
      tx({ type: "income", title: "Gaji", category: "Salary", created_at: "2026-05-10T10:00:00.000Z" }),
    ];
    const result = getTitleSuggestions(txs, "expense");
    expect(result).toHaveLength(2);
    expect(result.map(r => r.title)).toContain("Makan Siang");
    expect(result.map(r => r.title)).toContain("Ojek");
    expect(result.map(r => r.title)).not.toContain("Gaji");
  });

  it("deduplicates same title+category", () => {
    const txs = [
      tx({ type: "expense", title: "Makan", category: "Food", created_at: "2026-05-10T12:00:00.000Z" }),
      tx({ type: "expense", title: "Makan", category: "Food", created_at: "2026-05-09T12:00:00.000Z" }),
    ];
    expect(getTitleSuggestions(txs, "expense")).toHaveLength(1);
  });

  it("caps at 8 suggestions", () => {
    const txs = Array.from({ length: 12 }, (_, i) =>
      tx({ type: "expense", title: `Title${i}`, category: "Food", created_at: `2026-05-${String(i + 1).padStart(2, "0")}T10:00:00.000Z` })
    );
    expect(getTitleSuggestions(txs, "expense")).toHaveLength(8);
  });

  it("excludes transactions without title or category", () => {
    const txs = [
      tx({ type: "expense", title: null, category: "Food" }),
      tx({ type: "expense", title: "Makan", category: null }),
      tx({ type: "expense", title: "Valid", category: "Food" }),
    ];
    const result = getTitleSuggestions(txs, "expense");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid");
  });

  it("excludes inactive transactions", () => {
    const txs = [
      tx({ type: "expense", title: "Hidden", category: "Food", is_active: false }),
    ];
    expect(getTitleSuggestions(txs, "expense")).toHaveLength(0);
  });
});

describe("getCategorySuggestions", () => {
  it("returns user categories when transactions exist (no defaults mixed in)", () => {
    const txs = [
      tx({ type: "expense", category: "Hobi", created_at: "2026-05-10T10:00:00.000Z" }),
    ];
    const result = getCategorySuggestions(txs, "expense", "en");
    expect(result).toContain("Hobi");
    expect(result).not.toContain("Food & Drinks");
  });

  it("user categories appear before defaults", () => {
    const txs = [tx({ type: "expense", category: "CustomCat", created_at: "2026-05-10T10:00:00.000Z" })];
    const result = getCategorySuggestions(txs, "expense", "en");
    expect(result[0]).toBe("CustomCat");
  });

  it("excludes Balance Correction", () => {
    const txs = [tx({ type: "expense", category: "Balance Correction" })];
    const result = getCategorySuggestions(txs, "expense", "en");
    expect(result).not.toContain("Balance Correction");
  });

  it("returns id-locale defaults when locale=id", () => {
    const result = getCategorySuggestions([], "expense", "id");
    expect(result).toContain("Makanan & Minuman");
  });

  it("returns en-locale defaults when locale=en", () => {
    const result = getCategorySuggestions([], "income", "en");
    expect(result).toContain("Salary");
  });
});
