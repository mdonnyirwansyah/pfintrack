import type { LoanEntry, LoanEntryType } from "@/lib/types/loan";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { loanEntriesIdbRepo } from "./loan-entries-idb";

const KEY = "loan_entries";

export type CreateLoanEntryInput = {
  counterparty_id: string;
  type: LoanEntryType;
  amount: number;
  wallet_id?: string | null;
  note?: string | null;
  transaction_date: string;
  transaction_time: string;
};

export type UpdateLoanEntryInput = Partial<
  Pick<
    LoanEntry,
    | "type"
    | "amount"
    | "wallet_id"
    | "note"
    | "transaction_date"
    | "transaction_time"
  >
>;

const loanEntriesLsRepo = {
  getAll(): LoanEntry[] {
    return readKey<LoanEntry>(KEY).filter((e) => e.is_active);
  },

  getAllIncludingInactive(): LoanEntry[] {
    return readKey<LoanEntry>(KEY);
  },

  getById(id: string): LoanEntry | null {
    return readKey<LoanEntry>(KEY).find((e) => e.id === id) ?? null;
  },

  getByCounterpartyId(counterpartyId: string): LoanEntry[] {
    return readKey<LoanEntry>(KEY).filter(
      (e) => e.is_active && e.counterparty_id === counterpartyId
    );
  },

  getByWalletId(walletId: string): LoanEntry[] {
    return readKey<LoanEntry>(KEY).filter(
      (e) => e.is_active && e.wallet_id === walletId
    );
  },

  create(input: CreateLoanEntryInput): LoanEntry {
    const all = readKey<LoanEntry>(KEY);
    const now = new Date().toISOString();
    const entry: LoanEntry = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      counterparty_id: input.counterparty_id,
      type: input.type,
      amount: input.amount,
      wallet_id: input.wallet_id ?? null,
      note: input.note ?? null,
      transaction_date: input.transaction_date,
      transaction_time: input.transaction_time,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    writeKey(KEY, [...all, entry]);
    return entry;
  },

  update(id: string, patch: UpdateLoanEntryInput): LoanEntry {
    const all = readKey<LoanEntry>(KEY);
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`LoanEntry not found: ${id}`);
    const updated: LoanEntry = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<LoanEntry>(KEY);
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`LoanEntry not found: ${id}`);
    all[idx] = { ...all[idx], is_active: false, updated_at: new Date().toISOString() };
    writeKey(KEY, all);
  },

  softDeleteByCounterpartyId(counterpartyId: string): LoanEntry[] {
    const all = readKey<LoanEntry>(KEY);
    const now = new Date().toISOString();
    const affected: LoanEntry[] = [];
    const updated = all.map((e) => {
      if (e.counterparty_id === counterpartyId && e.is_active) {
        const soft: LoanEntry = { ...e, is_active: false, updated_at: now };
        affected.push(soft);
        return soft;
      }
      return e;
    });
    writeKey(KEY, updated);
    return affected;
  },
};

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const loanEntriesRepo = {
  async getAll(): Promise<LoanEntry[]> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.getAll();
    return loanEntriesLsRepo.getAll();
  },

  async getAllIncludingInactive(): Promise<LoanEntry[]> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.getAllIncludingInactive();
    return loanEntriesLsRepo.getAllIncludingInactive();
  },

  async getById(id: string): Promise<LoanEntry | null> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.getById(id);
    return loanEntriesLsRepo.getById(id);
  },

  async getByCounterpartyId(counterpartyId: string): Promise<LoanEntry[]> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.getByCounterpartyId(counterpartyId);
    return loanEntriesLsRepo.getByCounterpartyId(counterpartyId);
  },

  async getByWalletId(walletId: string): Promise<LoanEntry[]> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.getByWalletId(walletId);
    return loanEntriesLsRepo.getByWalletId(walletId);
  },

  async create(input: CreateLoanEntryInput): Promise<LoanEntry> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.create(input);
    return loanEntriesLsRepo.create(input);
  },

  async update(id: string, patch: UpdateLoanEntryInput): Promise<LoanEntry> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.update(id, patch);
    return loanEntriesLsRepo.update(id, patch);
  },

  async softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.softDelete(id);
    loanEntriesLsRepo.softDelete(id);
  },

  async softDeleteByCounterpartyId(counterpartyId: string): Promise<LoanEntry[]> {
    if (STORAGE_BACKEND === "idb") return loanEntriesIdbRepo.softDeleteByCounterpartyId(counterpartyId);
    return loanEntriesLsRepo.softDeleteByCounterpartyId(counterpartyId);
  },
};
