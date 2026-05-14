"use client";

import { create } from "zustand";
import type { Wallet } from "@/lib/types/wallet";
import { walletsRepo, type CreateWalletInput, type UpdateWalletInput } from "@/lib/storage/wallets";

interface WalletState {
  wallets: Wallet[];
  isLoading: boolean;
}

interface WalletActions {
  /** Load active wallets from storage via walletsRepo */
  loadWallets: () => Promise<void>;

  /** Create a wallet and refresh state. Writes balance history if initial balance > 0. */
  createWallet: (input: CreateWalletInput) => Promise<Wallet>;

  /** Update a wallet's name or type. */
  updateWallet: (id: string, patch: UpdateWalletInput) => Promise<Wallet>;

  /** Soft-delete a wallet. Does NOT write balance history. */
  softDeleteWallet: (id: string) => Promise<void>;

  /** Check if a name is already used by an active wallet (case-insensitive).
   *  Pass excludeId to skip a wallet when editing. */
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()((set, get) => ({
  wallets: [],
  isLoading: true,

  async loadWallets() {
    set({ isLoading: true });
    const wallets = await walletsRepo.getAll();
    set({ wallets, isLoading: false });
  },

  async createWallet(input) {
    const wallet = await walletsRepo.create(input);
    const wallets = await walletsRepo.getAll();
    set({ wallets });
    return wallet;
  },

  async updateWallet(id, patch) {
    const updated = await walletsRepo.update(id, patch);
    const wallets = await walletsRepo.getAll();
    set({ wallets });
    return updated;
  },

  async softDeleteWallet(id) {
    await walletsRepo.softDelete(id);
    const wallets = await walletsRepo.getAll();
    set({ wallets });
  },

  isNameTaken(name, excludeId) {
    const normalized = name.trim().toLowerCase();
    return get().wallets.some(
      (w) =>
        w.is_active &&
        w.name.toLowerCase() === normalized &&
        w.id !== excludeId
    );
  },
}));
