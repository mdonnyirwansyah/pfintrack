// anon_id: intentionally kept in localStorage. See PROP-0001 §Step 7.
import { walletsIdbRepo } from "./wallets-idb";
import { walletBalanceHistoryIdbRepo } from "./wallet-balance-history-idb";
import { transactionsIdbRepo } from "./transactions-idb";
import { loanCounterpartiesIdbRepo } from "./loan-counterparties-idb";
import { loanEntriesIdbRepo } from "./loan-entries-idb";
import { customReportsIdbRepo } from "./custom-reports-idb";
import type { Wallet, WalletBalanceHistory } from "@/lib/types/wallet";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import type { CustomReport } from "@/lib/types/report";

const STORAGE_VERSION_KEY = "storage_version";
const STORAGE_VERSION_VALUE = "idb_v1";

/** Synchronous check — safe to call during React lazy state init. */
export function isMigrationDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_VERSION_KEY) === STORAGE_VERSION_VALUE;
}

async function migrateWallets(): Promise<void> {
  const raw = localStorage.getItem("wallets");
  if (!raw) return;
  const records: Wallet[] = JSON.parse(raw) as Wallet[];
  if (Array.isArray(records) && records.length > 0) {
    await walletsIdbRepo.putAll(records);
  }
  localStorage.removeItem("wallets");
}

async function migrateWalletBalanceHistory(): Promise<void> {
  const raw = localStorage.getItem("wallet_balance_history");
  if (!raw) return;
  const records: WalletBalanceHistory[] = JSON.parse(raw) as WalletBalanceHistory[];
  if (Array.isArray(records) && records.length > 0) {
    await walletBalanceHistoryIdbRepo.putAll(records);
  }
  localStorage.removeItem("wallet_balance_history");
}

async function migrateTransactions(): Promise<void> {
  const raw = localStorage.getItem("transactions");
  if (!raw) return;
  const records: Transaction[] = JSON.parse(raw) as Transaction[];
  if (Array.isArray(records) && records.length > 0) {
    await transactionsIdbRepo.putAll(records);
  }
  localStorage.removeItem("transactions");
}

async function migrateLoanCounterparties(): Promise<void> {
  const raw = localStorage.getItem("loan_counterparties");
  if (!raw) return;
  const records: LoanCounterparty[] = JSON.parse(raw) as LoanCounterparty[];
  if (Array.isArray(records) && records.length > 0) {
    await loanCounterpartiesIdbRepo.putAll(records);
  }
  localStorage.removeItem("loan_counterparties");
}

async function migrateLoanEntries(): Promise<void> {
  const raw = localStorage.getItem("loan_entries");
  if (!raw) return;
  const records: LoanEntry[] = JSON.parse(raw) as LoanEntry[];
  if (Array.isArray(records) && records.length > 0) {
    await loanEntriesIdbRepo.putAll(records);
  }
  localStorage.removeItem("loan_entries");
}

async function migrateCustomReports(): Promise<void> {
  const raw = localStorage.getItem("custom_reports");
  if (!raw) return;
  const records: CustomReport[] = JSON.parse(raw) as CustomReport[];
  if (Array.isArray(records) && records.length > 0) {
    await customReportsIdbRepo.putAll(records);
  }
  localStorage.removeItem("custom_reports");
}

/**
 * One-time migration from localStorage to IndexedDB.
 *
 * Guards with a localStorage "storage_version" flag so it only runs once.
 * Each block migrates one key: read JSON from localStorage, putAll to IDB, remove from localStorage.
 */
export async function runStorageMigration(): Promise<void> {
  if (typeof window === "undefined") return;

  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  if (version === STORAGE_VERSION_VALUE) return;

  try { await migrateWallets(); } catch (err) { console.warn("[migration] wallets migration failed:", err); }
  try { await migrateWalletBalanceHistory(); } catch (err) { console.warn("[migration] wallet_balance_history migration failed:", err); }
  try { await migrateTransactions(); } catch (err) { console.warn("[migration] transactions migration failed:", err); }
  try { await migrateLoanCounterparties(); } catch (err) { console.warn("[migration] loan_counterparties migration failed:", err); }
  try { await migrateLoanEntries(); } catch (err) { console.warn("[migration] loan_entries migration failed:", err); }
  try { await migrateCustomReports(); } catch (err) { console.warn("[migration] custom_reports migration failed:", err); }

  // Mark migration complete (only after ALL blocks succeed)
  localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION_VALUE);
}
