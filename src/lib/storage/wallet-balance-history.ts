import { generateUUID } from "@/lib/bootstrap/anon-id";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { walletBalanceHistoryIdbRepo } from "./wallet-balance-history-idb";
import { idbPut } from "./idb-client";

const KEY = "wallet_balance_history";

export type CreateWalletBalanceHistoryInput = {
  wallet_id: string;
  previous_balance: number;
  new_balance: number;
};

export type UpdateWalletBalanceHistoryInput = Partial<
  Pick<WalletBalanceHistory, "is_active" | "delta" | "new_balance">
>;

const walletBalanceHistoryLsRepo = {
  getAll(): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY).filter((r) => r.is_active);
  },

  getAllIncludingInactive(): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY);
  },

  getById(id: string): WalletBalanceHistory | null {
    return readKey<WalletBalanceHistory>(KEY).find((r) => r.id === id) ?? null;
  },

  getByWalletId(walletId: string): WalletBalanceHistory[] {
    return readKey<WalletBalanceHistory>(KEY).filter(
      (r) => r.wallet_id === walletId && r.is_active
    );
  },

  create(input: CreateWalletBalanceHistoryInput): WalletBalanceHistory {
    const all = readKey<WalletBalanceHistory>(KEY);
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

export const walletBalanceHistoryRepo = {
  async getAll(): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb") return walletBalanceHistoryIdbRepo.getAll();
    return walletBalanceHistoryLsRepo.getAll();
  },

  async getAllIncludingInactive(): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb") return walletBalanceHistoryIdbRepo.getAllIncludingInactive();
    return walletBalanceHistoryLsRepo.getAllIncludingInactive();
  },

  async getById(id: string): Promise<WalletBalanceHistory | null> {
    if (STORAGE_BACKEND === "idb") {
      const all = await walletBalanceHistoryIdbRepo.getAll();
      return all.find((r) => r.id === id) ?? null;
    }
    return walletBalanceHistoryLsRepo.getById(id);
  },

  async getByWalletId(walletId: string): Promise<WalletBalanceHistory[]> {
    if (STORAGE_BACKEND === "idb")
      return walletBalanceHistoryIdbRepo.getByWalletId(walletId);
    return walletBalanceHistoryLsRepo.getByWalletId(walletId);
  },

  async create(input: CreateWalletBalanceHistoryInput): Promise<WalletBalanceHistory> {
    if (STORAGE_BACKEND === "idb")
      return walletBalanceHistoryIdbRepo.create(input);
    return walletBalanceHistoryLsRepo.create(input);
  },

  async update(id: string, patch: UpdateWalletBalanceHistoryInput): Promise<WalletBalanceHistory> {
    if (STORAGE_BACKEND === "idb") {
      const all = await walletBalanceHistoryIdbRepo.getAllIncludingInactive();
      const existing = all.find((r) => r.id === id);
      if (!existing) throw new Error(`WalletBalanceHistory not found: ${id}`);
      const updated: WalletBalanceHistory = {
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      await idbPut<WalletBalanceHistory>("wallet_balance_history", updated);
      return updated;
    }
    return walletBalanceHistoryLsRepo.update(id, patch);
  },

  async softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return walletBalanceHistoryIdbRepo.softDelete(id);
    walletBalanceHistoryLsRepo.softDelete(id);
  },
};
