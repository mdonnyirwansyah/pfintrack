"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { CategoryTrendChart } from "@/components/report/CategoryTrendChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { transactionsRepo } from "@/lib/storage/transactions";
import { formatDisplayDate } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/number";
import type { Transaction } from "@/lib/types/transaction";
import { currentMonthStart, currentMonthEnd } from "@/lib/report/calculations";
import { useTranslations, useLocale } from "next-intl";

function CategoryTrendContent() {
  const searchParams = useSearchParams();
  const categoryName = searchParams.get("name") ?? "";
  const t = useTranslations("report");
  const locale = useLocale();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    void transactionsRepo.getAll().then(setTransactions);
  }, []);

  // Recent transactions: only current month, expense, matching category, sorted DESC
  const start = currentMonthStart();
  const end = currentMonthEnd();

  const recentTransactions = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            tx.is_active &&
            tx.type === "expense" &&
            tx.category !== "Balance Correction" &&
            (tx.category ?? "Other") === categoryName &&
            tx.transaction_date >= start &&
            tx.transaction_date <= end
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.transaction_time.localeCompare(a.transaction_time)
        ),
    [transactions, categoryName, start, end]
  );

  if (!categoryName) {
    return (
      <>
        <AppHeader title={t("categoryTrend.title")} showBack />
        <div className="px-4 py-4">
          <EmptyState
            icon={PackageOpen}
            title={t("categoryTrend.noData")}
            description=""
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={categoryName} showBack />

      <div className="px-4 py-4 space-y-4">
        {/* 6-month trend chart */}
        <CategoryTrendChart
          transactions={transactions}
          categoryName={categoryName}
        />

        {/* Recent transactions in current month */}
        <div className="space-y-2">
          <h2
            className="text-[12px] font-semibold px-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("categoryTrend.recentTransactions")}
          </h2>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={t("detail.noTransactions")}
              description={t("detail.noTransactionsDesc", { category: categoryName })}
            />
          ) : (
            <div className="glass rounded-[16px] overflow-hidden">
              {recentTransactions.map((tx, idx) => (
                <div key={tx.id}>
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
                        {tx.title ?? tx.category ?? "Expense"}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--text-secondary)" }}
                        suppressHydrationWarning
                      >
                        {formatDisplayDate(tx.transaction_date, locale)}
                      </span>
                    </div>
                    <span
                      className="text-[13px] font-semibold tabular-nums ml-3 flex-shrink-0"
                      style={{ color: "var(--color-negative)" }}
                      suppressHydrationWarning
                    >
                      -{formatIDR(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function CategoryTrendPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-4 space-y-4">
          <div
            className="h-[200px] rounded-[16px] animate-pulse"
            style={{ background: "var(--bg-secondary)" }}
          />
        </div>
      }
    >
      <CategoryTrendContent />
    </Suspense>
  );
}
