/**
 * Repository for wallet_balance_history.
 *
 * CRITICAL: This key MUST ONLY be written when a user manually edits
 * wallet.balance via the Edit Wallet screen (/wallet/[id]).
 *
 * It MUST NOT be written by:
 *  - Add Wallet (initial balance)
 *  - Transactions module (income/expense/transfer)
 *  - Loan module (give/get)
 *  - Soft delete of a wallet
 *
 * Used by Module Report to compute Balance Correction per period.
 */
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";

const KEY = "wallet_balance_history";

export type CreateWalletBalanceHistoryInput = {
  wallet_id: string;
  previous_balance: number;
  new_balance: number;
};

export type UpdateWalletBalanceHistoryInput = Partial<
  Pick<WalletBalanceHistory, "is_active">
>;

export const walletBalanceHistoryRepo = {
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
