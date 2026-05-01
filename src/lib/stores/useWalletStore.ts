"use client";

import { create } from "zustand";
import type { Wallet } from "@/lib/types/wallet";
import { walletsRepo, type CreateWalletInput, type UpdateWalletInput } from "@/lib/storage/wallets";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";

interface WalletState {
  wallets: Wallet[];
  isLoading: boolean;
}

interface WalletActions {
  /** Load active wallets from localStorage via walletsRepo */
  loadWallets: () => void;

  /** Create a wallet and refresh state. Does NOT write balance history. */
  createWallet: (input: CreateWalletInput) => Wallet;

  /**
   * Update a wallet. If balance changed, writes to wallet_balance_history.
   * This is the ONLY place that writes wallet_balance_history.
   */
  updateWallet: (id: string, patch: UpdateWalletInput, previousBalance: number) => Wallet;

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
    // Reload all to keep sort_order consistent
    const wallets = walletsRepo.getAll();
    set({ wallets });
    return wallet;
  },

  updateWallet(id, patch, previousBalance) {
    const updated = walletsRepo.update(id, patch);

    // Write balance history ONLY if balance actually changed
    const newBalance = patch.balance;
    if (newBalance !== undefined && newBalance !== previousBalance) {
      walletBalanceHistoryRepo.create({
        wallet_id: id,
        previous_balance: previousBalance,
        new_balance: newBalance,
      });
    }

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
