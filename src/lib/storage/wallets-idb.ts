import type { Wallet } from "@/lib/types/wallet";
import {
  idbGet,
  idbGetAll,
  idbPut,
  idbPutAll,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateWalletInput, UpdateWalletInput } from "./wallets";

const STORE = "wallets" as const;

export const walletsIdbRepo = {
  /** Returns only is_active=true records */
  async getAll(): Promise<Wallet[]> {
    const all = await idbGetAll<Wallet>(STORE);
    return all.filter((w) => w.is_active);
  },

  async getAllIncludingInactive(): Promise<Wallet[]> {
    return idbGetAll<Wallet>(STORE);
  },

  async getById(id: string): Promise<Wallet | null> {
    const result = await idbGet<Wallet>(STORE, id);
    return result ?? null;
  },

  async create(input: CreateWalletInput): Promise<Wallet> {
    const activeWallets = await walletsIdbRepo.getAll();
    const now = new Date().toISOString();

    const wallet: Wallet = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name,
      wallet_type: input.wallet_type,
      balance: input.balance,
      currency: input.currency ?? "IDR",
      sort_order: input.sort_order ?? activeWallets.length + 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    await idbPut<Wallet>(STORE, wallet);
    return wallet;
  },

  async update(id: string, patch: UpdateWalletInput): Promise<Wallet> {
    const existing = await idbGet<Wallet>(STORE, id);
    if (!existing) throw new Error(`Wallet not found: ${id}`);

    const updated: Wallet = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    await idbPut<Wallet>(STORE, updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await idbGet<Wallet>(STORE, id);
    if (!existing) throw new Error(`Wallet not found: ${id}`);

    const deleted: Wallet = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    await idbPut<Wallet>(STORE, deleted);
  },

  async putAll(records: Wallet[]): Promise<void> {
    await idbPutAll<Wallet>(STORE, records);
  },
};
