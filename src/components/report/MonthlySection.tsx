"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PeriodSummaryRows } from "./PeriodSummaryRows";
import { formatDateRange } from "@/lib/format/date";
import { formatIDR, formatIDRSigned } from "@/lib/format/number";
import type { MonthlySummary } from "@/lib/report/calculations";

interface MonthlySectionProps {
  start: string;
  end: string;
  summary: MonthlySummary;
}

export function MonthlySection({ start, end, summary }: MonthlySectionProps) {
  const router = useRouter();

  const handleDrillDown = () => {
    router.push(`/report/detail?start=${start}&end=${end}`);
  };

  const endBalanceColor =
    summary.endBalance > 0
      ? "var(--color-positive)"
      : summary.endBalance < 0
        ? "var(--color-negative)"
        : "var(--text-primary)";

  return (
    <div className="glass rounded-[16px] p-4">
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between mb-3 active:opacity-70 transition-opacity"
        style={{ minHeight: "var(--tap-target-min)" }}
        onClick={handleDrillDown}
        aria-label={`Drill down to ${formatDateRange(start, end)}`}
      >
        <span
          className="text-[13px] font-semibold flex-1 text-center"
          style={{ color: "var(--text-primary)" }}
        >
          {formatDateRange(start, end)}
        </span>
        <ChevronRight
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        />
      </button>

      {/* Start Balance */}
      <div className="flex items-center justify-between py-1">
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          Start Balance
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
          suppressHydrationWarning
        >
          {formatIDR(summary.startBalance)}
        </span>
      </div>

      <div className="my-1" style={{ height: "1px", background: "var(--divider)" }} />

      {/* Existing rows: Expenses, Income, Balance, Loan?, Correction? */}
      <PeriodSummaryRows summary={summary} />

      <div className="my-1" style={{ height: "1px", background: "var(--divider)" }} />

      {/* End Balance */}
      <div className="flex items-center justify-between py-1">
        <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          End Balance
        </span>
        <span
          className="text-[13px] font-bold tabular-nums"
          style={{ color: endBalanceColor }}
          suppressHydrationWarning
        >
          {summary.endBalance === 0
            ? formatIDR(0)
            : formatIDRSigned(summary.endBalance)}
        </span>
      </div>
    </div>
  );
}
