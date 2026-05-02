"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PeriodSummaryRows } from "./PeriodSummaryRows";
import { formatDateRange } from "@/lib/format/date";
import type { PeriodSummary } from "@/lib/report/calculations";

interface MonthlySectionProps {
  start: string;
  end: string;
  summary: PeriodSummary;
}

export function MonthlySection({ start, end, summary }: MonthlySectionProps) {
  const router = useRouter();

  const handleDrillDown = () => {
    router.push(`/report/detail?start=${start}&end=${end}`);
  };

  return (
    <div
      className="glass rounded-[16px] p-4"
    >
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

      <PeriodSummaryRows summary={summary} />
    </div>
  );
}
