"use client";

import { create } from "zustand";
import type { Wallet } from "@/lib/types/wallet";
import { walletsRepo, type CreateWalletInput, type UpdateWalletInput } from "@/lib/storage/wallets";

interface WalletState {
  wallets: Wallet[];
  isLoading: boolean;
}

interface WalletActions {
  loadWallets: () => Promise<void>;

  createWallet: (input: CreateWalletInput) => Promise<Wallet>;

  updateWallet: (id: string, patch: UpdateWalletInput) => Promise<Wallet>;

  softDeleteWallet: (id: string) => Promise<void>;

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
