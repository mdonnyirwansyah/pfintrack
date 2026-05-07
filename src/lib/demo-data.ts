/**
 * Demo Mode helpers — inject and clear realistic sample data.
 * Covers a full month (~30 days) with 50+ transactions across 3 wallets,
 * 3 loan counterparties, and 6 expense categories.
 */

import { walletsRepo } from "@/lib/storage/wallets";
import { transactionsRepo } from "@/lib/storage/transactions";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";
import { applyTransactionToWallet, applyLoanEntryToWallet } from "@/lib/storage/wallet-balance-ops";
import { STORAGE_BACKEND } from "@/lib/storage/config";
import { idbClearStore } from "@/lib/storage/idb-client";
import { writeKey } from "@/lib/storage/base";

/** ISO date N days before today */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Mirror of useWalletActions.handleCreate: create wallet at 0, then apply initial balance via Balance Correction transaction. */
async function createWalletWithBalance(
  name: string,
  wallet_type: Parameters<typeof walletsRepo.create>[0]["wallet_type"],
  initialBalance: number,
  daysBack: number
) {
  const wallet = await walletsRepo.create({ name, wallet_type, balance: 0 });
  if (initialBalance > 0) {
    await walletBalanceHistoryRepo.create({
      wallet_id: wallet.id,
      previous_balance: 0,
      new_balance: initialBalance,
    });
    const tx = await transactionsRepo.create({
      type: "income",
      wallet_id: wallet.id,
      amount: initialBalance,
      title: "Balance Correction",
      category: "Balance Correction",
      transaction_date: daysAgo(daysBack),
      transaction_time: "07:00",
    });
    await applyTransactionToWallet(tx);
  }
  return wallet;
}

/** Mirror of useWalletActions.handleUpdate: apply a manual balance correction as a transaction. */
async function applyBalanceCorrection(
  walletId: string,
  previousBalance: number,
  newBalance: number,
  daysBack: number,
  time: string
) {
  const delta = newBalance - previousBalance;
  if (delta === 0) return;
  await walletBalanceHistoryRepo.create({
    wallet_id: walletId,
    previous_balance: previousBalance,
    new_balance: newBalance,
  });
  const tx = await transactionsRepo.create({
    type: delta > 0 ? "income" : "expense",
    wallet_id: walletId,
    amount: Math.abs(delta),
    title: "Balance Correction",
    category: "Balance Correction",
    transaction_date: daysAgo(daysBack),
    transaction_time: time,
  });
  await applyTransactionToWallet(tx);
}

type TxDef = {
  type: "income" | "expense" | "transfer";
  walletId: string;
  destId?: string;
  amount: number;
  title: string;
  category: string;
  daysBack: number;
  time: string;
  description?: string;
};

