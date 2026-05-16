import { generateUUID } from "@/lib/bootstrap/anon-id";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import {
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
  idbPutAll,
  idbUpdate,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateWalletBalanceHistoryInput } from "./wallet-balance-history";

const STORE = "wallet_balance_history" as const;

export const walletBalanceHistoryIdbRepo = {
  async getAll(): Promise<WalletBalanceHistory[]> {
    const all = await idbGetAll<WalletBalanceHistory>(STORE);
    return all.filter((r) => r.is_active);
  },

  async getAllIncludingInactive(): Promise<WalletBalanceHistory[]> {
    return idbGetAll<WalletBalanceHistory>(STORE);
  },

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
      id: generateUUID(),
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

  async softDelete(id: string): Promise<void> {
    await idbUpdate<WalletBalanceHistory>(STORE, id, (existing) => ({
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }));
  },

  async putAll(records: WalletBalanceHistory[]): Promise<void> {
    await idbPutAll<WalletBalanceHistory>(STORE, records);
  },
};
