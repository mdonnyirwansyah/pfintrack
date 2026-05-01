import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletBalanceHistory } from "@/lib/types/wallet";

interface WalletHistoryState {
  history: WalletBalanceHistory[];
}

interface WalletHistoryActions {
  addHistoryEntry: (entry: WalletBalanceHistory) => void;
  setHistory: (history: WalletBalanceHistory[]) => void;
}

type WalletHistoryStore = WalletHistoryState & WalletHistoryActions;

export const useWalletHistoryStore = create<WalletHistoryStore>()(
  persist(
    (set) => ({
      history: [],

      setHistory: (history) => set({ history }),

      addHistoryEntry: (entry) =>
        set((state) => ({ history: [...state.history, entry] })),
    }),
    {
      name: "wallet_balance_history",
      version: 1,
    }
  )
);
