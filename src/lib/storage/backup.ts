import type { Wallet, WalletBalanceHistory } from "@/lib/types/wallet";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import type { CustomReport } from "@/lib/types/report";
import { walletsRepo } from "./wallets";
import { walletBalanceHistoryRepo } from "./wallet-balance-history";
import { transactionsRepo } from "./transactions";
import { loanCounterpartiesRepo } from "./loan-counterparties";
import { loanEntriesRepo } from "./loan-entries";
import { customReportsRepo } from "./custom-reports";
import { walletsIdbRepo } from "./wallets-idb";
import { walletBalanceHistoryIdbRepo } from "./wallet-balance-history-idb";
import { transactionsIdbRepo } from "./transactions-idb";
import { loanCounterpartiesIdbRepo } from "./loan-counterparties-idb";
import { loanEntriesIdbRepo } from "./loan-entries-idb";
import { customReportsIdbRepo } from "./custom-reports-idb";
import { idbClearStore } from "./idb-client";
import { STORAGE_BACKEND } from "./config";
import { writeKey } from "./base";

export interface BackupData {
  version: 1;
  exported_at: string;
  wallets: Wallet[];
  wallet_balance_history: WalletBalanceHistory[];
  transactions: Transaction[];
  loan_counterparties: LoanCounterparty[];
  loan_entries: LoanEntry[];
  custom_reports: CustomReport[];
}

export async function exportBackup(): Promise<void> {
  const [wallets, history, transactions, counterparties, entries, reports] = await Promise.all([
    walletsRepo.getAllIncludingInactive(),
    walletBalanceHistoryRepo.getAllIncludingInactive(),
    transactionsRepo.getAllIncludingInactive(),
    loanCounterpartiesRepo.getAllIncludingInactive(),
    loanEntriesRepo.getAllIncludingInactive(),
    customReportsRepo.getAllIncludingInactive(),
  ]);

  const data: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    wallets,
    wallet_balance_history: history,
    transactions,
    loan_counterparties: counterparties,
    loan_entries: entries,
    custom_reports: reports,
  };

  const json = JSON.stringify(data);
  const blob = await compressToBlob(json);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pfintrack-backup-${new Date().toISOString().slice(0, 10)}.json.gz`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function compressToBlob(text: string): Promise<Blob> {
  const encoded = new TextEncoder().encode(text);
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(encoded);
  void writer.close();
  return new Response(stream.readable).blob();
}

async function decompressBlob(blob: Blob): Promise<string> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(await blob.arrayBuffer());
  void writer.close();
  const decompressed = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(decompressed);
}

export async function deleteAllData(): Promise<void> {
  if (STORAGE_BACKEND === "idb") {
    await Promise.all([
      idbClearStore("wallets"),
      idbClearStore("wallet_balance_history"),
      idbClearStore("transactions"),
      idbClearStore("loan_counterparties"),
      idbClearStore("loan_entries"),
      idbClearStore("custom_reports"),
    ]);
  } else {
    writeKey("wallets", []);
    writeKey("wallet_balance_history", []);
    writeKey("transactions", []);
    writeKey("loan_counterparties", []);
    writeKey("loan_entries", []);
    writeKey("custom_reports", []);
  }
  // Reset onboarding flags so welcome screen shows again
  localStorage.removeItem("pfintrack_demo_mode");
  localStorage.removeItem("pfintrack_welcomed");
}

export async function importBackup(file: File): Promise<void> {
  let text: string;
  try {
    text = file.name.endsWith(".gz")
      ? await decompressBlob(file)
      : await file.text();
  } catch {
    throw new Error("invalid_json");
  }
  let data: BackupData;
  try {
    data = JSON.parse(text) as BackupData;
  } catch {
    throw new Error("invalid_json");
  }
  if (data.version !== 1) throw new Error("unsupported_version");

  if (STORAGE_BACKEND === "idb") {
    await Promise.all([
      idbClearStore("wallets"),
      idbClearStore("wallet_balance_history"),
      idbClearStore("transactions"),
      idbClearStore("loan_counterparties"),
      idbClearStore("loan_entries"),
      idbClearStore("custom_reports"),
    ]);
    await Promise.all([
      walletsIdbRepo.putAll(data.wallets ?? []),
      walletBalanceHistoryIdbRepo.putAll(data.wallet_balance_history ?? []),
      transactionsIdbRepo.putAll(data.transactions ?? []),
      loanCounterpartiesIdbRepo.putAll(data.loan_counterparties ?? []),
      loanEntriesIdbRepo.putAll(data.loan_entries ?? []),
      customReportsIdbRepo.putAll(data.custom_reports ?? []),
    ]);
  } else {
    writeKey("wallets", data.wallets ?? []);
    writeKey("wallet_balance_history", data.wallet_balance_history ?? []);
    writeKey("transactions", data.transactions ?? []);
    writeKey("loan_counterparties", data.loan_counterparties ?? []);
    writeKey("loan_entries", data.loan_entries ?? []);
    writeKey("custom_reports", data.custom_reports ?? []);
  }
}