export async function injectDemoData(): Promise<void> {
  // ── Wallets ───────────────────────────────────────────────────────────────
  // Each wallet is initialized with an opening balance via a Balance Correction transaction,
  // mirroring the useWalletActions.handleCreate flow in production.
  const bca   = await createWalletWithBalance("BCA",   "bank",     3_500_000, 33);
  const gopay = await createWalletWithBalance("GoPay", "e_wallet", 0,         33); // starts at 0
  const tunai = await createWalletWithBalance("Tunai", "other",    750_000,   33);

  // Simulate a manual BCA balance edit after reconciling with the passbook
  // (discrepancy from an overlooked admin fee — mid-April)
  await applyBalanceCorrection(bca.id, 3_500_000, 3_450_000, 20, "09:00");

  // ── Transactions — 1 month full (today = day 0, ~30 days back) ──────────
  //
  // Structure: monthly salary at month-start, regular top-ups, daily spending, monthly
  // bills, entertainment, transportation, health, education, and freelance income.
  //
  const txDefs: TxDef[] = [
    // ── Week 1: Apr 1–7 (30–26 days ago) ───────────────────────────────
    { type: "income",   walletId: bca.id,   amount: 9_500_000, title: "Gaji Bulan April",        category: "Pendapatan",        daysBack: 32, time: "08:00", description: "Gaji bulanan April 2026" },
    { type: "transfer", walletId: bca.id,   destId: gopay.id,  amount: 1_200_000, title: "Top Up GoPay",            category: "Transfer",          daysBack: 32, time: "08:15" },
    { type: "transfer", walletId: bca.id,   destId: tunai.id,  amount: 700_000,   title: "Ambil Tunai",             category: "Transfer",          daysBack: 32, time: "08:30" },
    { type: "expense",  walletId: bca.id,   amount: 850_000,   title: "Belanja Bulanan",          category: "Makanan & Minuman", daysBack: 32, time: "10:30", description: "Belanja kebutuhan bulanan di supermarket" },
    { type: "expense",  walletId: bca.id,   amount: 420_000,   title: "Tagihan Listrik",          category: "Tagihan",           daysBack: 31, time: "09:00" },
    { type: "expense",  walletId: bca.id,   amount: 265_000,   title: "Internet Rumah",           category: "Tagihan",           daysBack: 31, time: "09:05" },
    { type: "expense",  walletId: bca.id,   amount: 160_000,   title: "BPJS Kesehatan",           category: "Tagihan",           daysBack: 31, time: "09:10" },
    { type: "expense",  walletId: tunai.id, amount: 165_000,   title: "Bensin",                   category: "Transportasi",      daysBack: 31, time: "07:00" },
    { type: "expense",  walletId: gopay.id, amount: 55_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack: 30, time: "12:30" },
    { type: "expense",  walletId: tunai.id, amount: 28_000,    title: "Kopi & Snack",             category: "Makanan & Minuman", daysBack: 30, time: "08:45" },
    { type: "expense",  walletId: bca.id,   amount: 275_000,   title: "Beli Buku & Alat Tulis",   category: "Pendidikan",        daysBack: 29, time: "15:00" },
    { type: "expense",  walletId: gopay.id, amount: 42_000,    title: "Ojek Online",              category: "Transportasi",      daysBack: 29, time: "08:10" },
    { type: "expense",  walletId: gopay.id, amount: 62_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack: 28, time: "19:00" },
    { type: "expense",  walletId: gopay.id, amount: 54_990,    title: "Spotify Premium",          category: "Hiburan",           daysBack: 28, time: "10:00" },
    { type: "expense",  walletId: bca.id,   amount: 65_000,    title: "Netflix",                  category: "Hiburan",           daysBack: 28, time: "10:05" },
    { type: "expense",  walletId: gopay.id, amount: 95_000,    title: "GrabFood",                 category: "Makanan & Minuman", daysBack: 27, time: "12:00", description: "Makan siang diantar" },
    { type: "expense",  walletId: tunai.id, amount: 32_000,    title: "Sarapan Warung",           category: "Makanan & Minuman", daysBack: 27, time: "07:30" },
    { type: "expense",  walletId: bca.id,   amount: 85_000,    title: "Nonton Bioskop",           category: "Hiburan",           daysBack: 26, time: "19:30", description: "Nonton bareng teman" },
    { type: "expense",  walletId: gopay.id, amount: 68_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack: 26, time: "12:15" },

    // ── Week 2: Apr 8–14 (25–19 days ago) ──────────────────────────────
    { type: "expense",  walletId: gopay.id, amount: 45_000,    title: "Ojek Online",              category: "Transportasi",      daysBack: 25, time: "07:45" },
    { type: "expense",  walletId: bca.id,   amount: 125_000,   title: "Apotek",                   category: "Kesehatan",         daysBack: 25, time: "18:00", description: "Beli obat flu dan vitamin" },
    { type: "expense",  walletId: tunai.id, amount: 35_000,    title: "Kopi & Snack",             category: "Makanan & Minuman", daysBack: 24, time: "09:00" },
    { type: "expense",  walletId: gopay.id, amount: 78_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack: 24, time: "19:30" },
    { type: "expense",  walletId: bca.id,   amount: 480_000,   title: "Baju & Sepatu",            category: "Belanja",           daysBack: 23, time: "14:00", description: "Beli baju kerja baru" },
    { type: "expense",  walletId: gopay.id, amount: 110_000,   title: "GrabFood",                 category: "Makanan & Minuman", daysBack: 22, time: "11:45" },
    { type: "expense",  walletId: gopay.id, amount: 35_000,    title: "Ojek Online",              category: "Transportasi",      daysBack: 22, time: "08:00" },
    { type: "income",   walletId: bca.id,   amount: 2_500_000, title: "Freelance Web Design",     category: "Pendapatan",        daysBack: 21, time: "14:00", description: "Project website klien baru" },
    { type: "expense",  walletId: tunai.id, amount: 22_000,    title: "Sarapan",                  category: "Makanan & Minuman", daysBack: 21, time: "07:15" },
    { type: "expense",  walletId: gopay.id, amount: 72_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack: 20, time: "12:30" },
    { type: "expense",  walletId: bca.id,   amount: 199_000,   title: "Kursus Online",            category: "Pendidikan",        daysBack: 20, time: "20:00", description: "Langganan platform belajar" },
    { type: "expense",  walletId: tunai.id, amount: 165_000,   title: "Bensin",                   category: "Transportasi",      daysBack: 19, time: "07:00" },
    { type: "expense",  walletId: gopay.id, amount: 88_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack: 19, time: "19:00" },

    // ── Week 3: Apr 15–21 (18–12 days ago) ─────────────────────────────
    { type: "transfer", walletId: bca.id,   destId: gopay.id,  amount: 1_500_000, title: "Top Up GoPay",            category: "Transfer",          daysBack: 18, time: "08:00" },
    { type: "transfer", walletId: bca.id,   destId: tunai.id,  amount: 400_000,   title: "Ambil Tunai",             category: "Transfer",          daysBack: 18, time: "08:10" },
    { type: "expense",  walletId: gopay.id, amount: 48_000,    title: "Ojek Online",              category: "Transportasi",      daysBack: 18, time: "08:30" },
    { type: "expense",  walletId: gopay.id, amount: 105_000,   title: "GrabFood",                 category: "Makanan & Minuman", daysBack: 17, time: "12:00" },
    { type: "expense",  walletId: tunai.id, amount: 25_000,    title: "Kopi Pagi",                category: "Makanan & Minuman", daysBack: 17, time: "08:00" },
    { type: "expense",  walletId: bca.id,   amount: 350_000,   title: "Belanja Mingguan",         category: "Makanan & Minuman", daysBack: 16, time: "10:00", description: "Belanja sayur dan kebutuhan dapur" },
    { type: "expense",  walletId: gopay.id, amount: 150_000,   title: "Top-Up Game",              category: "Hiburan",           daysBack: 16, time: "21:00" },
    { type: "expense",  walletId: gopay.id, amount: 62_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack: 15, time: "12:30" },
    { type: "expense",  walletId: bca.id,   amount: 195_000,   title: "Vitamin & Suplemen",       category: "Kesehatan",         daysBack: 15, time: "17:00" },
    { type: "expense",  walletId: tunai.id, amount: 20_000,    title: "Parkir",                   category: "Transportasi",      daysBack: 14, time: "10:30" },
    { type: "expense",  walletId: gopay.id, amount: 82_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack: 14, time: "19:15" },
    { type: "expense",  walletId: bca.id,   amount: 380_000,   title: "Peralatan Rumah",          category: "Belanja",           daysBack: 13, time: "15:00", description: "Beli ember dan peralatan bersih-bersih" },
    { type: "expense",  walletId: gopay.id, amount: 38_000,    title: "Kopi & Snack",             category: "Makanan & Minuman", daysBack: 13, time: "09:30" },
    { type: "expense",  walletId: gopay.id, amount: 92_000,    title: "GrabFood",                 category: "Makanan & Minuman", daysBack: 12, time: "12:00" },

    // ── Week 4: Apr 22–30 (11–3 days ago) ──────────────────────────────
    { type: "expense",  walletId: tunai.id, amount: 165_000,   title: "Bensin",                   category: "Transportasi",      daysBack: 11, time: "07:00" },
    { type: "expense",  walletId: gopay.id, amount: 55_000,    title: "Ojek Online",              category: "Transportasi",      daysBack: 11, time: "08:00" },
    { type: "expense",  walletId: gopay.id, amount: 75_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack: 10, time: "12:30" },
    { type: "expense",  walletId: bca.id,   amount: 59_000,    title: "YouTube Premium",          category: "Hiburan",           daysBack: 10, time: "10:00" },
    { type: "income",   walletId: bca.id,   amount: 1_200_000, title: "Bonus Proyek",             category: "Pendapatan",        daysBack:  9, time: "10:00", description: "Bonus penyelesaian project sebelum deadline" },
    { type: "expense",  walletId: gopay.id, amount: 115_000,   title: "Makan Bersama Teman",      category: "Makanan & Minuman", daysBack:  9, time: "19:00" },
    { type: "expense",  walletId: bca.id,   amount: 420_000,   title: "Belanja Mingguan",         category: "Makanan & Minuman", daysBack:  8, time: "10:30" },
    { type: "expense",  walletId: gopay.id, amount: 42_000,    title: "Ojek Online",              category: "Transportasi",      daysBack:  8, time: "08:15" },
    { type: "expense",  walletId: gopay.id, amount: 68_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack:  7, time: "19:30" },
    { type: "expense",  walletId: tunai.id, amount: 33_000,    title: "Sarapan",                  category: "Makanan & Minuman", daysBack:  7, time: "07:00" },
    { type: "expense",  walletId: gopay.id, amount: 98_000,    title: "GrabFood",                 category: "Makanan & Minuman", daysBack:  6, time: "12:15" },
    { type: "expense",  walletId: bca.id,   amount: 85_000,    title: "Nonton Bioskop",           category: "Hiburan",           daysBack:  5, time: "20:00" },
    { type: "expense",  walletId: gopay.id, amount: 45_000,    title: "Kopi & Snack",             category: "Makanan & Minuman", daysBack:  5, time: "09:15" },
    { type: "expense",  walletId: gopay.id, amount: 62_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack:  4, time: "12:30" },
    { type: "expense",  walletId: bca.id,   amount: 185_000,   title: "Cek Kesehatan",            category: "Kesehatan",         daysBack:  4, time: "10:00", description: "Medical check-up rutin" },
    { type: "expense",  walletId: tunai.id, amount: 165_000,   title: "Bensin",                   category: "Transportasi",      daysBack:  3, time: "07:00" },
    { type: "expense",  walletId: gopay.id, amount: 88_000,    title: "Makan Malam",              category: "Makanan & Minuman", daysBack:  3, time: "19:00" },

    // ── Early May (2–0 days ago) ─────────────────────────────────────────
    { type: "income",   walletId: bca.id,   amount: 9_500_000, title: "Gaji Bulan Mei",           category: "Pendapatan",        daysBack:  2, time: "08:00", description: "Gaji bulanan Mei 2026" },
    { type: "transfer", walletId: bca.id,   destId: gopay.id,  amount: 600_000,   title: "Top Up GoPay",            category: "Transfer",          daysBack:  2, time: "08:15" },
    { type: "transfer", walletId: bca.id,   destId: tunai.id,  amount: 400_000,   title: "Ambil Tunai",             category: "Transfer",          daysBack:  2, time: "08:20" },
    { type: "expense",  walletId: bca.id,   amount: 420_000,   title: "Tagihan Listrik",          category: "Tagihan",           daysBack:  2, time: "09:00" },
    { type: "expense",  walletId: bca.id,   amount: 265_000,   title: "Internet Rumah",           category: "Tagihan",           daysBack:  2, time: "09:05" },
    { type: "expense",  walletId: bca.id,   amount: 160_000,   title: "BPJS Kesehatan",           category: "Tagihan",           daysBack:  2, time: "09:10" },
    { type: "expense",  walletId: gopay.id, amount: 52_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack:  2, time: "12:30" },
    { type: "expense",  walletId: tunai.id, amount: 28_000,    title: "Sarapan",                  category: "Makanan & Minuman", daysBack:  1, time: "07:30" },
    { type: "income",   walletId: gopay.id, amount: 450_000,   title: "Jual Barang Bekas",        category: "Pendapatan",        daysBack:  1, time: "14:00", description: "Jual laptop lama" },
    { type: "expense",  walletId: gopay.id, amount: 79_000,    title: "GrabFood",                 category: "Makanan & Minuman", daysBack:  1, time: "12:00" },
    { type: "expense",  walletId: tunai.id, amount: 15_000,    title: "Parkir",                   category: "Transportasi",      daysBack:  1, time: "09:00" },
    { type: "expense",  walletId: gopay.id, amount: 45_000,    title: "Kopi Pagi",                category: "Makanan & Minuman", daysBack:  0, time: "07:45" },
    { type: "expense",  walletId: gopay.id, amount: 38_000,    title: "Ojek Online",              category: "Transportasi",      daysBack:  0, time: "08:30" },
    { type: "expense",  walletId: gopay.id, amount: 68_000,    title: "Makan Siang",              category: "Makanan & Minuman", daysBack:  0, time: "12:30" },
  ];

  for (const def of txDefs) {
    const tx = await transactionsRepo.create({
      type: def.type,
      wallet_id: def.walletId,
      destination_wallet_id: def.destId ?? null,
      amount: def.amount,
      title: def.title,
      category: def.category,
      description: def.description ?? null,
      transaction_date: daysAgo(def.daysBack),
      transaction_time: def.time,
    });
    await applyTransactionToWallet(tx);
  }

  // ── Loan counterparties & entries ─────────────────────────────────────────
  // Budi — receivable (we lent money, not yet repaid)
  const budi = await loanCounterpartiesRepo.create({ name: "Budi" });
  const budiloan1 = await loanEntriesRepo.create({
    counterparty_id: budi.id,
    type: "give",
    amount: 800_000,
    wallet_id: bca.id,
    note: "Pinjam untuk beli HP baru",
    transaction_date: daysAgo(20),
    transaction_time: "15:00",
  });
  await applyLoanEntryToWallet(budiloan1);
  const budiloan2 = await loanEntriesRepo.create({
    counterparty_id: budi.id,
    type: "get",
    amount: 300_000,
    wallet_id: tunai.id,
    note: "Bayar sebagian",
    transaction_date: daysAgo(10),
    transaction_time: "11:00",
  });
  await applyLoanEntryToWallet(budiloan2);

  // Sinta — payable (we borrowed, fully repaid)
  const sinta = await loanCounterpartiesRepo.create({ name: "Sinta" });
  const sintaloan1 = await loanEntriesRepo.create({
    counterparty_id: sinta.id,
    type: "get",
    amount: 500_000,
    wallet_id: gopay.id,
    note: "Patungan bayar sewa tempat acara",
    transaction_date: daysAgo(28),
    transaction_time: "10:00",
  });
  await applyLoanEntryToWallet(sintaloan1);
  const sintaloan2 = await loanEntriesRepo.create({
    counterparty_id: sinta.id,
    type: "give",
    amount: 500_000,
    wallet_id: gopay.id,
    note: "Lunas",
    transaction_date: daysAgo(14),
    transaction_time: "09:00",
  });
  await applyLoanEntryToWallet(sintaloan2);

  // Andi — receivable for business capital, not yet repaid
  const andi = await loanCounterpartiesRepo.create({ name: "Andi" });
  const andiloan1 = await loanEntriesRepo.create({
    counterparty_id: andi.id,
    type: "give",
    amount: 1_500_000,
    wallet_id: bca.id,
    note: "Modal usaha warung makan",
    transaction_date: daysAgo(25),
    transaction_time: "13:00",
  });
  await applyLoanEntryToWallet(andiloan1);

  // ── Set demo flag ─────────────────────────────────────────────────────────
  if (typeof window !== "undefined") {
    window.localStorage.setItem("pfintrack_demo_mode", "true");
  }
}

export async function clearDemoData(): Promise<void> {
  if (typeof window === "undefined") return;

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

  window.localStorage.removeItem("pfintrack_demo_mode");
  window.location.reload();
}
