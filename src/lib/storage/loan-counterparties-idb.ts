import { generateUUID } from "@/lib/bootstrap/anon-id";
import type { LoanCounterparty } from "@/lib/types/loan";
import {
  idbGet,
  idbGetAll,
  idbPut,
  idbPutAll,
  idbUpdate,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";

const STORE = "loan_counterparties" as const;

export const loanCounterpartiesIdbRepo = {
  async getAll(): Promise<LoanCounterparty[]> {
    const all = await idbGetAll<LoanCounterparty>(STORE);
    return all.filter((c) => c.is_active);
  },

  async getAllIncludingInactive(): Promise<LoanCounterparty[]> {
    return idbGetAll<LoanCounterparty>(STORE);
  },

  async getById(id: string): Promise<LoanCounterparty | null> {
    return (await idbGet<LoanCounterparty>(STORE, id)) ?? null;
  },

  async findByName(name: string): Promise<LoanCounterparty | null> {
    const normalized = name.trim().toLowerCase();
    const all = await loanCounterpartiesIdbRepo.getAll();
    return all.find((c) => c.name.trim().toLowerCase() === normalized) ?? null;
  },

  async create(input: { name: string }): Promise<LoanCounterparty> {
    const now = new Date().toISOString();
    const counterparty: LoanCounterparty = {
      id: generateUUID(),
      anon_id: getOrCreateAnonId(),
      name: input.name.trim(),
      manual_paid_off: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await idbPut<LoanCounterparty>(STORE, counterparty);
    return counterparty;
  },

  async update(
    id: string,
    patch: Partial<Pick<LoanCounterparty, "name" | "manual_paid_off">>,
  ): Promise<LoanCounterparty> {
    const updated = await idbUpdate<LoanCounterparty>(STORE, id, (existing) => ({
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`LoanCounterparty not found: ${id}`);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const updated = await idbUpdate<LoanCounterparty>(STORE, id, (existing) => ({
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`LoanCounterparty not found: ${id}`);
  },

  async putAll(records: LoanCounterparty[]): Promise<void> {
    await idbPutAll<LoanCounterparty>(STORE, records);
  },
};
