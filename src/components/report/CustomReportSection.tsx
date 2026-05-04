"use client";

import { ChevronRight, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { PeriodSummaryRows } from "./PeriodSummaryRows";
import { formatDateRange } from "@/lib/format/date";
import { formatIDR, formatIDRSigned } from "@/lib/format/number";
import type { MonthlySummary } from "@/lib/report/calculations";
import type { CustomReport } from "@/lib/types/report";
import { useLocale } from "next-intl";

interface CustomReportSectionProps {
  report: CustomReport;
  summary: MonthlySummary;
}

export function CustomReportSection({
  report,
  summary,
}: CustomReportSectionProps) {
  const router = useRouter();
  const locale = useLocale();

  const handleDrillDown = () => {
    router.push(
      `/report/detail?start=${report.start_date}&end=${report.end_date}&name=${encodeURIComponent(report.name)}`
    );
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/report/custom/${report.id}/edit`);
  };

  const endBalanceColor =
    summary.endBalance > 0
      ? "var(--color-positive)"
      : summary.endBalance < 0
        ? "var(--color-negative)"
        : "var(--text-primary)";

  return (
    <div className="glass rounded-[16px] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <button
          className="flex-1 flex flex-col items-center active:opacity-70 transition-opacity"
          onClick={handleDrillDown}
        >
          <span
            className="text-[14px] font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {report.name}
          </span>
          <span
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {formatDateRange(report.start_date, report.end_date, locale)}
          </span>
        </button>

        {/* Edit icon */}
        <button
          className="flex items-center justify-center rounded-full transition-opacity active:opacity-60 flex-shrink-0"
          style={{
            minWidth: "var(--tap-target-min)",
            minHeight: "var(--tap-target-min)",
            color: "var(--text-secondary)",
          }}
          onClick={handleEdit}
          aria-label={`Edit ${report.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Chevron row */}
      <button
        className="w-full flex items-center justify-end mb-3 active:opacity-70"
        onClick={handleDrillDown}
        style={{ minHeight: "var(--tap-target-min)" }}
      >
        <ChevronRight
          className="w-5 h-5"
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
