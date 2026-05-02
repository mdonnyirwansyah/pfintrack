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

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const nameParam = searchParams.get("name");
  const categoryParam = searchParams.get("category");

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

  // Transactions to show in the drill-down list
  const drillTransactions = useMemo(() => {
    if (!selectedCategory) return [];

    if (selectedCategory === "Lainnya") {
      // Lainnya = all categories not in top 8
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      return transactions.filter(
        (t) =>
          t.is_active &&
          t.type === "expense" &&
          t.transaction_date >= start &&
          t.transaction_date <= end &&
          !top8.includes(t.category ?? "Other")
      );
    }

    return getTransactionsForCategory(transactions, start, end, selectedCategory);
  }, [transactions, start, end, selectedCategory, breakdown]);

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
              className="text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatDateRange(start, end)}
            </span>
          </div>
        )}

        {breakdown.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No expenses in this period"
            description="There are no expense transactions for the selected date range."
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

        {/* Drill-down transaction list */}
        {selectedCategory && drillTransactions.length > 0 && (
          <div className="space-y-3 mt-4">
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedCategory} — Transactions
            </h2>
            <div className="space-y-2">
              {drillTransactions
                .sort(
                  (a, b) =>
                    b.transaction_date.localeCompare(a.transaction_date) ||
                    b.transaction_time.localeCompare(a.transaction_time)
                )
                .map((t) => (
                  <div
                    key={t.id}
                    className="glass rounded-[12px] p-3 flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span
                        className="text-[14px] font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {t.title ?? t.category ?? "Expense"}
                      </span>
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDisplayDate(t.transaction_date)}
                      </span>
                    </div>
                    <span
                      className="text-[14px] font-semibold tabular-nums ml-3 flex-shrink-0"
                      style={{ color: "var(--color-negative)" }}
                    >
                      - {formatIDR(t.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedCategory && drillTransactions.length === 0 && (
          <EmptyState
            icon={PackageOpen}
            title="No transactions"
            description={`No expense transactions found for "${selectedCategory}".`}
          />
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
