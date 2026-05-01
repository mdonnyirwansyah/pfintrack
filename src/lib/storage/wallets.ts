import type { Wallet, WalletType } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";

const KEY = "wallets";

export type CreateWalletInput = {
  name: string;
  wallet_type: WalletType;
  balance: number;
  currency?: string;
  sort_order?: number;
};

export type UpdateWalletInput = Partial<
  Pick<Wallet, "name" | "wallet_type" | "balance" | "currency" | "sort_order">
>;

export const walletsRepo = {
  /** Returns only is_active=true records */
  getAll(): Wallet[] {
    return readKey<Wallet>(KEY).filter((w) => w.is_active);
  },

  getAllIncludingInactive(): Wallet[] {
    return readKey<Wallet>(KEY);
  },

  getById(id: string): Wallet | null {
    return readKey<Wallet>(KEY).find((w) => w.id === id) ?? null;
  },

  create(input: CreateWalletInput): Wallet {
    const all = readKey<Wallet>(KEY);
    const now = new Date().toISOString();

    const wallet: Wallet = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name,
      wallet_type: input.wallet_type,
      balance: input.balance,
      currency: input.currency ?? "IDR",
      sort_order: input.sort_order ?? all.filter((w) => w.is_active).length + 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    writeKey(KEY, [...all, wallet]);
    return wallet;
  },

  update(id: string, patch: UpdateWalletInput): Wallet {
    const all = readKey<Wallet>(KEY);
    const idx = all.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error(`Wallet not found: ${id}`);

    const updated: Wallet = {
      ...all[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<Wallet>(KEY);
    const idx = all.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error(`Wallet not found: ${id}`);

    all[idx] = {
      ...all[idx],
      is_active: false,
      updated_at: new Date().toISOString(),
    };
    writeKey(KEY, all);
  },
};
