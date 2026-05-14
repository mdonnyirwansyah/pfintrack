import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Wallet } from "@/lib/types/wallet";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";

// Mock IDB and config before importing the module under test
vi.mock("@/lib/storage/idb-client", () => ({
  idbGet: vi.fn(),
  idbPut: vi.fn(),
}));
vi.mock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "idb" }));

import { idbGet, idbPut } from "@/lib/storage/idb-client";
import {
  applyTransactionToWallet,
  rollbackTransactionFromWallet,
  applyLoanEntryToWallet,
  rollbackLoanEntryFromWallet,
} from "./wallet-balance-ops";

const mockGet = vi.mocked(idbGet);
const mockPut = vi.mocked(idbPut);

function makeWallet(balance: number): Wallet {
  return {
    id: "w1", anon_id: "test", name: "BCA",
    wallet_type: "bank", balance, currency: "IDR",
    sort_order: 0, is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeTx(overrides: Partial<Transaction> & { type: Transaction["type"] }): Transaction {
  return {
    id: "tx1", anon_id: "test", wallet_id: "w1",
    destination_wallet_id: null, amount: 100_000,
    title: null, category: null, description: null,
    transaction_date: "2026-05-10", transaction_time: "10:00",
    is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

function makeLoanEntry(overrides: Partial<LoanEntry> & { type: LoanEntry["type"] }): LoanEntry {
  return {
    id: "e1", anon_id: "test", counterparty_id: "cp1",
    wallet_id: "w1", amount: 200_000, note: null,
    transaction_date: "2026-05-10",
    transaction_time: "10:00", is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPut.mockResolvedValue(undefined);
});

// ── applyTransactionToWallet ─────────────────────────────────────────────────

describe("applyTransactionToWallet", () => {
  it("income: increases wallet balance by amount", async () => {
    mockGet.mockResolvedValue(makeWallet(1_000_000));
    await applyTransactionToWallet(makeTx({ type: "income", amount: 500_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_500_000 }));
  });

  it("expense: decreases wallet balance by amount", async () => {
    mockGet.mockResolvedValue(makeWallet(1_000_000));
    await applyTransactionToWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 700_000 }));
  });

  it("transfer: source decreases, destination increases", async () => {
    mockGet
      .mockResolvedValueOnce(makeWallet(1_000_000)) // source
      .mockResolvedValueOnce({ ...makeWallet(500_000), id: "w2" }); // destination

    await applyTransactionToWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2",
    }));

    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ id: "w1", balance: 800_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ id: "w2", balance: 700_000 }));
  });

  it("skips silently when wallet not found", async () => {
    mockGet.mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(applyTransactionToWallet(makeTx({ type: "income" }))).resolves.not.toThrow();
    expect(mockPut).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── rollbackTransactionFromWallet ────────────────────────────────────────────

describe("rollbackTransactionFromWallet", () => {
  it("income rollback: decreases wallet balance", async () => {
    mockGet.mockResolvedValue(makeWallet(1_500_000));
    await rollbackTransactionFromWallet(makeTx({ type: "income", amount: 500_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_000_000 }));
  });

  it("expense rollback: increases wallet balance", async () => {
    mockGet.mockResolvedValue(makeWallet(700_000));
    await rollbackTransactionFromWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_000_000 }));
  });

  it("transfer rollback: reverses both wallets", async () => {
    mockGet
      .mockResolvedValueOnce(makeWallet(800_000))
      .mockResolvedValueOnce({ ...makeWallet(700_000), id: "w2" });

    await rollbackTransactionFromWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2",
    }));

    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ id: "w1", balance: 1_000_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ id: "w2", balance: 500_000 }));
  });

  it("apply then rollback returns original balance", async () => {
    const original = 1_000_000;
    // Apply expense
    mockGet.mockResolvedValue(makeWallet(original));
    await applyTransactionToWallet(makeTx({ type: "expense", amount: 300_000 }));
    const afterApply = mockPut.mock.calls[0][1] as Wallet;
    expect(afterApply.balance).toBe(700_000);

    // Rollback expense
    mockPut.mockClear();
    mockGet.mockResolvedValue({ ...makeWallet(700_000) });
    await rollbackTransactionFromWallet(makeTx({ type: "expense", amount: 300_000 }));
    const afterRollback = mockPut.mock.calls[0][1] as Wallet;
    expect(afterRollback.balance).toBe(original);
  });
});

// ── applyLoanEntryToWallet ───────────────────────────────────────────────────

describe("applyLoanEntryToWallet", () => {
  it("give: decreases wallet balance (user paid out)", async () => {
    mockGet.mockResolvedValue(makeWallet(1_000_000));
    await applyLoanEntryToWallet(makeLoanEntry({ type: "give", amount: 200_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 800_000 }));
  });

  it("get: increases wallet balance (user received)", async () => {
    mockGet.mockResolvedValue(makeWallet(1_000_000));
    await applyLoanEntryToWallet(makeLoanEntry({ type: "get", amount: 200_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_200_000 }));
  });

  it("skips when wallet_id is null", async () => {
    await applyLoanEntryToWallet(makeLoanEntry({ type: "give", wallet_id: null }));
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });
});

// ── rollbackLoanEntryFromWallet ──────────────────────────────────────────────

describe("rollbackLoanEntryFromWallet", () => {
  it("give rollback: increases wallet balance", async () => {
    mockGet.mockResolvedValue(makeWallet(800_000));
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "give", amount: 200_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_000_000 }));
  });

  it("get rollback: decreases wallet balance", async () => {
    mockGet.mockResolvedValue(makeWallet(1_200_000));
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "get", amount: 200_000 }));
    expect(mockPut).toHaveBeenCalledWith("wallets", expect.objectContaining({ balance: 1_000_000 }));
  });

  it("skips when wallet_id is null", async () => {
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "give", wallet_id: null }));
    expect(mockGet).not.toHaveBeenCalled();
  });
});
