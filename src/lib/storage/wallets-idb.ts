import { generateUUID } from "@/lib/bootstrap/anon-id";
import type { Wallet } from "@/lib/types/wallet";
import {
  idbGet,
  idbGetAll,
  idbPut,
  idbPutAll,
  idbUpdate,
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
    const now = new Date().toISOString();

    const wallet: Wallet = {
      id: generateUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name,
      wallet_type: input.wallet_type,
      balance: input.balance,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    await idbPut<Wallet>(STORE, wallet);
    return wallet;
  },

  async update(id: string, patch: UpdateWalletInput): Promise<Wallet> {
    const updated = await idbUpdate<Wallet>(STORE, id, (existing) => ({
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`Wallet not found: ${id}`);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const updated = await idbUpdate<Wallet>(STORE, id, (existing) => ({
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`Wallet not found: ${id}`);
  },

  async putAll(records: Wallet[]): Promise<void> {
    await idbPutAll<Wallet>(STORE, records);
  },
};
