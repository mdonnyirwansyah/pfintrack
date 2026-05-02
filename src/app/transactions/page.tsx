"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  ArrowRightLeft,
  TrendingUp,
  ShoppingCart,
  ArrowUpDown,
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
import { useTranslations } from "next-intl";
import { useSwipe } from "@/hooks/useSwipe";
import { toast } from "sonner";

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { transactions, isLoading, loadTransactions, softDeleteTransaction } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const t = useTranslations("transactions");

  // Init activeDate dari ?date= query param, fallback ke hari ini
  const dateParam = searchParams.get("date");
  const [activeDate, setActiveDate] = useState(dateParam ?? todayISO());
  const [isExporting, setIsExporting] = useState(false);
  const [sortKey, setSortKey] = useState<"datetime_desc" | "datetime_asc" | "amount_desc" | "amount_asc">("datetime_desc");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const dailyTransactions = [...rawDailyTransactions].sort((a, b) => {
    if (sortKey === "datetime_desc") {
      const t = b.transaction_time.localeCompare(a.transaction_time);
      return t !== 0 ? t : b.created_at.localeCompare(a.created_at);
    }
    if (sortKey === "datetime_asc") {
      const t = a.transaction_time.localeCompare(b.transaction_time);
      return t !== 0 ? t : a.created_at.localeCompare(b.created_at);
    }
    if (sortKey === "amount_desc") return b.amount - a.amount;
    return a.amount - b.amount; // amount_asc
  });

  const handleConfirmDelete = useCallback((id: string) => {
    // Hide immediately from UI
    setPendingDeletes((prev) => new Set([...prev, id]));

    // Show undo toast
    const toastId = toast(t("deleteUndo.message"), {
      duration: 5000,
      action: {
        label: t("deleteUndo.undo"),
        onClick: () => {
          // Cancel deletion — restore item
          const timer = pendingTimers.current.get(id);
          if (timer) clearTimeout(timer);
          pendingTimers.current.delete(id);
          setPendingDeletes((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });

    // Schedule actual delete after 5s
    const timer = setTimeout(() => {
      toast.dismiss(toastId);
      softDeleteTransaction(id);
      pendingTimers.current.delete(id);
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 5000);

    pendingTimers.current.set(id, timer);
  }, [t, softDeleteTransaction]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handleDateChange(format(addDays(parseISO(activeDate), 1), "yyyy-MM-dd")),
    onSwipeRight: () => handleDateChange(format(subDays(parseISO(activeDate), 1), "yyyy-MM-dd")),
  });

  const SORT_OPTIONS = [
    { key: "datetime_desc" as const, label: t("sort.datetime_desc") },
    { key: "datetime_asc" as const, label: t("sort.datetime_asc") },
    { key: "amount_desc" as const, label: t("sort.amount_desc") },
    { key: "amount_asc" as const, label: t("sort.amount_asc") },
  ];

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
            <div className="relative">
              <button
                onClick={() => setIsSortOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                style={{
                  background: sortKey !== "datetime_desc" ? "var(--color-brand)" : "var(--bg-secondary)",
                  color: sortKey !== "datetime_desc" ? "var(--text-on-primary)" : "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {t(`sort.${sortKey}`)}
              </button>

              {isSortOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSortOpen(false)}
                  />
                  {/* Dropdown */}
                  <div
                    className="absolute right-0 top-full mt-1 z-50 rounded-[12px] overflow-hidden py-1 min-w-[130px]"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-default)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortKey(opt.key);
                          setIsSortOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors"
                        style={{
                          color: sortKey === opt.key ? "var(--color-brand)" : "var(--text-primary)",
                          background: sortKey === opt.key ? "var(--color-brand-soft)" : "transparent",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
