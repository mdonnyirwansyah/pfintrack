import type { Transaction } from "@/lib/types/transaction";
import {
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
  idbPutAll,
} from "./idb-client";
import { getOrCreateAnonId } from "./anon-id";
import type { CreateTransactionInput, UpdateTransactionInput } from "./transactions";

const STORE = "transactions" as const;

export const transactionsIdbRepo = {
  /** Returns only is_active=true records */
  async getAll(): Promise<Transaction[]> {
    const all = await idbGetAll<Transaction>(STORE);
    return all.filter((t) => t.is_active);
  },

  /** Returns active transactions for a specific date (YYYY-MM-DD) */
  async getByDate(date: string): Promise<Transaction[]> {
    const records = await idbGetAllByIndex<Transaction>(STORE, "by_date", date);
    return records.filter((t) => t.is_active);
  },

  /**
   * Returns active transactions where wallet_id OR destination_wallet_id matches.
   * Runs two index queries then deduplicates on id.
   */
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
      id: crypto.randomUUID(),
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
    const existing = await idbGet<Transaction>(STORE, id);
    if (!existing) throw new Error(`Transaction not found: ${id}`);

    const updated: Transaction = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    await idbPut<Transaction>(STORE, updated);
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await idbGet<Transaction>(STORE, id);
    if (!existing) throw new Error(`Transaction not found: ${id}`);

    const deleted: Transaction = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    await idbPut<Transaction>(STORE, deleted);
  },

  /** For migration runner — bulk-write records without transformation */
  async putAll(records: Transaction[]): Promise<void> {
    await idbPutAll<Transaction>(STORE, records);
  },
};
