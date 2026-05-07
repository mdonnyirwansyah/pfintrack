"use client";

import { useMemo, useState, useEffect } from "react";
import { PackageOpen } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import {
  calcCategoryBreakdown,
  calcIncome,
  calcExpenses,
  currentMonthStart,
  currentMonthEnd,
  getTransactionsForCategory,
} from "@/lib/report/calculations";
import { DonutChart } from "./DonutChart";
import { SavingRateCard } from "./SavingRateCard";
import { InsightCard, type InsightData } from "./InsightCard";
import { DailySummarySection } from "./DailySummarySection";
import { LoanOutstandingSection } from "./LoanOutstandingSection";
import { SortPill, applySortKey } from "@/components/shared/SortPill";
import type { SortKey } from "@/components/shared/SortPill";
import { formatDateRange, formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type DonutMode = "expense" | "income";

interface RealtimeTabProps {
  transactions: Transaction[];
  loanEntries: LoanEntry[];
  loanCounterparties: LoanCounterparty[];
}

export function RealtimeTab({ transactions, loanEntries, loanCounterparties }: RealtimeTabProps) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const locale = useLocale();
  const dateFnsLocale = locale === "id" ? idLocale : enUS;
  const start = currentMonthStart();
  const end = currentMonthEnd();

  // sessionStorage key for insight dismiss — resets every month
  const insightMonthKey = start.slice(0, 7); // YYYY-MM

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");
  // Always start with defaults to match server render, restore from sessionStorage after hydration
  const [donutMode, setDonutMode] = useState<DonutMode>("expense");
  const [insightDismissed, setInsightDismissed] = useState<boolean>(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("report_donut_mode") as DonutMode | null;
    if (saved === "income") setDonutMode("income");
    if (sessionStorage.getItem(`dismissed_insight_${insightMonthKey}`) === "true") {
      setInsightDismissed(true);
    }
  }, [insightMonthKey]);

  // Saving Rate (always computed from the full period income/expenses)
  const income = useMemo(
    () => calcIncome(transactions, start, end),
    [transactions, start, end]
  );
  const expenses = useMemo(
    () => calcExpenses(transactions, start, end),
    [transactions, start, end]
  );

  // B2 — Insight generation (computed from current + last month)
  const insight = useMemo<InsightData | null>(() => {
    const lastMonthDate = subMonths(new Date(start), 1);
    const lastStart = format(startOfMonth(lastMonthDate), "yyyy-MM-dd");
    const lastEnd = format(endOfMonth(lastMonthDate), "yyyy-MM-dd");
    const lastMonthLabel = format(lastMonthDate, "MMM", { locale: dateFnsLocale });

    const lastExpenses = calcExpenses(transactions, lastStart, lastEnd);
    const currentBreakdown = calcCategoryBreakdown(transactions, start, end, "expense");
    const lastBreakdown = calcCategoryBreakdown(transactions, lastStart, lastEnd, "expense");

    // Priority 1: a category rose >= 30% vs last month
    if (lastExpenses > 0 && currentBreakdown.length > 0 && lastBreakdown.length > 0) {
      for (const curr of currentBreakdown) {
        const prev = lastBreakdown.find((b) => b.category === curr.category);
        if (prev && prev.total > 0) {
          const rise = ((curr.total - prev.total) / prev.total) * 100;
          if (rise >= 30) {
            return {
              type: "categoryUp",
              category: curr.category,
              percent: Math.round(rise),
              month: lastMonthLabel,
            };
          }
        }
      }
    }

    // Priority 2: saving rate < 10% (income > 0)
    if (income > 0 && expenses > 0) {
      const rate = ((income - expenses) / income) * 100;
      if (rate < 10) {
        return { type: "lowSavingRate" };
      }
    }

    // Priority 3: one category > 50% total expense
    if (currentBreakdown.length > 0 && expenses > 0) {
      const top = currentBreakdown[0];
      if (top && top.percentage > 50) {
        return {
          type: "categoryDominant",
          category: top.category,
          percent: Math.round(top.percentage),
        };
      }
    }

    // Priority 4: expense bulan ini < bulan lalu
    if (lastExpenses > 0 && expenses > 0 && expenses < lastExpenses) {
      const drop = ((lastExpenses - expenses) / lastExpenses) * 100;
      return { type: "expenseDown", percent: Math.round(drop) };
    }

    // Priority 5: tidak ada income
    if (income === 0) {
      return { type: "noIncome" };
    }

    return null;
  }, [transactions, start, end, income, expenses, dateFnsLocale]);

  const handleDismissInsight = () => {
    setInsightDismissed(true);
    sessionStorage.setItem(`dismissed_insight_${insightMonthKey}`, "true");
  };

  // Category breakdown — respects donutMode
  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end, donutMode),
    [transactions, start, end, donutMode]
  );

  // Base transaction list for the current mode
  const allModeTransactions = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            tx.is_active &&
            tx.type === donutMode &&
            tx.category !== "Balance Correction" &&
            tx.transaction_date >= start &&
            tx.transaction_date <= end
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.transaction_time.localeCompare(a.transaction_time)
        ),
    [transactions, start, end, donutMode]
  );

  // Filtered by selected category, then sorted
  const filteredTransactions = useMemo(() => {
    let base: typeof allModeTransactions;
    if (!selectedCategory) {
      base = allModeTransactions;
    } else if (selectedCategory === "Lainnya") {
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      base = allModeTransactions.filter((tx) => !top8.includes(tx.category ?? "Other"));
    } else {
      base = getTransactionsForCategory(transactions, start, end, selectedCategory);
      // getTransactionsForCategory always filters type=expense; for income mode we need to redo
      if (donutMode === "income") {
        base = allModeTransactions.filter(
          (tx) => (tx.category ?? "Other") === selectedCategory
        );
      }
    }
    return applySortKey(base, sortKey);
  }, [selectedCategory, allModeTransactions, breakdown, transactions, start, end, sortKey, donutMode]);

  const handleDonutModeChange = (mode: DonutMode) => {
    if (mode === donutMode) return;
    setDonutMode(mode);
    setSelectedCategory(null);
    sessionStorage.setItem("report_donut_mode", mode);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const listTitle = selectedCategory
    ? t("categoryTransactions", { category: selectedCategory })
    : t("allTransactions");

  const isIncomeMode = donutMode === "income";

  return (
    <div className="space-y-4">
      {/* Period label */}
      <div className="text-center">
        <span className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {formatDateRange(start, end, locale)}
        </span>
      </div>

      {/* B1 — Saving Rate Card (always shown, not conditional on income > 0 — component handles N/A) */}
      <SavingRateCard income={income} expenses={expenses} />

      {/* D1 — Loan Outstanding Section (conditional, below SavingRateCard) */}
      <LoanOutstandingSection
        loanCounterparties={loanCounterparties}
        loanEntries={loanEntries}
      />

      {/* B2 — Insight Card (conditional, dismissible) */}
      {insight && !insightDismissed && (
        <InsightCard insight={insight} onDismiss={handleDismissInsight} />
      )}

      {/* C1 — Donut mode toggle pill */}
      <div
        className="flex items-center rounded-full p-1 gap-1"
        style={{
          background: "var(--bg-secondary)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0.5px 1px rgba(0,0,0,0.04)",
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
          title={isIncomeMode ? t("realtime.noIncome") : t("realtime.noExpenses")}
          description={isIncomeMode ? t("realtime.noIncomeDesc") : t("realtime.noExpensesDesc")}
        />
      ) : (
        <>
          <DonutChart
            data={breakdown}
            onCategorySelect={handleCategorySelect}
            selectedCategory={selectedCategory}
            centerLabel={isIncomeMode ? t("donut.income") : undefined}
          />

          {/* Daily summary (list/calendar toggle) — only in expense mode to stay backward compatible */}
          {!isIncomeMode && (
            <DailySummarySection
              transactions={transactions}
              start={start}
              end={end}
              selectedCategory={selectedCategory}
            />
          )}

          {/* Transaction list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {listTitle}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {tc("items", { count: filteredTransactions.length })}
                </span>
                <SortPill value={sortKey} onChange={setSortKey} />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title={t("detail.noTransactions")}
                description={t("detail.noTransactionsDesc", { category: selectedCategory ?? "" })}
              />
            ) : (
              <div className="glass rounded-[16px] overflow-hidden">
                {filteredTransactions.map((tx, idx) => (
                  <div key={tx.id}>
                    {idx > 0 && (
                      <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                    )}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.title ?? tx.category ?? (isIncomeMode ? t("detail.filterIncome") : t("detail.filterExpense"))}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {tx.category && (
                            <span style={{ color: "var(--text-tertiary)" }}>{tx.category} · </span>
                          )}
                          {formatDisplayDate(tx.transaction_date, locale)}
                        </span>
                      </div>
                      <span
                        className="text-[13px] font-semibold tabular-nums ml-3 flex-shrink-0"
                        style={{
                          color: isIncomeMode
                            ? "var(--color-positive)"
                            : "var(--color-negative)",
                        }}
                      >
                        {isIncomeMode ? "+" : "-"}{formatIDR(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
