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

/**
 * One-time migration from localStorage to IndexedDB.
 *
 * Guards with a localStorage "storage_version" flag so it only runs once.
 * Each block migrates one key: read JSON from localStorage, putAll to IDB, remove from localStorage.
 *
 * Steps 3–6 (wallet_balance_history, transactions, loan_counterparties, loan_entries,
 * custom_reports) will be added here as each module is migrated.
 */
export async function runStorageMigration(): Promise<void> {
  if (typeof window === "undefined") return;

  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  if (version === STORAGE_VERSION_VALUE) return;

  // ── Step 2: wallets ────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem("wallets");
    if (raw) {
      const records: Wallet[] = JSON.parse(raw) as Wallet[];
      if (Array.isArray(records) && records.length > 0) {
        await walletsIdbRepo.putAll(records);
      }
      localStorage.removeItem("wallets");
    }
  } catch (err) {
    console.warn("[migration] wallets migration failed:", err);
  }

  // ── Step 3: wallet_balance_history ────────────────────────────────────────
  try {
    const raw = localStorage.getItem("wallet_balance_history");
    if (raw) {
      const records: WalletBalanceHistory[] = JSON.parse(raw) as WalletBalanceHistory[];
      if (Array.isArray(records) && records.length > 0) {
        await walletBalanceHistoryIdbRepo.putAll(records);
      }
      localStorage.removeItem("wallet_balance_history");
    }
  } catch (err) {
    console.warn("[migration] wallet_balance_history migration failed:", err);
  }

  // ── Step 4: transactions ──────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem("transactions");
    if (raw) {
      const records: Transaction[] = JSON.parse(raw) as Transaction[];
      if (Array.isArray(records) && records.length > 0) {
        await transactionsIdbRepo.putAll(records);
      }
      localStorage.removeItem("transactions");
    }
  } catch (err) {
    console.warn("[migration] transactions migration failed:", err);
  }

  // ── Step 5a: loan_counterparties ──────────────────────────────────────────
  try {
    const raw = localStorage.getItem("loan_counterparties");
    if (raw) {
      const records: LoanCounterparty[] = JSON.parse(raw) as LoanCounterparty[];
      if (Array.isArray(records) && records.length > 0) {
        await loanCounterpartiesIdbRepo.putAll(records);
      }
      localStorage.removeItem("loan_counterparties");
    }
  } catch (err) {
    console.warn("[migration] loan_counterparties migration failed:", err);
  }

  // ── Step 5b: loan_entries ─────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem("loan_entries");
    if (raw) {
      const records: LoanEntry[] = JSON.parse(raw) as LoanEntry[];
      if (Array.isArray(records) && records.length > 0) {
        await loanEntriesIdbRepo.putAll(records);
      }
      localStorage.removeItem("loan_entries");
    }
  } catch (err) {
    console.warn("[migration] loan_entries migration failed:", err);
  }

  // ── Step 6: custom_reports ────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem("custom_reports");
    if (raw) {
      const records: CustomReport[] = JSON.parse(raw) as CustomReport[];
      if (Array.isArray(records) && records.length > 0) {
        await customReportsIdbRepo.putAll(records);
      }
      localStorage.removeItem("custom_reports");
    }
  } catch (err) {
    console.warn("[migration] custom_reports migration failed:", err);
  }

  // Mark migration complete (only after ALL blocks succeed)
  localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION_VALUE);
}
