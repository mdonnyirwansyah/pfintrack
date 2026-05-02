"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  History,
  ArrowRightLeft,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FABExpandable } from "@/components/shared/FABExpandable";
import { EmptyState } from "@/components/shared/EmptyState";
import { DateNavigator } from "./_components/DateNavigator";
import { SummaryBar } from "./_components/SummaryBar";
import { TransactionItem } from "./_components/TransactionItem";
import { useTransactionStore, selectByDate, computeDailySummary } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { todayISO } from "@/lib/format/date";
import { walletsRepo } from "@/lib/storage/wallets";
import { transactionsRepo } from "@/lib/storage/transactions";
import { getOrCreateAnonId } from "@/lib/storage/anon-id";
import { FileText } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, isLoading, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [activeDate, setActiveDate] = useState(todayISO());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const dailyTransactions = selectByDate(transactions, activeDate);
  const summary = computeDailySummary(dailyTransactions);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Lazy load xlsx
      const XLSX = await import("xlsx");
      const allTxns = transactionsRepo.getAll();
      const anonId = getOrCreateAnonId();
      const allWallets = walletsRepo.getAll();

      const walletMap = new Map(allWallets.map((w) => [w.id, w.name]));

      const rows = allTxns.map((t) => ({
        Date: t.transaction_date,
        Time: t.transaction_time,
        Type: t.type,
        Wallet: walletMap.get(t.wallet_id) ?? t.wallet_id,
        "Destination Wallet": t.destination_wallet_id
          ? (walletMap.get(t.destination_wallet_id) ?? t.destination_wallet_id)
          : "",
        Amount: t.amount,
        Title: t.title ?? "",
        Category: t.category ?? "",
        Description: t.description ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const shortId = anonId.slice(0, 8);
      XLSX.writeFile(wb, `transactions_${shortId}_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const fabActions = [
    {
      label: "Expense",
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
      color: "var(--color-negative)",
      onClick: () => router.push("/transactions/add/expense"),
    },
    {
      label: "Income",
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      color: "var(--color-accent-warm)",
      onClick: () => router.push("/transactions/add/income"),
    },
    {
      label: "Transfer",
      icon: <ArrowRightLeft className="w-5 h-5 text-white" />,
      color: "var(--text-secondary)",
      onClick: () => router.push("/transactions/add/transfer"),
    },
  ];

  return (
    <>
      <AppHeader
        title="Transactions"
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity disabled:opacity-40"
              style={{
                minWidth: "var(--tap-target-min)",
                minHeight: "var(--tap-target-min)",
                color: "var(--text-primary)",
              }}
              aria-label="Export to Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/transactions/history")}
              className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
              style={{
                minWidth: "var(--tap-target-min)",
                minHeight: "var(--tap-target-min)",
                color: "var(--text-primary)",
              }}
              aria-label="Transaction history"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="pt-2">
        {/* Date navigator */}
        <DateNavigator activeDate={activeDate} onDateChange={setActiveDate} />

        {/* Summary bar */}
        <SummaryBar
          income={summary.income}
          expenses={summary.expenses}
          balance={summary.balance}
        />

        {/* Transaction list */}
        {isLoading ? (
          <div className="px-4 space-y-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-[16px] animate-pulse"
                style={{ background: "var(--bg-secondary)" }}
              />
            ))}
          </div>
        ) : dailyTransactions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="There is no data"
            description="No transactions on this day. Tap + to add one."
          />
        ) : (
          <div
            className="mx-4 rounded-[16px] overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {dailyTransactions.map((tx, idx) => (
              <div key={tx.id}>
                {idx > 0 && (
                  <div
                    className="mx-4"
                    style={{ height: "1px", background: "var(--divider)" }}
                  />
                )}
                <TransactionItem transaction={tx} wallets={wallets} />
              </div>
            ))}
          </div>
        )}
      </div>

      <FABExpandable actions={fabActions} />
    </>
  );
}
