"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PackageOpen, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { DonutChart } from "@/components/report/DonutChart";
import { DailySummarySection } from "@/components/report/DailySummarySection";
import { SortPill, applySortKey } from "@/components/shared/SortPill";
import type { SortKey } from "@/components/shared/SortPill";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  calcCategoryBreakdown,
  getTransactionsForCategory,
} from "@/lib/report/calculations";
import { transactionsRepo } from "@/lib/storage/transactions";
import { formatDateRange, formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import type { Transaction } from "@/lib/types/transaction";
import { useTranslations, useLocale } from "next-intl";

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

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    void transactionsRepo.getAll().then(setTransactions);
  }, []);

  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end),
    [transactions, start, end]
  );

  // If a specific category is pre-selected from the drill-down link
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam ?? null
  );
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");

  // All expense transactions for the period, sorted by date DESC
  const allExpenses = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.is_active &&
            t.type === "expense" &&
            t.category !== "Balance Correction" &&
            t.transaction_date >= start &&
            t.transaction_date <= end
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.transaction_time.localeCompare(a.transaction_time)
        ),
    [transactions, start, end]
  );

  // Filtered by selected category, then sorted
  const drillTransactions = useMemo(() => {
    let base: typeof allExpenses;
    if (!selectedCategory) {
      base = allExpenses;
    } else if (selectedCategory === "Lainnya") {
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      base = allExpenses.filter((t) => !top8.includes(t.category ?? "Other"));
    } else {
      base = getTransactionsForCategory(transactions, start, end, selectedCategory);
    }
    return applySortKey(base, sortKey);
  }, [transactions, start, end, selectedCategory, breakdown, allExpenses, sortKey]);

  const headerTitle = nameParam
    ? nameParam
    : start && end
      ? formatDateRange(start, end, locale)
      : "Report Detail";

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

        {breakdown.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={t("detail.noExpenses")}
            description={t("detail.noExpensesDesc")}
          />
        ) : (
          <>
            <DonutChart
              data={breakdown}
              onCategorySelect={(cat) =>
                setSelectedCategory((prev) => (prev === cat ? null : cat))
              }
              selectedCategory={selectedCategory}
            />
            {/* A2 — View Trend link when a real category is selected */}
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

        {/* Daily summary */}
        {breakdown.length > 0 && (
          <DailySummarySection
            transactions={transactions}
            start={start}
            end={end}
            selectedCategory={selectedCategory}
          />
        )}

        {/* Transaction list */}
        {breakdown.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {selectedCategory ? t("categoryTransactions", { category: selectedCategory }) : t("allTransactions")}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {tc("items", { count: drillTransactions.length })}
                </span>
                <SortPill value={sortKey} onChange={setSortKey} />
              </div>
            </div>

            {drillTransactions.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title={t("detail.noTransactions")}
                description={t("detail.noTransactionsDesc", { category: selectedCategory ?? "" })}
              />
            ) : (
              <div className="glass rounded-[16px] overflow-hidden">
                {drillTransactions.map((tx, idx) => {
                  // Emit day anchor ID for the first transaction of each date (for chart tap-to-scroll)
                  const prevTx = drillTransactions[idx - 1];
                  const isDayStart = idx === 0 || prevTx?.transaction_date !== tx.transaction_date;
                  return (
                    <div key={tx.id} id={isDayStart ? `day-${tx.transaction_date}` : undefined}>
                      {idx > 0 && (
                        <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span
                            className="text-[13px] font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {tx.title ?? tx.category ?? "Expense"}
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
                          style={{ color: "var(--color-negative)" }}
                        >
                          -{formatIDR(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-4 space-y-4">
        <div className="h-[200px] rounded-[16px] animate-pulse" style={{ background: "var(--bg-secondary)" }} />
      </div>
    }>
      <ReportDetailContent />
    </Suspense>
  );
}
