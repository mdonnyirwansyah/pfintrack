"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { DonutChart } from "@/components/report/DonutChart";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  calcCategoryBreakdown,
  getTransactionsForCategory,
} from "@/lib/report/calculations";
import { transactionsRepo } from "@/lib/storage/transactions";
import { formatDateRange, formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import type { Transaction } from "@/lib/types/transaction";
import { useTranslations } from "next-intl";

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const nameParam = searchParams.get("name");
  const categoryParam = searchParams.get("category");
  const t = useTranslations("report");
  const tc = useTranslations("common");

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setTransactions(transactionsRepo.getAll());
  }, []);

  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end),
    [transactions, start, end]
  );

  // If a specific category is pre-selected from the drill-down link
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam ?? null
  );

  // All expense transactions for the period, sorted by date DESC
  const allExpenses = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.is_active &&
            t.type === "expense" &&
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

  // Filtered by selected category, or all expenses when none selected
  const drillTransactions = useMemo(() => {
    if (!selectedCategory) return allExpenses;

    if (selectedCategory === "Lainnya") {
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      return allExpenses.filter((t) => !top8.includes(t.category ?? "Other"));
    }

    return getTransactionsForCategory(transactions, start, end, selectedCategory);
  }, [transactions, start, end, selectedCategory, breakdown, allExpenses]);

  const headerTitle = nameParam
    ? nameParam
    : start && end
      ? formatDateRange(start, end)
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
              {formatDateRange(start, end)}
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
          <DonutChart
            data={breakdown}
            onCategorySelect={(cat) =>
              setSelectedCategory((prev) => (prev === cat ? null : cat))
            }
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
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {tc("items", { count: drillTransactions.length })}
              </span>
            </div>

            {drillTransactions.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title={t("detail.noTransactions")}
                description={t("detail.noTransactionsDesc", { category: selectedCategory ?? "" })}
              />
            ) : (
              <div className="glass rounded-[16px] overflow-hidden">
                {drillTransactions.map((t, idx) => (
                  <div key={t.id}>
                    {idx > 0 && (
                      <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                    )}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span
                          className="text-[13px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {t.title ?? t.category ?? "Expense"}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {t.category && (
                            <span style={{ color: "var(--text-tertiary)" }}>{t.category} · </span>
                          )}
                          {formatDisplayDate(t.transaction_date)}
                        </span>
                      </div>
                      <span
                        className="text-[13px] font-semibold tabular-nums ml-3 flex-shrink-0"
                        style={{ color: "var(--color-negative)" }}
                      >
                        -{formatIDR(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
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
