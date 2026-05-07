import type { LoanCounterparty } from "@/lib/types/loan";
import {
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
  idbPutAll,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";

const STORE = "loan_counterparties" as const;

export const loanCounterpartiesIdbRepo = {
  async getAll(): Promise<LoanCounterparty[]> {
    return idbGetAllByIndex<LoanCounterparty>(
      STORE,
      "by_is_active",
      true as unknown as IDBValidKey,
    );
  },

  async getAllIncludingInactive(): Promise<LoanCounterparty[]> {
    return idbGetAll<LoanCounterparty>(STORE);
  },

  async getById(id: string): Promise<LoanCounterparty | null> {
    return (await idbGet<LoanCounterparty>(STORE, id)) ?? null;
  },

  async findByName(name: string): Promise<LoanCounterparty | null> {
    const normalized = name.trim().toLowerCase();
    const all = await idbGetAllByIndex<LoanCounterparty>(
      STORE,
      "by_is_active",
      true as unknown as IDBValidKey,
    );
    return all.find((c) => c.name.trim().toLowerCase() === normalized) ?? null;
  },

  async create(input: { name: string }): Promise<LoanCounterparty> {
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
    await idbPut<LoanCounterparty>(STORE, counterparty);
    return counterparty;
  },

  async update(
    id: string,
    patch: Partial<Pick<LoanCounterparty, "name" | "manual_paid_off">>,
  ): Promise<LoanCounterparty> {
    const existing = await idbGet<LoanCounterparty>(STORE, id);
    if (!existing) throw new Error(`LoanCounterparty not found: ${id}`);
    const updated: LoanCounterparty = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await idbPut<LoanCounterparty>(STORE, updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await idbGet<LoanCounterparty>(STORE, id);
    if (!existing) throw new Error(`LoanCounterparty not found: ${id}`);
    await idbPut<LoanCounterparty>(STORE, {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  },

  async putAll(records: LoanCounterparty[]): Promise<void> {
    await idbPutAll<LoanCounterparty>(STORE, records);
  },
};
