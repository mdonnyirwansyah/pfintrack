import type { LoanCounterparty } from "@/lib/types/loan";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { loanCounterpartiesIdbRepo } from "./loan-counterparties-idb";

const KEY = "loan_counterparties";

export type CreateLoanCounterpartyInput = {
  name: string;
};

export type UpdateLoanCounterpartyInput = Partial<
  Pick<LoanCounterparty, "name" | "manual_paid_off">
>;

const loanCounterpartiesLsRepo = {
  getAll(): LoanCounterparty[] {
    return readKey<LoanCounterparty>(KEY).filter((c) => c.is_active);
  },

  getAllIncludingInactive(): LoanCounterparty[] {
    return readKey<LoanCounterparty>(KEY);
  },

  getById(id: string): LoanCounterparty | null {
    return readKey<LoanCounterparty>(KEY).find((c) => c.id === id) ?? null;
  },

  findByName(name: string): LoanCounterparty | null {
    const normalized = name.trim().toLowerCase();
    return (
      readKey<LoanCounterparty>(KEY).find(
        (c) => c.is_active && c.name.trim().toLowerCase() === normalized
      ) ?? null
    );
  },

  create(input: CreateLoanCounterpartyInput): LoanCounterparty {
    const all = readKey<LoanCounterparty>(KEY);
    const now = new Date().toISOString();
    const counterparty: LoanCounterparty = {
      id: crypto.randomUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name.trim(),
      manual_paid_off: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    writeKey(KEY, [...all, counterparty]);
    return counterparty;
  },

  update(id: string, patch: UpdateLoanCounterpartyInput): LoanCounterparty {
    const all = readKey<LoanCounterparty>(KEY);
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`LoanCounterparty not found: ${id}`);
    const updated: LoanCounterparty = {
      ...all[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<LoanCounterparty>(KEY);
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`LoanCounterparty not found: ${id}`);
    all[idx] = { ...all[idx], is_active: false, updated_at: new Date().toISOString() };
    writeKey(KEY, all);
  },
};

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const loanCounterpartiesRepo = {
  getAll(): Promise<LoanCounterparty[]> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.getAll();
    return Promise.resolve(loanCounterpartiesLsRepo.getAll());
  },

  getAllIncludingInactive(): Promise<LoanCounterparty[]> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.getAllIncludingInactive();
    return Promise.resolve(loanCounterpartiesLsRepo.getAllIncludingInactive());
  },

  getById(id: string): Promise<LoanCounterparty | null> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.getById(id);
    return Promise.resolve(loanCounterpartiesLsRepo.getById(id));
  },

  findByName(name: string): Promise<LoanCounterparty | null> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.findByName(name);
    return Promise.resolve(loanCounterpartiesLsRepo.findByName(name));
  },

  create(input: CreateLoanCounterpartyInput): Promise<LoanCounterparty> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.create(input);
    return Promise.resolve(loanCounterpartiesLsRepo.create(input));
  },

  update(id: string, patch: UpdateLoanCounterpartyInput): Promise<LoanCounterparty> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.update(id, patch);
    return Promise.resolve(loanCounterpartiesLsRepo.update(id, patch));
  },

  softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return loanCounterpartiesIdbRepo.softDelete(id);
    loanCounterpartiesLsRepo.softDelete(id);
    return Promise.resolve();
  },
};
