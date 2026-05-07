import type { Transaction, TransactionType } from "@/lib/types/transaction";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";
import { STORAGE_BACKEND } from "./config";
import { transactionsIdbRepo } from "./transactions-idb";
import { idbGetAll } from "./idb-client";

const KEY = "transactions";

export type CreateTransactionInput = {
  type: TransactionType;
  wallet_id: string;
  destination_wallet_id?: string | null;
  amount: number;
  title?: string | null;
  category?: string | null;
  description?: string | null;
  transaction_date: string;
  transaction_time: string;
};

export type UpdateTransactionInput = Partial<
  Pick<
    Transaction,
    | "type"
    | "wallet_id"
    | "destination_wallet_id"
    | "amount"
    | "title"
    | "category"
    | "description"
    | "transaction_date"
    | "transaction_time"
  >
>;

const transactionsLsRepo = {
  getAll(): Transaction[] {
    return readKey<Transaction>(KEY).filter((t) => t.is_active);
  },

  getAllIncludingInactive(): Transaction[] {
    return readKey<Transaction>(KEY);
  },

  getById(id: string): Transaction | null {
    return readKey<Transaction>(KEY).find((t) => t.id === id) ?? null;
  },

  getByDate(date: string): Transaction[] {
    return readKey<Transaction>(KEY).filter(
      (t) => t.is_active && t.transaction_date === date
    );
  },

  getByWalletId(walletId: string): Transaction[] {
    return readKey<Transaction>(KEY).filter(
      (t) =>
        t.is_active &&
        (t.wallet_id === walletId || t.destination_wallet_id === walletId)
    );
  },

  create(input: CreateTransactionInput): Transaction {
    const all = readKey<Transaction>(KEY);
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

    writeKey(KEY, [...all, transaction]);
    return transaction;
  },

  update(id: string, patch: UpdateTransactionInput): Transaction {
    const all = readKey<Transaction>(KEY);
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Transaction not found: ${id}`);

    const updated: Transaction = {
      ...all[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all[idx] = updated;
    writeKey(KEY, all);
    return updated;
  },

  softDelete(id: string): void {
    const all = readKey<Transaction>(KEY);
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Transaction not found: ${id}`);

    all[idx] = {
      ...all[idx],
      is_active: false,
      updated_at: new Date().toISOString(),
    };
    writeKey(KEY, all);
  },
};

// ---------------------------------------------------------------------------
// Unified repo — delegates to IDB or localStorage based on STORAGE_BACKEND
// ---------------------------------------------------------------------------

export const transactionsRepo = {
  getAll(): Promise<Transaction[]> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.getAll();
    return Promise.resolve(transactionsLsRepo.getAll());
  },

  getAllIncludingInactive(): Promise<Transaction[]> {
    if (STORAGE_BACKEND === "idb") return idbGetAll<Transaction>("transactions");
    return Promise.resolve(transactionsLsRepo.getAllIncludingInactive());
  },

  getById(id: string): Promise<Transaction | null> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.getById(id);
    return Promise.resolve(transactionsLsRepo.getById(id));
  },

  getByDate(date: string): Promise<Transaction[]> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.getByDate(date);
    return Promise.resolve(transactionsLsRepo.getByDate(date));
  },

  getByWalletId(walletId: string): Promise<Transaction[]> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.getByWalletId(walletId);
    return Promise.resolve(transactionsLsRepo.getByWalletId(walletId));
  },

  create(input: CreateTransactionInput): Promise<Transaction> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.create(input);
    return Promise.resolve(transactionsLsRepo.create(input));
  },

  update(id: string, patch: UpdateTransactionInput): Promise<Transaction> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.update(id, patch);
    return Promise.resolve(transactionsLsRepo.update(id, patch));
  },

  softDelete(id: string): Promise<void> {
    if (STORAGE_BACKEND === "idb") return transactionsIdbRepo.softDelete(id);
    transactionsLsRepo.softDelete(id);
    return Promise.resolve();
  },
};
