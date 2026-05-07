import type { Wallet, WalletType } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { walletsIdbRepo } from "./wallets-idb";

const KEY = "wallets";

export type CreateWalletInput = {
  name: string;
  wallet_type: WalletType;
  balance: number;
  currency?: string;
  sort_order?: number;
};

export type UpdateWalletInput = Partial<
  Pick<Wallet, "name" | "wallet_type" | "currency" | "sort_order">
>;

const walletsLsRepo = {
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

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const walletsRepo = {
  getAll(): Promise<Wallet[]> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getAll();
    return Promise.resolve(walletsLsRepo.getAll());
  },

  getAllIncludingInactive(): Promise<Wallet[]> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getAllIncludingInactive();
    return Promise.resolve(walletsLsRepo.getAllIncludingInactive());
  },

  getById(id: string): Promise<Wallet | null> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getById(id);
    return Promise.resolve(walletsLsRepo.getById(id));
  },

  create(input: CreateWalletInput): Promise<Wallet> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.create(input);
    return Promise.resolve(walletsLsRepo.create(input));
  },

  update(id: string, patch: UpdateWalletInput): Promise<Wallet> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.update(id, patch);
    return Promise.resolve(walletsLsRepo.update(id, patch));
  },

  softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.softDelete(id);
    walletsLsRepo.softDelete(id);
    return Promise.resolve();
  },
};
