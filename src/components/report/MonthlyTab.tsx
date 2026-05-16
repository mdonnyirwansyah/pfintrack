"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { PackageOpen } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import {
  generateMonthList,
  calculateMonthlySummary,
} from "@/lib/report/calculations";
import { MonthlySection } from "./MonthlySection";
import { MonthlyOverviewChart } from "./MonthlyOverviewChart";
import { NetWorthChart } from "./NetWorthChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useAppStore } from "@/lib/stores/useAppStore";

const INITIAL_MONTHS = 6;
const LOAD_MORE_MONTHS = 6;

interface MonthlyTabProps {
  readonly transactions: Transaction[];
  readonly loanEntries: LoanEntry[];
  readonly balanceHistory: WalletBalanceHistory[];
}

export function MonthlyTab({
  transactions,
  loanEntries,
  balanceHistory,
}: MonthlyTabProps) {
  const t = useTranslations("report");
  const reportVisibility = useAppStore((s) => s.reportVisibility);
  const allMonths = useMemo(
    () => generateMonthList(transactions),
    [transactions]
  );

  const [displayCount, setDisplayCount] = useState(INITIAL_MONTHS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visibleMonths = allMonths.slice(0, displayCount);
  const hasMore = displayCount < allMonths.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + LOAD_MORE_MONTHS, allMonths.length));
      setIsLoadingMore(false);
    }, 50);
  }, [hasMore, isLoadingMore, allMonths.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (allMonths.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={t("monthly.noTransactions")}
        description={t("monthly.noTransactionsDesc")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {reportVisibility.showMonthlyOverviewChart && (
        <MonthlyOverviewChart transactions={transactions} />
      )}

      {reportVisibility.showNetWorthChart && (
        <NetWorthChart
          transactions={transactions}
          loanEntries={loanEntries}
          balanceHistory={balanceHistory}
        />
      )}

      {visibleMonths.map(({ start, end }) => {
        const summary = calculateMonthlySummary(
          transactions,
          loanEntries,
          balanceHistory,
          start,
          end
        );
        return (
          <MonthlySection key={start} start={start} end={end} summary={summary} />
        );
      })}

      <div ref={sentinelRef} className="h-4" />

      {isLoadingMore && (
        <div className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-[16px]" />
          <Skeleton className="h-[220px] w-full rounded-[16px]" />
        </div>
      )}
    </div>
  );
}
