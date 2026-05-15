import { generateUUID } from "@/lib/bootstrap/anon-id";
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
};

export type UpdateWalletInput = Partial<
  Pick<Wallet, "name" | "wallet_type">
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
      id: generateUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name,
      wallet_type: input.wallet_type,
      balance: input.balance,
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
  async getAll(): Promise<Wallet[]> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getAll();
    return walletsLsRepo.getAll();
  },

  async getAllIncludingInactive(): Promise<Wallet[]> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getAllIncludingInactive();
    return walletsLsRepo.getAllIncludingInactive();
  },

  async getById(id: string): Promise<Wallet | null> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.getById(id);
    return walletsLsRepo.getById(id);
  },

  async create(input: CreateWalletInput): Promise<Wallet> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.create(input);
    return walletsLsRepo.create(input);
  },

  async update(id: string, patch: UpdateWalletInput): Promise<Wallet> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.update(id, patch);
    return walletsLsRepo.update(id, patch);
  },

  async softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return walletsIdbRepo.softDelete(id);
    walletsLsRepo.softDelete(id);
  },
};
