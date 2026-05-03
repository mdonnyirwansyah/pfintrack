"use client";

import { create } from "zustand";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import {
  loanCounterpartiesRepo,
  type CreateLoanCounterpartyInput,
  type UpdateLoanCounterpartyInput,
} from "@/lib/storage/loan-counterparties";
import {
  loanEntriesRepo,
  type CreateLoanEntryInput,
  type UpdateLoanEntryInput,
} from "@/lib/storage/loan-entries";
import {
  applyLoanEntryToWallet,
  rollbackLoanEntryFromWallet,
} from "@/lib/storage/wallet-balance-ops";
import { useWalletStore } from "./useWalletStore";

// ---------------------------------------------------------------------------
// Counterparty store
// ---------------------------------------------------------------------------

interface CounterpartyState {
  counterparties: LoanCounterparty[];
  isLoading: boolean;
}

interface CounterpartyActions {
  /** Load all active counterparties from localStorage */
  loadCounterparties: () => void;

  /** Find existing counterparty by name (case-insensitive) or create a new one */
  findOrCreateCounterparty: (name: string) => LoanCounterparty;

  /** Rename a counterparty */
  renameCounterparty: (id: string, newName: string) => LoanCounterparty;

  /** Mark counterparty as manually paid off */
  markAsPaid: (id: string) => void;

  /**
   * Cascade soft-delete: rollback wallet effects for all active entries,
   * soft-delete all entries, then soft-delete the counterparty itself.
   */
  deleteCounterparty: (id: string) => void;

  /** Check if a name is taken by another active counterparty (case-insensitive) */
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type CounterpartyStore = CounterpartyState & CounterpartyActions;

export const useLoanCounterpartyStore = create<CounterpartyStore>()(
  (set, get) => ({
    counterparties: [],
    isLoading: true,

    loadCounterparties() {
      set({ isLoading: true });
      const counterparties = loanCounterpartiesRepo.getAll();
      set({ counterparties, isLoading: false });
    },

    findOrCreateCounterparty(name) {
      const trimmed = name.trim();
      const existing = loanCounterpartiesRepo.findByName(trimmed);

      if (existing) {
        // Reset manual_paid_off if adding a new entry to a paid-off counterparty
        if (existing.manual_paid_off) {
          const updated = loanCounterpartiesRepo.update(existing.id, {
            manual_paid_off: false,
          });
          const counterparties = loanCounterpartiesRepo.getAll();
          set({ counterparties });
          return updated;
        }
        return existing;
      }

      const created = loanCounterpartiesRepo.create({ name: trimmed });
      const counterparties = loanCounterpartiesRepo.getAll();
      set({ counterparties });
      return created;
    },

    renameCounterparty(id, newName) {
      const updated = loanCounterpartiesRepo.update(id, {
        name: newName.trim(),
      });
      const counterparties = loanCounterpartiesRepo.getAll();
      set({ counterparties });
      return updated;
    },

    markAsPaid(id) {
      loanCounterpartiesRepo.update(id, { manual_paid_off: true });
      const counterparties = loanCounterpartiesRepo.getAll();
      set({ counterparties });
    },

    deleteCounterparty(id) {
      // Rollback wallet effects for all active entries before deleting
      const entries = loanEntriesRepo.getByCounterpartyId(id);
      for (const entry of entries) {
        rollbackLoanEntryFromWallet(entry);
      }

      // Soft-delete all entries for this counterparty
      loanEntriesRepo.softDeleteByCounterpartyId(id);

      // Soft-delete the counterparty
      loanCounterpartiesRepo.softDelete(id);

      const counterparties = loanCounterpartiesRepo.getAll();
      set({ counterparties });
      useWalletStore.getState().loadWallets();
    },

    isNameTaken(name, excludeId) {
      const normalized = name.trim().toLowerCase();
      return get().counterparties.some(
        (c) =>
          c.is_active &&
          c.name.trim().toLowerCase() === normalized &&
          c.id !== excludeId
      );
    },
  })
);

// ---------------------------------------------------------------------------
// Entry store
// ---------------------------------------------------------------------------

interface EntryState {
  entries: LoanEntry[];
  isLoading: boolean;
}

interface EntryActions {
  /** Load all active entries from localStorage */
  loadEntries: () => void;

  /** Load entries for a specific counterparty */
  loadEntriesForCounterparty: (counterpartyId: string) => void;

  /**
   * Create a new loan entry and apply wallet side-effect.
   * Also updates counterparty.updated_at.
   */
  createEntry: (input: {
    counterpartyId: string;
    type: import("@/lib/types/loan").LoanEntryType;
    amount: number;
    wallet_id?: string | null;
    note?: string | null;
    transaction_date: string;
    transaction_time: string;
  }) => LoanEntry;

  /**
   * Update an existing entry: rollback old wallet effect, apply new.
   * Also updates counterparty.updated_at.
   */
  updateEntry: (
    id: string,
    patch: UpdateLoanEntryInput,
    counterpartyId: string
  ) => LoanEntry;

  /**
   * Soft-delete a single entry with wallet rollback.
   * Also updates counterparty.updated_at.
   */
  deleteEntry: (id: string, counterpartyId: string) => void;
}

type EntryStore = EntryState & EntryActions;

export const useLoanEntryStore = create<EntryStore>()((set) => ({
  entries: [],
  isLoading: true,

  loadEntries() {
    set({ isLoading: true });
    const entries = loanEntriesRepo.getAll();
    set({ entries, isLoading: false });
  },

  loadEntriesForCounterparty(counterpartyId) {
    set({ isLoading: true });
    const entries = loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries, isLoading: false });
  },

  createEntry(input) {
    const entry = loanEntriesRepo.create({
      counterparty_id: input.counterpartyId,
      type: input.type,
      amount: input.amount,
      wallet_id: input.wallet_id ?? null,
      note: input.note ?? null,
      transaction_date: input.transaction_date,
      transaction_time: input.transaction_time,
    });

    // Apply wallet side-effect if wallet_id is set
    applyLoanEntryToWallet(entry);

    // Bump counterparty.updated_at
    loanCounterpartiesRepo.update(input.counterpartyId, {});

    const entries = loanEntriesRepo.getByCounterpartyId(input.counterpartyId);
    set({ entries });
    useWalletStore.getState().loadWallets();
    return entry;
  },

  updateEntry(id, patch, counterpartyId) {
    const old = loanEntriesRepo.getById(id);
    if (!old) throw new Error(`LoanEntry not found: ${id}`);

    // Rollback old wallet effect
    rollbackLoanEntryFromWallet(old);

    // Update the entry
    const updated = loanEntriesRepo.update(id, patch);

    // Apply new wallet effect
    applyLoanEntryToWallet(updated);

    // Bump counterparty.updated_at
    loanCounterpartiesRepo.update(counterpartyId, {});

    const entries = loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries });
    useWalletStore.getState().loadWallets();
    return updated;
  },

  deleteEntry(id, counterpartyId) {
    const entry = loanEntriesRepo.getById(id);
    if (!entry) throw new Error(`LoanEntry not found: ${id}`);

    // Rollback wallet effect
    rollbackLoanEntryFromWallet(entry);

    // Soft-delete entry
    loanEntriesRepo.softDelete(id);

    // Bump counterparty.updated_at
    loanCounterpartiesRepo.update(counterpartyId, {});

    const entries = loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries });
    useWalletStore.getState().loadWallets();
  },
}));
