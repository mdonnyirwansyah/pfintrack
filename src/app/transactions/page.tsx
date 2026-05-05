"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
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
import { SortPill, SortKey, applySortKey } from "@/components/shared/SortPill";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { todayISO } from "@/lib/format/date";
import { walletsRepo } from "@/lib/storage/wallets";
import { transactionsRepo } from "@/lib/storage/transactions";
import { getOrCreateAnonId } from "@/lib/storage/anon-id";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSwipe } from "@/hooks/useSwipe";
import { toast } from "sonner";
import { injectDemoData } from "@/lib/demo-data";
import { Sparkles, PlayCircle } from "lucide-react";

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transactions, isLoading, loadTransactions, softDeleteTransaction } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [dismissedWelcome, setDismissedWelcome] = useState(false);
  const t = useTranslations("transactions");
  const td = useTranslations("demo.welcome");

  // Init activeDate dari ?date= query param, fallback ke hari ini
  const dateParam = searchParams.get("date");
  const [activeDate, setActiveDate] = useState(dateParam ?? todayISO());
  const [isExporting, setIsExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // Update state + sync URL sekaligus, hindari useEffect agar tidak ada timing issue
  const handleDateChange = (date: string) => {
    setActiveDate(date);
    router.replace(`/transactions?date=${date}`, { scroll: false });
  };

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const rawDailyTransactions = selectByDate(transactions, activeDate)
    .filter((tx) => !pendingDeletes.has(tx.id));
  const summary = computeDailySummary(rawDailyTransactions);

  const dailyTransactions = applySortKey(rawDailyTransactions, sortKey);

  const handleConfirmDelete = useCallback((id: string) => {
    // Hide immediately from UI
    setPendingDeletes((prev) => new Set([...prev, id]));

    let isUndone = false;
    let isDeleted = false;

    const finalizeDelete = () => {
      if (isUndone || isDeleted) return;
      isDeleted = true;
      softDeleteTransaction(id);
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };

    toast(t("deleteUndo.message"), {
      duration: 5000,
      onDismiss: finalizeDelete,
      onAutoClose: finalizeDelete,
      action: {
        label: t("deleteUndo.undo"),
        onClick: () => {
          isUndone = true;
          setPendingDeletes((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });
  }, [t, softDeleteTransaction]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleDateChange(format(addDays(parseISO(activeDate), 1), "yyyy-MM-dd")),
    onSwipeRight: () => handleDateChange(format(subDays(parseISO(activeDate), 1), "yyyy-MM-dd")),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
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
      label: t("fab.expense"),
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
      color: "var(--color-negative)",
      onClick: () => router.push(`/transactions/add/expense?date=${activeDate}`),
    },
    {
      label: t("fab.income"),
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      color: "var(--color-accent-warm)",
      onClick: () => router.push(`/transactions/add/income?date=${activeDate}`),
    },
    {
      label: t("fab.transfer"),
      icon: <ArrowRightLeft className="w-5 h-5 text-white" />,
      color: "var(--text-secondary)",
      onClick: () => router.push(`/transactions/add/transfer?date=${activeDate}`),
    },
  ];

  return (
    <>
      <AppHeader
        title={t("title")}
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

      <div className="pt-2" {...swipeHandlers}>
        {/* Date navigator */}
        <DateNavigator activeDate={activeDate} onDateChange={handleDateChange} />

        {/* Summary bar */}
        <SummaryBar
          income={summary.income}
          expenses={summary.expenses}
          balance={summary.balance}
        />

        {/* Sort bar — only show when there are transactions */}
        {!isLoading && dailyTransactions.length > 0 && (
          <div className="px-4 mb-2 flex items-center justify-end">
            <SortPill value={sortKey} onChange={setSortKey} />
          </div>
        )}

        {/* Welcome card — shown only when app is completely empty for the first time */}
        {!isLoading && !dismissedWelcome && wallets.length === 0 && transactions.length === 0 && (
          <div className="px-4 mt-4">
            <div
              className="glass rounded-[20px] p-5 flex flex-col gap-4"
              style={{ border: "1px solid var(--border-glass)" }}
            >
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {td("title")}
                </h2>
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {td("description")}
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    injectDemoData();
                    window.location.reload();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-[14px] font-semibold active:opacity-70 transition-opacity"
                  style={{
                    background: "var(--color-brand)",
                    color: "var(--text-on-primary)",
                    minHeight: "var(--tap-target-min)",
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  {td("exploreButton")}
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("pfintrack_demo_mode");
                    }
                    setDismissedWelcome(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-[14px] font-medium active:opacity-70 transition-opacity"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    minHeight: "var(--tap-target-min)",
                  }}
                >
                  <PlayCircle className="w-4 h-4" />
                  {td("startFreshButton")}
                </button>
              </div>
            </div>
          </div>
        )}

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
            title={t("noData")}
            description={t("noDataDesc")}
          />
        ) : (
          <div
            className="mx-4 glass rounded-[16px] overflow-hidden"
          >
            {dailyTransactions.map((tx, idx) => (
              <div key={tx.id}>
                {idx > 0 && (
                  <div
                    className="mx-4"
                    style={{ height: "1px", background: "var(--divider)" }}
                  />
                )}
                <TransactionItem transaction={tx} wallets={wallets} onConfirmDelete={handleConfirmDelete} />
              </div>
            ))}
          </div>
        )}
      </div>

      <FABExpandable actions={fabActions} />
    </>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
