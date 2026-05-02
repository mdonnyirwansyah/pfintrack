"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import {
  calcCategoryBreakdown,
  currentMonthStart,
  currentMonthEnd,
} from "@/lib/report/calculations";
import { DonutChart } from "./DonutChart";
import { formatDateRange } from "@/lib/format/date";
import { EmptyState } from "@/components/shared/EmptyState";

interface RealtimeTabProps {
  transactions: Transaction[];
}

export function RealtimeTab({ transactions }: RealtimeTabProps) {
  const router = useRouter();

  const start = currentMonthStart();
  const end = currentMonthEnd();

  const breakdown = useMemo(
    () => calcCategoryBreakdown(transactions, start, end),
    [transactions, start, end]
  );

  const handleCategorySelect = (category: string) => {
    router.push(
      `/report/detail?start=${start}&end=${end}&category=${encodeURIComponent(category)}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Period label */}
      <div className="text-center">
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
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
        <DonutChart data={breakdown} onCategorySelect={handleCategorySelect} />
      )}
    </div>
  );
}
