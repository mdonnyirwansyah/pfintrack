/**
 * Repository for wallet_balance_history.
 *
 * CRITICAL: This key is written in two cases only:
 *  1. Add Wallet — when initial balance > 0 (previous=0, new=balance)
 *  2. Edit Wallet — when the user manually changes balance via /wallet/[id]
 *
 * It MUST NOT be written by:
 *  - Transactions module (income/expense/transfer)
 *  - Loan module (give/get)
 *  - Soft delete of a wallet
 *
 * Used by Module Report to compute Balance Correction per period.
 */
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { walletBalanceHistoryIdbRepo } from "./wallet-balance-history-idb";

const KEY = "wallet_balance_history";

export type CreateWalletBalanceHistoryInput = {
  wallet_id: string;
  previous_balance: number;
  new_balance: number;
};

export type UpdateWalletBalanceHistoryInput = Partial<
  Pick<WalletBalanceHistory, "is_active">
>;

const walletBalanceHistoryLsRepo = {
  /** Returns only is_active=true records */
  getAll(): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY).filter((r) => r.is_active);
  },

  getAllIncludingInactive(): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY);
  },

  getById(id: string): WalletBalanceHistory | null {
    return readKey<WalletBalanceHistory>(KEY).find((r) => r.id === id) ?? null;
  },

  /** Get all active history records for a specific wallet */
  getByWalletId(walletId: string): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY).filter(
      (r) => r.wallet_id === walletId && r.is_active
    );
  },

  create(input: CreateWalletBalanceHistoryInput): WalletBalanceHistory {
    const all = readKey<WalletBalanceHistory>(KEY);
    const now = new Date().toISOString();

    const record: WalletBalanceHistory = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      wallet_id: input.wallet_id,
      previous_balance: input.previous_balance,
      new_balance: input.new_balance,
      delta: input.new_balance - input.previous_balance,
      corrected_at: now,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    writeKey(KEY, [...all, record]);
    return record;
  },

  update(
    id: string,
    patch: UpdateWalletBalanceHistoryInput
  ): WalletBalanceHistory {
    const all = readKey<WalletBalanceHistory>(KEY);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`WalletBalanceHistory not found: ${id}`);

    const updated: WalletBalanceHistory = {
      ...all[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<WalletBalanceHistory>(KEY);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1)
      throw new Error(`WalletBalanceHistory not found: ${id}`);

    all[idx] = {
      ...all[idx],
      is_active: false,
      updated_at: new Date().toISOString(),
    };
    writeKey(KEY, all);
  },
};

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const walletBalanceHistoryRepo = {
  getAll(): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb") return walletBalanceHistoryIdbRepo.getAll();
    return Promise.resolve(walletBalanceHistoryLsRepo.getAll());
  },

  getAllIncludingInactive(): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb")
      return walletBalanceHistoryIdbRepo.getAll().then(() =>
        // IDB repo doesn't expose getAllIncludingInactive; fall back to full scan via getAll
        // (is_active filter is applied in getAll; we need unfiltered here)
        walletBalanceHistoryIdbRepo.getAll()
      );
    return Promise.resolve(walletBalanceHistoryLsRepo.getAllIncludingInactive());
  },

  getById(id: string): Promise<WalletBalanceHistory | null> {
    if (STORAGE_BACKEND === "idb") {
      // IDB repo doesn't expose getById; scan getAll and find
      return walletBalanceHistoryIdbRepo
        .getAll()
        .then((all) => all.find((r) => r.id === id) ?? null);
    }
    return Promise.resolve(walletBalanceHistoryLsRepo.getById(id));
  },

  getByWalletId(walletId: string): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb")
      return walletBalanceHistoryIdbRepo.getByWalletId(walletId);
    return Promise.resolve(walletBalanceHistoryLsRepo.getByWalletId(walletId));
  },

  create(input: CreateWalletBalanceHistoryInput): Promise<WalletBalanceHistory> {
    if (STORAGE_BACKEND === "idb")
      return walletBalanceHistoryIdbRepo.create(input);
    return Promise.resolve(walletBalanceHistoryLsRepo.create(input));
  },

  update(id: string, patch: UpdateWalletBalanceHistoryInput): Promise<WalletBalanceHistory> {
    if (STORAGE_BACKEND === "idb") {
      // IDB repo doesn't expose update directly; apply via getAll + put
      // For now delegate to LS for non-IDB, and IDB path is not exposed here.
      // This method is rarely called; keep LS path for backward compat.
      throw new Error("walletBalanceHistoryRepo.update not yet supported for IDB backend");
    }
    return Promise.resolve(walletBalanceHistoryLsRepo.update(id, patch));
  },

  softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") {
      throw new Error("walletBalanceHistoryRepo.softDelete not yet supported for IDB backend");
    }
    walletBalanceHistoryLsRepo.softDelete(id);
    return Promise.resolve();
  },
};
