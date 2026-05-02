"use client";

import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import {
  calcCategoryBreakdown,
  currentMonthStart,
  currentMonthEnd,
  getTransactionsForCategory,
} from "@/lib/report/calculations";
import { DonutChart } from "./DonutChart";
import { formatDateRange, formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import { EmptyState } from "@/components/shared/EmptyState";

interface RealtimeTabProps {
  transactions: Transaction[];
}

export function RealtimeTab({ transactions }: RealtimeTabProps) {
  const start = currentMonthStart();
  const end = currentMonthEnd();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end),
    [transactions, start, end]
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

  // Filtered by selected category
  const filteredTransactions = useMemo(() => {
    if (!selectedCategory) return allExpenses;

    if (selectedCategory === "Lainnya") {
      const top8 = breakdown.slice(0, 8).map((b) => b.category);
      return allExpenses.filter((t) => !top8.includes(t.category ?? "Other"));
    }

    return getTransactionsForCategory(transactions, start, end, selectedCategory);
  }, [selectedCategory, allExpenses, breakdown, transactions, start, end]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const listTitle = selectedCategory ? `${selectedCategory} — Transactions` : "All Transactions";

  return (
    <div className="space-y-4">
      {/* Period label */}
      <div className="text-center">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          {formatDateRange(start, end)}
        </span>
      </div>

      {breakdown.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No expenses this month"
          description="Transactions you mark as expense will appear here."
        />
      ) : (
        <>
          <DonutChart
            data={breakdown}
            onCategorySelect={handleCategorySelect}
            selectedCategory={selectedCategory}
          />

          {/* Transaction list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {listTitle}
              </h2>
              <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                {filteredTransactions.length} item{filteredTransactions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="No transactions"
                description={`No expense transactions found for "${selectedCategory}".`}
              />
            ) : (
              <div className="glass rounded-[16px] overflow-hidden">
                {filteredTransactions.map((t, idx) => (
                  <div key={t.id}>
                    {idx > 0 && (
                      <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                    )}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span
                          className="text-[14px] font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {t.title ?? t.category ?? "Expense"}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                          {t.category && <span style={{ color: "var(--text-tertiary)" }}>{t.category} · </span>}
                          {formatDisplayDate(t.transaction_date)}
                        </span>
                      </div>
                      <span
                        className="text-[14px] font-semibold tabular-nums ml-3 flex-shrink-0"
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
        </>
      )}
    </div>
  );
}
