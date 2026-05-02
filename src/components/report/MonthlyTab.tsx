"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { PackageOpen } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import {
  generateMonthList,
  calcPeriodSummary,
} from "@/lib/report/calculations";
import { MonthlySection } from "./MonthlySection";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const INITIAL_MONTHS = 6;
const LOAD_MORE_MONTHS = 6;

interface MonthlyTabProps {
  transactions: Transaction[];
  loanEntries: LoanEntry[];
  balanceHistory: WalletBalanceHistory[];
}

export function MonthlyTab({
  transactions,
  loanEntries,
  balanceHistory,
}: MonthlyTabProps) {
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
    // Simulate a tick to show loading state before heavy computation
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + LOAD_MORE_MONTHS, allMonths.length));
      setIsLoadingMore(false);
    }, 50);
  }, [hasMore, isLoadingMore, allMonths.length]);

  // Infinite scroll via IntersectionObserver
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
        title="No transactions yet"
        description="Add your first transaction to see monthly reports."
      />
    );
  }

  return (
    <div className="space-y-4">
      {visibleMonths.map(({ start, end }) => {
        const summary = calcPeriodSummary(
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

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {isLoadingMore && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-[16px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
        </div>
      )}
    </div>
  );
}
