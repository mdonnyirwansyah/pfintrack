"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PackageOpen, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { DonutChart } from "@/components/report/DonutChart";
import { DailySummarySection } from "@/components/report/DailySummarySection";
import { PeriodSummaryRows } from "@/components/report/PeriodSummaryRows";
import { SortPill, applySortKey } from "@/components/shared/SortPill";
import type { SortKey } from "@/components/shared/SortPill";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  calcCategoryBreakdown,
  calculateMonthlySummary,
  getTransactionsForCategory,
} from "@/lib/report/calculations";
import { transactionsRepo } from "@/lib/storage/transactions";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import { formatDateRange, formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry, LoanCounterparty } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type DonutMode = "expense" | "income";
type TxFilter = "all" | "expense" | "income" | "transfer";

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const nameParam = searchParams.get("name");
  const categoryParam = searchParams.get("category");
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const locale = useLocale();

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanEntries, setLoanEntries] = useState<LoanEntry[]>([]);
  const [loanCounterparties, setLoanCounterparties] = useState<LoanCounterparty[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<WalletBalanceHistory[]>([]);

  useEffect(() => {
    void Promise.all([
      transactionsRepo.getAll(),
      loanEntriesRepo.getAll(),
      loanCounterpartiesRepo.getAll(),
      walletBalanceHistoryRepo.getAll(),
    ]).then(([txns, loans, counterparties, history]) => {
      setTransactions(txns);
      setLoanEntries(loans);
      setLoanCounterparties(counterparties);
      setBalanceHistory(history);
    });
  }, []);

  // Donut toggle (local state, not sessionStorage — per-visit)
  const [donutMode, setDonutMode] = useState<DonutMode>("expense");

  // Category selection — reset on donut mode change
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam ?? null
  );

  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");

  // Transaction type filter — follows donut mode default
  const [txFilter, setTxFilter] = useState<TxFilter>(
    categoryParam ? "expense" : "expense"
  );

  // Category breakdown — respects donutMode
  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end, donutMode),
    [transactions, start, end, donutMode]
  );

  // Monthly summary for the summary card
  const summary = useMemo(
    () => calculateMonthlySummary(transactions, loanEntries, balanceHistory, start, end),
    [transactions, loanEntries, balanceHistory, start, end]
  );

  // Loan entries in the period
  const periodLoanEntries = useMemo(
    () =>
      loanEntries.filter(
        (e) =>
          e.is_active &&
          e.transaction_date >= start &&
          e.transaction_date <= end
      ),
    [loanEntries, start, end]
  );

  // Map counterparty_id -> name for quick lookup
  const counterpartyMap = useMemo(() => {
    const map = new Map<string, LoanCounterparty>();
    for (const cp of loanCounterparties) {
      map.set(cp.id, cp);
    }
    return map;
  }, [loanCounterparties]);

  // All transactions in period for filter chips
  const allPeriodTransactions = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            tx.is_active &&
            tx.transaction_date >= start &&
            tx.transaction_date <= end
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.transaction_time.localeCompare(a.transaction_time)
        ),
    [transactions, start, end]
  );

  // Base list for donut mode (used for category drill-down)
  const allModeTransactions = useMemo(
    () =>
      allPeriodTransactions.filter(
        (tx) =>
          tx.type === donutMode &&
          tx.category !== "Balance Correction"
      ),
    [allPeriodTransactions, donutMode]
  );

  // Drill-down list (respects selected category from donut)
  const drillBase = useMemo(() => {
    if (!selectedCategory) return allModeTransactions;
    if (selectedCategory === "Lainnya") {
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      return allModeTransactions.filter(
        (tx) => !top8.includes(tx.category ?? "Other")
      );
    }
    if (donutMode === "expense") {
      return getTransactionsForCategory(transactions, start, end, selectedCategory);
    }
    return allModeTransactions.filter(
      (tx) => (tx.category ?? "Other") === selectedCategory
    );
  }, [transactions, start, end, selectedCategory, breakdown, allModeTransactions, donutMode]);

  // Transaction type filter chips — operates on ALL period transactions
  const filteredTxns = useMemo(() => {
    let base: Transaction[];
    if (selectedCategory) {
      // When a category is selected, show the drill-down list regardless of chip
      base = drillBase;
    } else {
      switch (txFilter) {
        case "expense":
          base = allPeriodTransactions.filter(
            (tx) => tx.type === "expense" && tx.category !== "Balance Correction"
          );
          break;
        case "income":
          base = allPeriodTransactions.filter(
            (tx) => tx.type === "income" && tx.category !== "Balance Correction"
          );
          break;
        case "transfer":
          base = allPeriodTransactions.filter((tx) => tx.type === "transfer");
          break;
        default:
          base = allPeriodTransactions.filter(
            (tx) => tx.category !== "Balance Correction"
          );
      }
    }
    return applySortKey(base, sortKey);
  }, [selectedCategory, txFilter, allPeriodTransactions, drillBase, sortKey]);

  const handleDonutModeChange = (mode: DonutMode) => {
    if (mode === donutMode) return;
    setDonutMode(mode);
    setSelectedCategory(null);
    // Sync the filter chip to follow donut mode
    setTxFilter(mode);
  };

  const handleTxFilterChange = (filter: TxFilter) => {
    setTxFilter(filter);
    // Clear category selection when chip changes
    setSelectedCategory(null);
  };

  const headerTitle = nameParam
    ? nameParam
    : start && end
      ? formatDateRange(start, end, locale)
      : t("detail.title");

  const isIncomeMode = donutMode === "income";

  const TX_FILTERS: { id: TxFilter; label: string }[] = [
    { id: "all", label: t("detail.filterAll") },
    { id: "expense", label: t("detail.filterExpense") },
    { id: "income", label: t("detail.filterIncome") },
    { id: "transfer", label: t("detail.filterTransfer") },
  ];

  // Empty state per filter
  function renderEmptyState() {
    if (selectedCategory) {
      return (
        <EmptyState
          icon={PackageOpen}
          title={t("detail.noTransactions")}
          description={t("detail.noTransactionsDesc", { category: selectedCategory ?? "" })}
        />
      );
    }
    switch (txFilter) {
      case "income":
        return (
          <EmptyState
            icon={PackageOpen}
            title={t("detail.noIncome")}
            description={t("detail.noIncomeDesc")}
          />
        );
      case "expense":
        return (
          <EmptyState
            icon={PackageOpen}
            title={t("detail.noExpenseFilter")}
            description={t("detail.noExpenseFilterDesc")}
          />
        );
      case "transfer":
        return (
          <EmptyState
            icon={PackageOpen}
            title={t("detail.noTransferFilter")}
            description={t("detail.noTransferFilterDesc")}
          />
        );
      default:
        return (
          <EmptyState
            icon={PackageOpen}
            title={t("detail.noExpenses")}
            description={t("detail.noExpensesDesc")}
          />
        );
    }
  }

  return (
    <>
      <AppHeader title={headerTitle} showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Period label (only when no custom name) */}
        {nameParam && (
          <div className="text-center">
            <span
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatDateRange(start, end, locale)}
            </span>
          </div>
        )}

        {/* Feature 1: Monthly Summary Card */}
        <div className="glass rounded-[16px] p-4">
          <h2
            className="text-[11px] font-semibold mb-3 uppercase tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("detail.summaryTitle")}
          </h2>
          <PeriodSummaryRows summary={summary} />
        </div>

        {/* Feature 2: Income/Expense Donut Toggle */}
        <div
          className="flex items-center rounded-full p-1 gap-1"
          style={{
            background: "var(--bg-secondary)",
            boxShadow:
              "inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0.5px 1px rgba(0,0,0,0.04)",
          }}
        >
          {(["expense", "income"] as DonutMode[]).map((mode) => (
            <button
              key={mode}
              className={cn(
                "flex-1 rounded-full text-[12px] font-semibold transition-all",
                "flex items-center justify-center"
              )}
              style={{
                minHeight: "var(--tap-target-min)",
                backgroundColor:
                  donutMode === mode ? "var(--color-brand)" : "transparent",
                color:
                  donutMode === mode
                    ? "var(--text-on-primary)"
                    : "var(--color-brand)",
                boxShadow:
                  donutMode === mode
                    ? "0 2px 8px rgba(91,141,239,0.35), 0 1px 3px rgba(0,0,0,0.12)"
                    : "none",
              }}
              onClick={() => handleDonutModeChange(mode)}
            >
              {mode === "expense" ? t("donut.expense") : t("donut.income")}
            </button>
          ))}
        </div>

        {breakdown.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={isIncomeMode ? t("realtime.noIncome") : t("detail.noExpenses")}
            description={
              isIncomeMode ? t("realtime.noIncomeDesc") : t("detail.noExpensesDesc")
            }
          />
        ) : (
          <>
            <DonutChart
              data={breakdown}
              onCategorySelect={(cat) => {
                setSelectedCategory((prev) => (prev === cat ? null : cat));
              }}
              selectedCategory={selectedCategory}
              centerLabel={isIncomeMode ? t("donut.income") : undefined}
            />
            {/* View Trend link when a real category is selected */}
            {selectedCategory && selectedCategory !== "Lainnya" && (
              <button
                className="w-full flex items-center justify-center gap-2 py-2 rounded-[12px] transition-opacity active:opacity-70"
                style={{
                  background: "var(--color-brand-soft)",
                  color: "var(--color-brand)",
                  minHeight: "var(--tap-target-min)",
                }}
                onClick={() =>
                  router.push(
                    `/report/category?name=${encodeURIComponent(selectedCategory)}`
                  )
                }
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-[13px] font-semibold">
                  {t("categoryTrend.title")}
                </span>
              </button>
            )}
          </>
        )}

        {/* Daily summary — only in expense mode */}
        {breakdown.length > 0 && !isIncomeMode && (
          <DailySummarySection
            transactions={transactions}
            start={start}
            end={end}
            selectedCategory={selectedCategory}
          />
        )}

        {/* Feature 4: Loan Entries Section */}
        {periodLoanEntries.length > 0 && (
          <div className="space-y-2">
            <h2
              className="text-[12px] font-semibold px-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("detail.loanTitle")}
            </h2>
            <div className="glass rounded-[16px] overflow-hidden">
              {periodLoanEntries.map((entry, idx) => {
                const cp = counterpartyMap.get(entry.counterparty_id);
                const isGive = entry.type === "give";
                return (
                  <div key={entry.id}>
                    {idx > 0 && (
                      <div
                        className="mx-4"
                        style={{ height: 1, background: "var(--divider)" }}
                      />
                    )}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 active:opacity-70 transition-opacity"
                      style={{ minHeight: "var(--tap-target-min)" }}
                      onClick={() =>
                        cp &&
                        router.push(`/loan/${cp.id}`)
                      }
                    >
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {cp?.name ?? "—"}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isGive ? t("detail.loanGive") : t("detail.loanGet")}
                          {" · "}
                          {formatDisplayDate(entry.transaction_date, locale)}
                        </span>
                      </div>
                      <span
                        className="text-[13px] font-semibold tabular-nums ml-3 flex-shrink-0"
                        style={{
                          color: isGive
                            ? "var(--color-negative)"
                            : "var(--color-positive)",
                        }}
                      >
                        {isGive ? "-" : "+"}{formatIDR(entry.amount)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feature 3: Transaction Type Filter Chips + Transaction list */}
        <div className="space-y-2">
          {/* Filter chips — only shown when no category selected */}
          {!selectedCategory && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {TX_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleTxFilterChange(id)}
                  className={cn(
                    "flex-shrink-0 rounded-full px-3 text-[12px] font-semibold transition-all",
                    "flex items-center justify-center"
                  )}
                  style={{
                    minHeight: 36,
                    backgroundColor:
                      txFilter === id ? "var(--color-brand)" : "var(--bg-secondary)",
                    color:
                      txFilter === id
                        ? "var(--text-on-primary)"
                        : "var(--color-brand)",
                    boxShadow:
                      txFilter === id
                        ? "0 2px 8px rgba(91,141,239,0.25)"
                        : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* List header */}
          <div className="flex items-center justify-between px-1">
            <h2
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {selectedCategory
                ? t("categoryTransactions", { category: selectedCategory })
                : t("allTransactions")}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {tc("items", { count: filteredTxns.length })}
              </span>
              <SortPill value={sortKey} onChange={setSortKey} />
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="glass rounded-[16px] overflow-hidden">
              {filteredTxns.map((tx, idx) => {
                const prevTx = filteredTxns[idx - 1];
                const isDayStart =
                  idx === 0 ||
                  prevTx?.transaction_date !== tx.transaction_date;
                const isIncome = tx.type === "income";
                const isTransfer = tx.type === "transfer";
                const amountColor = isIncome
                  ? "var(--color-positive)"
                  : isTransfer
                    ? "var(--text-secondary)"
                    : "var(--color-negative)";
                const prefix = isIncome ? "+" : isTransfer ? "" : "-";

                return (
                  <div
                    key={tx.id}
                    id={isDayStart ? `day-${tx.transaction_date}` : undefined}
                  >
                    {idx > 0 && (
                      <div
                        className="mx-4"
                        style={{ height: 1, background: "var(--divider)" }}
                      />
                    )}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.title ?? tx.category ?? tx.type}
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {tx.category && (
                            <span style={{ color: "var(--text-tertiary)" }}>
                              {tx.category} ·{" "}
                            </span>
                          )}
                          {formatDisplayDate(tx.transaction_date, locale)}
                        </span>
                      </div>
                      <span
                        className="text-[13px] font-semibold tabular-nums ml-3 flex-shrink-0"
                        style={{ color: amountColor }}
                      >
                        {prefix}{formatIDR(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-4 space-y-4">
          <div
            className="h-[120px] rounded-[16px] animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
          <div
            className="h-[44px] rounded-full animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
          <div
            className="h-[200px] rounded-[16px] animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
        </div>
      }
    >
      <ReportDetailContent />
    </Suspense>
  );
}
