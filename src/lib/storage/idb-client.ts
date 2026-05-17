import { openDB, type DBSchema, type IDBPDatabase } from "idb";

type AnyDB = IDBPDatabase;

import type { Wallet, WalletBalanceHistory } from "@/lib/types/wallet";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import type { CustomReport } from "@/lib/types/report";

export interface PFinTrackDB extends DBSchema {
  wallets: {
    key: string;
    value: Wallet;
    indexes: {
      by_anon_id: string;
      by_is_active: IDBValidKey;
    };
  };
  wallet_balance_history: {
    key: string;
    value: WalletBalanceHistory;
    indexes: {
      by_anon_id: string;
      by_wallet_id: string;
      by_is_active: IDBValidKey;
    };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      by_anon_id: string;
      by_wallet_id: string;
      by_dest_wallet_id: string;
      by_date: string;
      by_is_active: IDBValidKey;
    };
  };
  loan_counterparties: {
    key: string;
    value: LoanCounterparty;
    indexes: {
      by_anon_id: string;
      by_is_active: IDBValidKey;
    };
  };
  loan_entries: {
    key: string;
    value: LoanEntry;
    indexes: {
      by_anon_id: string;
      by_counterparty_id: string;
      by_wallet_id: string;
      by_is_active: IDBValidKey;
    };
  };
  custom_reports: {
    key: string;
    value: CustomReport;
    indexes: {
      by_anon_id: string;
      by_is_active: IDBValidKey;
    };
  };
}

export type StoreName =
  | "wallets"
  | "wallet_balance_history"
  | "transactions"
  | "loan_counterparties"
  | "loan_entries"
  | "custom_reports";

const DB_NAME = "pfintrack_db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PFinTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PFinTrackDB>> {
  if (globalThis.window === undefined) {
    throw new Error("IDB not available in SSR");
  }

  if (!dbPromise) {
    dbPromise = openDB<PFinTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const wallets = db.createObjectStore("wallets", { keyPath: "id" });
          wallets.createIndex("by_anon_id", "anon_id");
          wallets.createIndex("by_is_active", "is_active");

          const wbh = db.createObjectStore("wallet_balance_history", {
            keyPath: "id",
          });
          wbh.createIndex("by_anon_id", "anon_id");
          wbh.createIndex("by_wallet_id", "wallet_id");
          wbh.createIndex("by_is_active", "is_active");

          const txns = db.createObjectStore("transactions", { keyPath: "id" });
          txns.createIndex("by_anon_id", "anon_id");
          txns.createIndex("by_wallet_id", "wallet_id");
          txns.createIndex("by_dest_wallet_id", "destination_wallet_id");
          txns.createIndex("by_date", "transaction_date");
          txns.createIndex("by_is_active", "is_active");

          const lcp = db.createObjectStore("loan_counterparties", {
            keyPath: "id",
          });
          lcp.createIndex("by_anon_id", "anon_id");
          lcp.createIndex("by_is_active", "is_active");

          const le = db.createObjectStore("loan_entries", { keyPath: "id" });
          le.createIndex("by_anon_id", "anon_id");
          le.createIndex("by_counterparty_id", "counterparty_id");
          le.createIndex("by_wallet_id", "wallet_id");
          le.createIndex("by_is_active", "is_active");

          const cr = db.createObjectStore("custom_reports", { keyPath: "id" });
          cr.createIndex("by_anon_id", "anon_id");
          cr.createIndex("by_is_active", "is_active");
        }

        if (oldVersion >= 1 && oldVersion < 2) {
          const txStore = tx.objectStore("transactions");
          if (!txStore.indexNames.contains("by_dest_wallet_id")) {
            txStore.createIndex(
              "by_dest_wallet_id",
              "destination_wallet_id",
            );
          }
        }
      },
    });
  }

  return dbPromise;
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = (await getDB()) as unknown as AnyDB;
  return db.getAll(storeName) as Promise<T[]>;
}

export async function idbGetAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const db = (await getDB()) as unknown as AnyDB;
  return db.getAllFromIndex(storeName, indexName, value) as Promise<T[]>;
}

export async function idbGetAllByRange<T>(
  storeName: StoreName,
  indexName: string,
  range: IDBKeyRange,
): Promise<T[]> {
  const db = (await getDB()) as unknown as AnyDB;
  return db.getAllFromIndex(storeName, indexName, range) as Promise<T[]>;
}

export async function idbGet<T>(
  storeName: StoreName,
  id: string,
): Promise<T | undefined> {
  const db = (await getDB()) as unknown as AnyDB;
  return db.get(storeName, id) as Promise<T | undefined>;
}

export async function idbPut<T>(
  storeName: StoreName,
  record: T,
): Promise<void> {
  const db = (await getDB()) as unknown as AnyDB;
  await db.put(storeName, record);
}

export async function idbDelete(
  storeName: StoreName,
  id: string,
): Promise<void> {
  const db = (await getDB()) as unknown as AnyDB;
  await db.delete(storeName, id);
}

export async function idbUpdate<T>(
  storeName: StoreName,
  id: string,
  updater: (existing: T) => T,
): Promise<T | null> {
  const db = (await getDB()) as unknown as AnyDB;
  const tx = db.transaction(storeName, "readwrite");
  const existing = (await tx.store.get(id)) as T | undefined;
  if (!existing) {
    await tx.done;
    return null;
  }
  const updated = updater(existing);
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

export async function idbUpdateMany<T>(
  storeName: StoreName,
  ids: readonly string[],
  updater: (existing: T | null, id: string) => T | null,
): Promise<void> {
  if (ids.length === 0) return;
  const db = (await getDB()) as unknown as AnyDB;
  const tx = db.transaction(storeName, "readwrite");
  for (const id of ids) {
    const existing = (await tx.store.get(id)) as T | undefined;
    const next = updater(existing ?? null, id);
    if (next !== null) {
      await tx.store.put(next);
    }
  }
  await tx.done;
}

export async function idbPutAll<T>(
  storeName: StoreName,
  records: T[],
): Promise<void> {
  const db = (await getDB()) as unknown as AnyDB;
  const tx = db.transaction(storeName, "readwrite");
  await Promise.all([...records.map((r: T) => tx.store.put(r)), tx.done]);
}

export async function idbClearStore(storeName: StoreName): Promise<void> {
  const db = (await getDB()) as unknown as AnyDB;
  await db.clear(storeName);
}
