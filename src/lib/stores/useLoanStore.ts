import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";

interface LoanState {
  counterparties: LoanCounterparty[];
  entries: LoanEntry[];
}

interface LoanActions {
  setCounterparties: (counterparties: LoanCounterparty[]) => void;
  addCounterparty: (counterparty: LoanCounterparty) => void;
  updateCounterparty: (id: string, updates: Partial<LoanCounterparty>) => void;
  softDeleteCounterparty: (id: string) => void;

  setEntries: (entries: LoanEntry[]) => void;
  addEntry: (entry: LoanEntry) => void;
  updateEntry: (id: string, updates: Partial<LoanEntry>) => void;
  softDeleteEntry: (id: string) => void;
}

type LoanStore = LoanState & LoanActions;

export const useLoanCounterpartyStore = create<Pick<LoanStore, "counterparties" | "setCounterparties" | "addCounterparty" | "updateCounterparty" | "softDeleteCounterparty">>()(
  persist(
    (set) => ({
      counterparties: [],

      setCounterparties: (counterparties) => set({ counterparties }),

      addCounterparty: (counterparty) =>
        set((state) => ({
          counterparties: [...state.counterparties, counterparty],
        })),

      updateCounterparty: (id, updates) =>
        set((state) => ({
          counterparties: state.counterparties.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      softDeleteCounterparty: (id) =>
        set((state) => ({
          counterparties: state.counterparties.map((c) =>
            c.id === id ? { ...c, is_active: false } : c
          ),
        })),
    }),
    {
      name: "loan_counterparties",
      version: 1,
    }
  )
);

export const useLoanEntryStore = create<Pick<LoanStore, "entries" | "setEntries" | "addEntry" | "updateEntry" | "softDeleteEntry">>()(
  persist(
    (set) => ({
      entries: [],

      setEntries: (entries) => set({ entries }),

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      softDeleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, is_active: false } : e
          ),
        })),
    }),
    {
      name: "loan_entries",
      version: 1,
    }
  )
);
