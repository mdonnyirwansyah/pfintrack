import type { LoanEntry } from "@/lib/types/loan";
import {
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
  idbPutAll,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateLoanEntryInput } from "./loan-entries";

const STORE = "loan_entries" as const;

export const loanEntriesIdbRepo = {
  async getAll(): Promise<LoanEntry[]> {
    return idbGetAllByIndex<LoanEntry>(
      STORE,
      "by_is_active",
      true as unknown as IDBValidKey,
    );
  },

  async getAllIncludingInactive(): Promise<LoanEntry[]> {
    return idbGetAll<LoanEntry>(STORE);
  },

  async getById(id: string): Promise<LoanEntry | null> {
    return (await idbGet<LoanEntry>(STORE, id)) ?? null;
  },

  async getByCounterpartyId(counterpartyId: string): Promise<LoanEntry[]> {
    const records = await idbGetAllByIndex<LoanEntry>(
      STORE,
      "by_counterparty_id",
      counterpartyId,
    );
    return records.filter((e) => e.is_active);
  },

  async getByWalletId(walletId: string): Promise<LoanEntry[]> {
    const records = await idbGetAllByIndex<LoanEntry>(
      STORE,
      "by_wallet_id",
      walletId,
    );
    return records.filter((e) => e.is_active);
  },

  async create(input: CreateLoanEntryInput): Promise<LoanEntry> {
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
    await idbPut<LoanEntry>(STORE, entry);
    return entry;
  },

  async update(
    id: string,
    patch: Partial<
      Pick<LoanEntry, "type" | "amount" | "wallet_id" | "note" | "transaction_date" | "transaction_time">
    >,
  ): Promise<LoanEntry> {
    const existing = await idbGet<LoanEntry>(STORE, id);
    if (!existing) throw new Error(`LoanEntry not found: ${id}`);
    const updated: LoanEntry = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await idbPut<LoanEntry>(STORE, updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await idbGet<LoanEntry>(STORE, id);
    if (!existing) throw new Error(`LoanEntry not found: ${id}`);
    await idbPut<LoanEntry>(STORE, {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  },

  async softDeleteByCounterpartyId(counterpartyId: string): Promise<LoanEntry[]> {
    const records = await idbGetAllByIndex<LoanEntry>(
      STORE,
      "by_counterparty_id",
      counterpartyId,
    );
    const now = new Date().toISOString();
    const affected: LoanEntry[] = [];
    for (const entry of records) {
      if (entry.is_active) {
        const soft: LoanEntry = { ...entry, is_active: false, updated_at: now };
        await idbPut<LoanEntry>(STORE, soft);
        affected.push(soft);
      }
    }
    return affected;
  },

  async putAll(records: LoanEntry[]): Promise<void> {
    await idbPutAll<LoanEntry>(STORE, records);
  },
};
