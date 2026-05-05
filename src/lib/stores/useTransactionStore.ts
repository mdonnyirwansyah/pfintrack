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
import { useWalletStore } from "./useWalletStore";

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
}

interface TransactionActions {
  /** Load all active transactions from localStorage */
  loadTransactions: () => void;

  /**
   * Create a new transaction and apply its effect to wallet balance.
   * NEVER writes to wallet_balance_history.
   */
  createTransaction: (input: CreateTransactionInput) => Transaction;

  /**
   * Update a transaction:
   * 1. Rollback old transaction effect from wallet
   * 2. Apply new transaction effect to wallet
   * 3. Persist updated record
   * NEVER writes to wallet_balance_history.
   */
  updateTransaction: (id: string, patch: UpdateTransactionInput) => Transaction;

  /**
   * Soft-delete a transaction:
   * 1. Rollback transaction effect from wallet
   * 2. Set is_active = false
   * NEVER writes to wallet_balance_history.
   */
  softDeleteTransaction: (id: string) => void;

  /** Refresh store from localStorage (e.g. after external wallet changes) */
  refreshTransactions: () => void;
}

type TransactionStore = TransactionState & TransactionActions;

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  transactions: [],
  isLoading: true,

  loadTransactions() {
    set({ isLoading: true });
    const transactions = transactionsRepo.getAll();
    set({ transactions, isLoading: false });
  },

  createTransaction(input) {
    const tx = transactionsRepo.create(input);
    // Apply wallet balance side-effect (§6.3 — NEVER writes wallet_balance_history)
    applyTransactionToWallet(tx);
    // Reload from storage to keep state in sync
    const transactions = transactionsRepo.getAll();
    set({ transactions });
    useWalletStore.getState().loadWallets();
    return tx;
  },

  updateTransaction(id, patch) {
    // 1. Get old record for rollback
    const old = transactionsRepo.getById(id);
    if (!old) throw new Error(`Transaction not found: ${id}`);

    // 2. Rollback old balance effect
    rollbackTransactionFromWallet(old);

    // 3. Persist the update
    const updated = transactionsRepo.update(id, patch);

    // 4. Apply new balance effect
    applyTransactionToWallet(updated);

    // 5. Refresh store
    const transactions = transactionsRepo.getAll();
    set({ transactions });
    useWalletStore.getState().loadWallets();
    return updated;
  },

  softDeleteTransaction(id) {
    // 1. Get record for rollback
    const tx = transactionsRepo.getById(id);
    if (!tx) throw new Error(`Transaction not found: ${id}`);

    // 2. Rollback balance effect before soft-deleting
    rollbackTransactionFromWallet(tx);

    // 3. Soft delete
    transactionsRepo.softDelete(id);

    // 4. Refresh store
    const transactions = transactionsRepo.getAll();
    set({ transactions });
    useWalletStore.getState().loadWallets();
  },

  refreshTransactions() {
    const transactions = transactionsRepo.getAll();
    set({ transactions });
  },
}));

// Convenience selector: get transactions for a specific date
export function selectByDate(transactions: Transaction[], date: string): Transaction[] {
  return transactions
    .filter((t) => t.is_active && t.transaction_date === date)
    .sort((a, b) => {
      // Sort DESC by transaction_time, then by created_at
      const timeCompare = b.transaction_time.localeCompare(a.transaction_time);
      if (timeCompare !== 0) return timeCompare;
      return b.created_at.localeCompare(a.created_at);
    });
}

// Convenience: compute daily summary
export function computeDailySummary(transactions: Transaction[]): {
  income: number;
  expenses: number;
  balance: number;
} {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
    // transfer is neutral — not counted
  }
  return { income, expenses, balance: income - expenses };
}

// Get suggestion chips from transaction history
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

export function getCategorySuggestions(
  transactions: Transaction[],
  type: "income" | "expense"
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

  return Array.from(seen);
}
