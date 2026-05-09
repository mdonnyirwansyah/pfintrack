"use client";

import { create } from "zustand";
import type { Transaction } from "@/lib/types/transaction";
import {
  transactionsRepo,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/storage/transactions";
import {
  applyTransactionToWallet,
  rollbackTransactionFromWallet,
} from "@/lib/storage/wallet-balance-ops";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import { useWalletStore } from "./useWalletStore";

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
}

interface TransactionActions {
  loadTransactions: () => Promise<void>;
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, patch: UpdateTransactionInput) => Promise<Transaction>;
  softDeleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

type TransactionStore = TransactionState & TransactionActions;

export const useTransactionStore = create<TransactionStore>()((set) => ({
  transactions: [],
  isLoading: true,

  async loadTransactions() {
    set({ isLoading: true });
    const transactions = await transactionsRepo.getAll();
    set({ transactions, isLoading: false });
  },

  async createTransaction(input) {
    const tx = await transactionsRepo.create(input);
    await applyTransactionToWallet(tx);
    const transactions = await transactionsRepo.getAll();
    set({ transactions });
    await useWalletStore.getState().loadWallets();
    return tx;
  },

  async updateTransaction(id, patch) {
    const old = await transactionsRepo.getById(id);
    if (!old) throw new Error(`Transaction not found: ${id}`);

    await rollbackTransactionFromWallet(old);
    const updated = await transactionsRepo.update(id, patch);
    await applyTransactionToWallet(updated);

    // Keep wallet_balance_history in sync when editing a Balance Correction tx
    if (old.category === "Balance Correction") {
      const oldDelta = old.type === "income" ? old.amount : -old.amount;
      const newDelta = updated.type === "income" ? updated.amount : -updated.amount;
      if (oldDelta !== newDelta) {
        const history = await walletBalanceHistoryRepo.getByWalletId(old.wallet_id);
        const match = history
          .filter(
            (h) =>
              h.is_active &&
              h.delta === oldDelta &&
              h.corrected_at.startsWith(old.transaction_date),
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        if (match) {
          await walletBalanceHistoryRepo.update(match.id, {
            delta: newDelta,
            new_balance: match.previous_balance + newDelta,
          });
        }
      }
    }

    const transactions = await transactionsRepo.getAll();
    set({ transactions });
    await useWalletStore.getState().loadWallets();
    return updated;
  },

  async softDeleteTransaction(id) {
    const tx = await transactionsRepo.getById(id);
    if (!tx) throw new Error(`Transaction not found: ${id}`);

    // When deleting a Balance Correction, also soft-delete the matching history record
    // so the Report module no longer counts it in calcBalanceCorrection.
    if (tx.category === "Balance Correction") {
      const expectedDelta = tx.type === "income" ? tx.amount : -tx.amount;
      const history = await walletBalanceHistoryRepo.getByWalletId(tx.wallet_id);
      const match = history
        .filter(
          (h) =>
            h.is_active &&
            h.delta === expectedDelta &&
            h.corrected_at.startsWith(tx.transaction_date),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      if (match) await walletBalanceHistoryRepo.softDelete(match.id);
    }

    await rollbackTransactionFromWallet(tx);
    await transactionsRepo.softDelete(id);

    const transactions = await transactionsRepo.getAll();
    set({ transactions });
    await useWalletStore.getState().loadWallets();
  },

  async refreshTransactions() {
    const transactions = await transactionsRepo.getAll();
    set({ transactions });
  },
}));

export function selectByDate(transactions: Transaction[], date: string): Transaction[] {
  return transactions
    .filter((t) => t.is_active && t.transaction_date === date)
    .sort((a, b) => {
      const timeCompare = b.transaction_time.localeCompare(a.transaction_time);
      if (timeCompare !== 0) return timeCompare;
      return b.created_at.localeCompare(a.created_at);
    });
}

export function computeDailySummary(transactions: Transaction[]): {
  income: number;
  expenses: number;
  balance: number;
} {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.category === "Balance Correction") continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
  }
  return { income, expenses, balance: income - expenses };
}

export function getTitleSuggestions(
  transactions: Transaction[],
  type: "income" | "expense"
): Array<{ title: string; category: string }> {
  const seen = new Map<string, { title: string; category: string }>();
  const sorted = [...transactions]
    .filter((t) => t.type === type && t.is_active && t.title && t.category && t.title !== "Balance Correction")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const t of sorted) {
    const key = `${t.title}||${t.category}`;
    if (!seen.has(key) && t.title && t.category) {
      seen.set(key, { title: t.title, category: t.category });
    }
    if (seen.size >= 8) break;
  }

  return Array.from(seen.values());
}

const DEFAULT_EXPENSE_CATEGORIES: Record<string, string[]> = {
  id: ["Makanan & Minuman", "Transportasi", "Tagihan", "Belanja", "Kesehatan", "Hiburan", "Pendidikan", "Lainnya"],
  en: ["Food & Drinks", "Transportation", "Bills", "Shopping", "Health", "Entertainment", "Education", "Other"],
};

const DEFAULT_INCOME_CATEGORIES: Record<string, string[]> = {
  id: ["Gaji", "Freelance", "Bisnis", "Investasi", "Bonus", "Hadiah", "Pendapatan Lain", "Lainnya"],
  en: ["Salary", "Freelance", "Business", "Investment", "Bonus", "Gift", "Other Income", "Other"],
};

export function getCategorySuggestions(
  transactions: Transaction[],
  type: "income" | "expense",
  locale = "id"
): string[] {
  const seen = new Set<string>();
  const sorted = [...transactions]
    .filter((t) => t.type === type && t.is_active && t.category && t.category !== "Balance Correction")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const t of sorted) {
    if (t.category && !seen.has(t.category)) {
      seen.add(t.category);
    }
    if (seen.size >= 8) break;
  }

  if (seen.size === 0) {
    const map = type === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
    const defaults = map[locale] ?? map["id"];
    return defaults;
  }

  return Array.from(seen);
}
