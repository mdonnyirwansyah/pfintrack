import type { Transaction, TransactionType } from "@/lib/types/transaction";
import { readKey, writeKey } from "./base";
import { getOrCreateAnonId } from "./anon-id";

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

export const transactionsRepo = {
  /** Returns only is_active=true records */
  getAll(): Transaction[] {
    return readKey<Transaction>(KEY).filter((t) => t.is_active);
  },

  getAllIncludingInactive(): Transaction[] {
    return readKey<Transaction>(KEY);
  },

  getById(id: string): Transaction | null {
    return readKey<Transaction>(KEY).find((t) => t.id === id) ?? null;
  },

  /** Returns active transactions for a specific date (YYYY-MM-DD) */
  getByDate(date: string): Transaction[] {
    return readKey<Transaction>(KEY).filter(
      (t) => t.is_active && t.transaction_date === date
    );
  },

  /** Returns active transactions for a wallet */
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
