import { generateUUID } from "@/lib/bootstrap/anon-id";
import type { Transaction } from "@/lib/types/transaction";
import {
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbGetAllByRange,
  idbPut,
  idbPutAll,
  idbUpdate,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateTransactionInput, UpdateTransactionInput } from "./transactions";

const STORE = "transactions" as const;

export const transactionsIdbRepo = {
  async getAll(): Promise<Transaction[]> {
    const all = await idbGetAll<Transaction>(STORE);
    return all.filter((t) => t.is_active);
  },

  async getByDate(date: string): Promise<Transaction[]> {
    const records = await idbGetAllByIndex<Transaction>(STORE, "by_date", date);
    return records.filter((t) => t.is_active);
  },

  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    const range = IDBKeyRange.bound(startDate, endDate);
    const records = await idbGetAllByRange<Transaction>(
      STORE,
      "by_date",
      range,
    );
    return records.filter((t) => t.is_active);
  },

  async getByWalletId(walletId: string): Promise<Transaction[]> {
    const [bySource, byDest] = await Promise.all([
      idbGetAllByIndex<Transaction>(STORE, "by_wallet_id", walletId),
      idbGetAllByIndex<Transaction>(STORE, "by_dest_wallet_id", walletId),
    ]);

    const seen = new Map<string, Transaction>();
    for (const t of [...bySource, ...byDest]) {
      if (!seen.has(t.id)) seen.set(t.id, t);
    }

    return Array.from(seen.values()).filter((t) => t.is_active);
  },

  async getById(id: string): Promise<Transaction | null> {
    const result = await idbGet<Transaction>(STORE, id);
    return result ?? null;
  },

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const now = new Date().toISOString();

    const transaction: Transaction = {
      id: generateUUID(),
      anon_id: getOrCreateAnonId(),
      type: input.type,
      wallet_id: input.wallet_id,
      destination_wallet_id: input.destination_wallet_id ?? null,
      amount: input.amount,
      title: input.title ?? null,
      category: input.category ?? null,
      description: input.description ?? null,
      transaction_date: input.transaction_date,
      transaction_time: input.transaction_time,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    await idbPut<Transaction>(STORE, transaction);
    return transaction;
  },

  async update(id: string, patch: UpdateTransactionInput): Promise<Transaction> {
    const updated = await idbUpdate<Transaction>(STORE, id, (existing) => ({
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`Transaction not found: ${id}`);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const updated = await idbUpdate<Transaction>(STORE, id, (existing) => ({
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) throw new Error(`Transaction not found: ${id}`);
  },

  async putAll(records: Transaction[]): Promise<void> {
    await idbPutAll<Transaction>(STORE, records);
  },
};
