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
  loadCounterparties: () => Promise<void>;
  findOrCreateCounterparty: (name: string) => Promise<LoanCounterparty>;
  renameCounterparty: (id: string, newName: string) => Promise<LoanCounterparty>;
  markAsPaid: (id: string) => Promise<void>;
  deleteCounterparty: (id: string) => Promise<void>;
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type CounterpartyStore = CounterpartyState & CounterpartyActions;

export const useLoanCounterpartyStore = create<CounterpartyStore>()(
  (set, get) => ({
    counterparties: [],
    isLoading: true,

    async loadCounterparties() {
      set({ isLoading: true });
      const counterparties = await loanCounterpartiesRepo.getAll();
      set({ counterparties, isLoading: false });
    },

    async findOrCreateCounterparty(name) {
      const trimmed = name.trim();
      const existing = await loanCounterpartiesRepo.findByName(trimmed);

      if (existing) {
        if (existing.manual_paid_off) {
          const updated = await loanCounterpartiesRepo.update(existing.id, {
            manual_paid_off: false,
          });
          const counterparties = await loanCounterpartiesRepo.getAll();
          set({ counterparties });
          return updated;
        }
        return existing;
      }

      const created = await loanCounterpartiesRepo.create({ name: trimmed });
      const counterparties = await loanCounterpartiesRepo.getAll();
      set({ counterparties });
      return created;
    },

    async renameCounterparty(id, newName) {
      const updated = await loanCounterpartiesRepo.update(id, { name: newName.trim() });
      const counterparties = await loanCounterpartiesRepo.getAll();
      set({ counterparties });
      return updated;
    },

    async markAsPaid(id) {
      await loanCounterpartiesRepo.update(id, { manual_paid_off: true });
      const counterparties = await loanCounterpartiesRepo.getAll();
      set({ counterparties });
    },

    async deleteCounterparty(id) {
      const entries = await loanEntriesRepo.getByCounterpartyId(id);
      for (const entry of entries) {
        await rollbackLoanEntryFromWallet(entry);
      }
      await loanEntriesRepo.softDeleteByCounterpartyId(id);
      await loanCounterpartiesRepo.softDelete(id);
      const counterparties = await loanCounterpartiesRepo.getAll();
      set({ counterparties });
      await useWalletStore.getState().loadWallets();
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
  loadEntries: () => Promise<void>;
  loadEntriesForCounterparty: (counterpartyId: string) => Promise<void>;
  createEntry: (input: {
    counterpartyId: string;
    type: import("@/lib/types/loan").LoanEntryType;
    amount: number;
    wallet_id?: string | null;
    note?: string | null;
    transaction_date: string;
    transaction_time: string;
  }) => Promise<LoanEntry>;
  updateEntry: (id: string, patch: UpdateLoanEntryInput, counterpartyId: string) => Promise<LoanEntry>;
  deleteEntry: (id: string, counterpartyId: string) => Promise<void>;
}

type EntryStore = EntryState & EntryActions;

export const useLoanEntryStore = create<EntryStore>()((set) => ({
  entries: [],
  isLoading: true,

  async loadEntries() {
    set({ isLoading: true });
    const entries = await loanEntriesRepo.getAll();
    set({ entries, isLoading: false });
  },

  async loadEntriesForCounterparty(counterpartyId) {
    set({ isLoading: true });
    const entries = await loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries, isLoading: false });
  },

  async createEntry(input) {
    const entry = await loanEntriesRepo.create({
      counterparty_id: input.counterpartyId,
      type: input.type,
      amount: input.amount,
      wallet_id: input.wallet_id ?? null,
      note: input.note ?? null,
      transaction_date: input.transaction_date,
      transaction_time: input.transaction_time,
    });
    await applyLoanEntryToWallet(entry);
    await loanCounterpartiesRepo.update(input.counterpartyId, {});
    const entries = await loanEntriesRepo.getByCounterpartyId(input.counterpartyId);
    set({ entries });
    await useWalletStore.getState().loadWallets();
    return entry;
  },

  async updateEntry(id, patch, counterpartyId) {
    const old = await loanEntriesRepo.getById(id);
    if (!old) throw new Error(`LoanEntry not found: ${id}`);
    await rollbackLoanEntryFromWallet(old);
    const updated = await loanEntriesRepo.update(id, patch);
    await applyLoanEntryToWallet(updated);
    await loanCounterpartiesRepo.update(counterpartyId, {});
    const entries = await loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries });
    await useWalletStore.getState().loadWallets();
    return updated;
  },

  async deleteEntry(id, counterpartyId) {
    const entry = await loanEntriesRepo.getById(id);
    if (!entry) throw new Error(`LoanEntry not found: ${id}`);
    await rollbackLoanEntryFromWallet(entry);
    await loanEntriesRepo.softDelete(id);
    await loanCounterpartiesRepo.update(counterpartyId, {});
    const entries = await loanEntriesRepo.getByCounterpartyId(counterpartyId);
    set({ entries });
    await useWalletStore.getState().loadWallets();
  },
}));
