import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { idbGetAllByIndex, idbPut, idbPutAll } from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateWalletBalanceHistoryInput } from "./wallet-balance-history";

const STORE = "wallet_balance_history" as const;

export const walletBalanceHistoryIdbRepo = {
  /** Returns only is_active=true records */
  async getAll(): Promise<WalletBalanceHistory[]> {
    return idbGetAllByIndex<WalletBalanceHistory>(
      STORE,
      "by_is_active",
      true as unknown as IDBValidKey,
    );
  },

  /** Get all active history records for a specific wallet */
  async getByWalletId(walletId: string): Promise<WalletBalanceHistory[]> {
    const records = await idbGetAllByIndex<WalletBalanceHistory>(
      STORE,
      "by_wallet_id",
      walletId,
    );
    return records.filter((r) => r.is_active);
  },

  async create(input: CreateWalletBalanceHistoryInput): Promise<WalletBalanceHistory> {
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

    await idbPut<WalletBalanceHistory>(STORE, record);
    return record;
  },

  /** For migration runner — bulk-write records without transformation */
  async putAll(records: WalletBalanceHistory[]): Promise<void> {
    await idbPutAll<WalletBalanceHistory>(STORE, records);
  },
};
