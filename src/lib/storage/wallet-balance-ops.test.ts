import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Wallet } from "@/lib/types/wallet";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";

vi.mock("@/lib/storage/idb-client", () => ({
  idbUpdate: vi.fn(),
  idbUpdateMany: vi.fn(),
}));
vi.mock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "idb" }));

import { idbUpdate, idbUpdateMany } from "@/lib/storage/idb-client";
import {
  applyTransactionToWallet,
  rollbackTransactionFromWallet,
  applyLoanEntryToWallet,
  rollbackLoanEntryFromWallet,
} from "./wallet-balance-ops";

const mockUpdate = vi.mocked(idbUpdate);
const mockUpdateMany = vi.mocked(idbUpdateMany);

function makeWallet(balance: number, id = "w1"): Wallet {
  return {
    id,
    anon_id: "test",
    name: "BCA",
    wallet_type: "bank",
    balance,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeTx(overrides: Partial<Transaction> & { type: Transaction["type"] }): Transaction {
  return {
    id: "tx1",
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

function makeLoanEntry(overrides: Partial<LoanEntry> & { type: LoanEntry["type"] }): LoanEntry {
  return {
    id: "e1",
    anon_id: "test",
    counterparty_id: "cp1",
    wallet_id: "w1",
    amount: 200_000,
    note: null,
    transaction_date: "2026-05-10",
    transaction_time: "10:00",
    is_active: true,
    created_at: "2026-05-10T10:00:00.000Z",
    updated_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

type WalletUpdater = (existing: Wallet) => Wallet;
type WalletUpdaterMany = (existing: Wallet | null, id: string) => Wallet | null;

function setupIdbUpdate(initial: Wallet[]) {
  const writes: Wallet[] = [];
  mockUpdate.mockImplementation(async (_store, id, updater) => {
    const existing = initial.find((w) => w.id === id) as Wallet;
    const next = (updater as unknown as WalletUpdater)(existing);
    writes.push(next);
    return next;
  });
  return writes;
}

function setupIdbUpdateMany(initial: Wallet[]) {
  const writes: Wallet[] = [];
  mockUpdateMany.mockImplementation(async (_store, ids, updater) => {
    for (const id of ids) {
      const existing = initial.find((w) => w.id === id) ?? null;
      const next = (updater as unknown as WalletUpdaterMany)(existing, id);
      if (next) writes.push(next);
    }
  });
  return writes;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyTransactionToWallet", () => {
  it("income: increases wallet balance by amount", async () => {
    const writes = setupIdbUpdate([makeWallet(1_000_000)]);
    await applyTransactionToWallet(makeTx({ type: "income", amount: 500_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_500_000 }));
  });

  it("expense: decreases wallet balance by amount", async () => {
    const writes = setupIdbUpdate([makeWallet(1_000_000)]);
    await applyTransactionToWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 700_000 }));
  });

  it("transfer: source decreases, destination increases in a single multi-write tx", async () => {
    const writes = setupIdbUpdateMany([
      makeWallet(1_000_000, "w1"),
      makeWallet(500_000, "w2"),
    ]);

    await applyTransactionToWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2",
    }));

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(writes).toContainEqual(expect.objectContaining({ id: "w1", balance: 800_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ id: "w2", balance: 700_000 }));
  });

  it("skips silently when wallet not found", async () => {
    mockUpdate.mockResolvedValue(null);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(applyTransactionToWallet(makeTx({ type: "income" }))).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("transfer with null destination: falls back to single-wallet applyDelta", async () => {
    const writes = setupIdbUpdate([makeWallet(1_000_000)]);

    await applyTransactionToWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: null,
    }));

    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(writes).toContainEqual(expect.objectContaining({ id: "w1", balance: 800_000 }));
  });

  it("transfer: warns and skips missing wallets while still committing the rest", async () => {
    const writes = setupIdbUpdateMany([makeWallet(1_000_000, "w1")]);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await applyTransactionToWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2_missing",
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("wallet not found: w2_missing"),
    );
    expect(writes).toContainEqual(expect.objectContaining({ id: "w1", balance: 800_000 }));
    expect(writes.find((w) => w.id === "w2_missing")).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe("rollbackTransactionFromWallet", () => {
  it("income rollback: decreases wallet balance", async () => {
    const writes = setupIdbUpdate([makeWallet(1_500_000)]);
    await rollbackTransactionFromWallet(makeTx({ type: "income", amount: 500_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_000_000 }));
  });

  it("expense rollback: increases wallet balance", async () => {
    const writes = setupIdbUpdate([makeWallet(700_000)]);
    await rollbackTransactionFromWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_000_000 }));
  });

  it("transfer rollback: reverses both wallets atomically", async () => {
    const writes = setupIdbUpdateMany([
      makeWallet(800_000, "w1"),
      makeWallet(700_000, "w2"),
    ]);

    await rollbackTransactionFromWallet(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2",
    }));

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(writes).toContainEqual(expect.objectContaining({ id: "w1", balance: 1_000_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ id: "w2", balance: 500_000 }));
  });

  it("apply then rollback returns original balance", async () => {
    const applyWrites = setupIdbUpdate([makeWallet(1_000_000)]);
    await applyTransactionToWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(applyWrites[0].balance).toBe(700_000);

    const rollbackWrites = setupIdbUpdate([makeWallet(700_000)]);
    await rollbackTransactionFromWallet(makeTx({ type: "expense", amount: 300_000 }));
    expect(rollbackWrites[0].balance).toBe(1_000_000);
  });
});

