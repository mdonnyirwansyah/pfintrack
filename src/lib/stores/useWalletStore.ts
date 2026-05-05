"use client";

import { create } from "zustand";
import type { Wallet } from "@/lib/types/wallet";
import { walletsRepo, type CreateWalletInput, type UpdateWalletInput } from "@/lib/storage/wallets";

interface WalletState {
  wallets: Wallet[];
  isLoading: boolean;
}

interface WalletActions {
  /** Load active wallets from localStorage via walletsRepo */
  loadWallets: () => void;

  /** Create a wallet and refresh state. Writes balance history if initial balance > 0. */
  createWallet: (input: CreateWalletInput) => Wallet;

  /** Update a wallet's name, type, currency, or sort_order. */
  updateWallet: (id: string, patch: UpdateWalletInput) => Wallet;

  /** Soft-delete a wallet. Does NOT write balance history. */
  softDeleteWallet: (id: string) => void;

  /** Check if a name is already used by an active wallet (case-insensitive).
   *  Pass excludeId to skip a wallet when editing. */
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()((set, get) => ({
  wallets: [],
  isLoading: true,

  loadWallets() {
    set({ isLoading: true });
    const wallets = walletsRepo.getAll();
    set({ wallets, isLoading: false });
  },

  createWallet(input) {
    const wallet = walletsRepo.create(input);
    const wallets = walletsRepo.getAll();
    set({ wallets });
    return wallet;
  },

  updateWallet(id, patch) {
    const updated = walletsRepo.update(id, patch);
    const wallets = walletsRepo.getAll();
    set({ wallets });
    return updated;
  },

  softDeleteWallet(id) {
    walletsRepo.softDelete(id);
    const wallets = walletsRepo.getAll();
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
