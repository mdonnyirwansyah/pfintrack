"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  ArrowRightLeft,
  TrendingUp,
  ShoppingCart,
  FileText,
  Sparkles,
  PlayCircle,
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
import { useTranslations } from "next-intl";
import { useSwipe } from "@/hooks/useSwipe";
import { toast } from "sonner";
import { injectDemoData } from "@/lib/demo-data";

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transactions, isLoading, loadTransactions, softDeleteTransaction } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [dismissedWelcome, setDismissedWelcome] = useState(
    () => globalThis.window !== undefined && !!globalThis.localStorage.getItem("pfintrack_welcomed"),
  );
  const t = useTranslations("transactions");
  const td = useTranslations("demo.welcome");

  // Initialize activeDate from ?date= query param, fallback to today
  const dateParam = searchParams.get("date");
  const [activeDate, setActiveDate] = useState(dateParam ?? todayISO());
  const [isExporting, setIsExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // Update state and sync URL together to avoid timing issues from useEffect
  const handleDateChange = (date: string) => {
    setActiveDate(date);
    router.replace(`/transactions?date=${date}`, { scroll: false });
  };

  useEffect(() => {
    loadTransactions();
    void loadWallets();
  }, [loadTransactions, loadWallets]);

  const rawDailyTransactions = useMemo(
    () => selectByDate(transactions, activeDate).filter((tx) => !pendingDeletes.has(tx.id)),
    [transactions, activeDate, pendingDeletes],
  );
  const summary = useMemo(() => computeDailySummary(rawDailyTransactions), [rawDailyTransactions]);
  const dailyTransactions = useMemo(() => applySortKey(rawDailyTransactions, sortKey), [rawDailyTransactions, sortKey]);

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
      const allTxns = await transactionsRepo.getAll();
      const anonId = getOrCreateAnonId();
      const allWallets = await walletsRepo.getAll();

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

      const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const shortId = anonId.slice(0, 8);
      XLSX.writeFile(wb, `transactions_${shortId}_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const fabActions = useMemo(() => [
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
  ], [activeDate, router, t]);

  return (
    <>
      <AppHeader
        title={t("title")}
        actions={
          <div className="flex items-center gap-1">
            <button
              data-tour="tx-export"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity disabled:opacity-40"
              style={{
                minWidth: "var(--tap-target-min)",
                minHeight: "var(--tap-target-min)",
                color: "var(--text-primary)",
              }}
              aria-label={t("exportAriaLabel")}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              data-tour="tx-history"
              onClick={() => router.push("/transactions/history")}
              className="flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
              style={{
                minWidth: "var(--tap-target-min)",
                minHeight: "var(--tap-target-min)",
                color: "var(--text-primary)",
              }}
              aria-label={t("historyAriaLabel")}
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="pt-2 pb-24" {...swipeHandlers}>
        {/* Date navigator */}
        <div data-tour="tx-date-nav">
          <DateNavigator activeDate={activeDate} onDateChange={handleDateChange} />
        </div>

        {/* Summary bar */}
        <div data-tour="tx-summary">
          <SummaryBar
            income={summary.income}
            expenses={summary.expenses}
            balance={summary.balance}
          />
        </div>

        {/* Sort bar — only show when there are transactions */}
        {!isLoading && dailyTransactions.length > 0 && (
          <div className="px-4 mb-2 flex items-center justify-end">
            <span data-tour="transactions-filter-bar">
              <SortPill value={sortKey} onChange={setSortKey} />
            </span>
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
                    globalThis.localStorage.setItem("pfintrack_welcomed", "true");
                    void injectDemoData().then(() => globalThis.location.reload());
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
                    globalThis.localStorage.setItem("pfintrack_welcomed", "true");
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
        {(() => {
          if (isLoading) {
            return (
              <div className="px-4 space-y-3 mt-2">
                {["sk-a", "sk-b", "sk-c", "sk-d"].map((id) => (
                  <div
                    key={id}
                    className="h-[52px] rounded-[16px] animate-pulse"
                    style={{ background: "var(--bg-secondary)" }}
                  />
                ))}
              </div>
            );
          }
          if (dailyTransactions.length === 0) {
            return (
              <EmptyState
                icon={FileText}
                title={t("noData")}
                description={t("noDataDesc")}
              />
            );
          }
          return (
            <ul
              className="mx-4 glass rounded-[16px] overflow-hidden list-none"
            >
              {dailyTransactions.map((tx, idx) => (
                <li key={tx.id}>
                  {idx > 0 && (
                    <div
                      className="mx-4"
                      style={{ height: "1px", background: "var(--divider)" }}
                    />
                  )}
                  <TransactionItem transaction={tx} wallets={wallets} onConfirmDelete={handleConfirmDelete} />
                </li>
              ))}
            </ul>
          );
        })()}
      </div>

      <FABExpandable actions={fabActions} data-tour="fab-transactions" />
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