describe("applyLoanEntryToWallet", () => {
  it("give: decreases wallet balance (user paid out)", async () => {
    const writes = setupIdbUpdate([makeWallet(1_000_000)]);
    await applyLoanEntryToWallet(makeLoanEntry({ type: "give", amount: 200_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 800_000 }));
  });

  it("get: increases wallet balance (user received)", async () => {
    const writes = setupIdbUpdate([makeWallet(1_000_000)]);
    await applyLoanEntryToWallet(makeLoanEntry({ type: "get", amount: 200_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_200_000 }));
  });

  it("skips when wallet_id is null", async () => {
    await applyLoanEntryToWallet(makeLoanEntry({ type: "give", wallet_id: null }));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});

describe("rollbackLoanEntryFromWallet", () => {
  it("give rollback: increases wallet balance", async () => {
    const writes = setupIdbUpdate([makeWallet(800_000)]);
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "give", amount: 200_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_000_000 }));
  });

  it("get rollback: decreases wallet balance", async () => {
    const writes = setupIdbUpdate([makeWallet(1_200_000)]);
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "get", amount: 200_000 }));
    expect(writes).toContainEqual(expect.objectContaining({ balance: 1_000_000 }));
  });

  it("skips when wallet_id is null", async () => {
    await rollbackLoanEntryFromWallet(makeLoanEntry({ type: "give", wallet_id: null }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
}

describe("localStorage backend (STORAGE_BACKEND !== 'idb')", () => {
  let mockStorage: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    mockStorage = makeLocalStorageMock();
    expect(mockStorage.getItem("__nonexistent__")).toBeNull();
    Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: mockStorage, writable: true, configurable: true });
    vi.resetModules();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  it("income: reads wallet from localStorage and writes updated balance back", async () => {
    vi.doMock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "localstorage" }));
    vi.doMock("@/lib/storage/idb-client", () => ({
      idbUpdate: vi.fn(),
      idbUpdateMany: vi.fn(),
    }));
    const { applyTransactionToWallet: applyTx } = await import("./wallet-balance-ops");

    const wallet = makeWallet(1_000_000);
    globalThis.localStorage.setItem("wallets", JSON.stringify([wallet]));

    await applyTx(makeTx({ type: "income", amount: 500_000 }));

    const stored = JSON.parse(globalThis.localStorage.getItem("wallets")!) as Wallet[];
    expect(stored[0].balance).toBe(1_500_000);
  });

  it("expense: decreases balance in localStorage", async () => {
    vi.doMock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "localstorage" }));
    vi.doMock("@/lib/storage/idb-client", () => ({
      idbUpdate: vi.fn(),
      idbUpdateMany: vi.fn(),
    }));
    const { applyTransactionToWallet: applyTx } = await import("./wallet-balance-ops");

    const wallet = makeWallet(1_000_000);
    globalThis.localStorage.setItem("wallets", JSON.stringify([wallet]));

    await applyTx(makeTx({ type: "expense", amount: 300_000 }));

    const stored = JSON.parse(globalThis.localStorage.getItem("wallets")!) as Wallet[];
    expect(stored[0].balance).toBe(700_000);
  });

  it("transfer: both wallets updated in a single localStorage write", async () => {
    vi.doMock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "localstorage" }));
    vi.doMock("@/lib/storage/idb-client", () => ({
      idbUpdate: vi.fn(),
      idbUpdateMany: vi.fn(),
    }));
    const { applyTransactionToWallet: applyTx } = await import("./wallet-balance-ops");

    const w1 = makeWallet(1_000_000, "w1");
    const w2 = makeWallet(500_000, "w2");
    globalThis.localStorage.setItem("wallets", JSON.stringify([w1, w2]));

    await applyTx(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2",
    }));

    const stored = JSON.parse(globalThis.localStorage.getItem("wallets")!) as Wallet[];
    expect(stored.find((w) => w.id === "w1")!.balance).toBe(800_000);
    expect(stored.find((w) => w.id === "w2")!.balance).toBe(700_000);
  });

  it("transfer in localStorage: warns when destination wallet is missing, still applies source", async () => {
    vi.doMock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "localstorage" }));
    vi.doMock("@/lib/storage/idb-client", () => ({
      idbUpdate: vi.fn(),
      idbUpdateMany: vi.fn(),
    }));
    const { applyTransactionToWallet: applyTx } = await import("./wallet-balance-ops");

    const w1 = makeWallet(1_000_000, "w1");
    globalThis.localStorage.setItem("wallets", JSON.stringify([w1]));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await applyTx(makeTx({
      type: "transfer",
      amount: 200_000,
      destination_wallet_id: "w2_missing",
    }));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("wallet not found: w2_missing"),
    );
    const stored = JSON.parse(globalThis.localStorage.getItem("wallets")!) as Wallet[];
    expect(stored.find((w) => w.id === "w1")!.balance).toBe(800_000);
    warnSpy.mockRestore();
  });

  it("skips silently when wallet not found in localStorage (idx === -1)", async () => {
    vi.doMock("@/lib/storage/config", () => ({ STORAGE_BACKEND: "localstorage" }));
    vi.doMock("@/lib/storage/idb-client", () => ({
      idbUpdate: vi.fn(),
      idbUpdateMany: vi.fn(),
    }));
    const { applyTransactionToWallet: applyTx } = await import("./wallet-balance-ops");

    globalThis.localStorage.setItem("wallets", JSON.stringify([]));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(applyTx(makeTx({ type: "income" }))).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
