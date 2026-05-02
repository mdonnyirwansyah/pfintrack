"use client";

import { ChevronRight, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { PeriodSummaryRows } from "./PeriodSummaryRows";
import { formatDateRange } from "@/lib/format/date";
import type { PeriodSummary } from "@/lib/report/calculations";
import type { CustomReport } from "@/lib/types/report";

interface CustomReportSectionProps {
  report: CustomReport;
  summary: PeriodSummary;
}

export function CustomReportSection({
  report,
  summary,
}: CustomReportSectionProps) {
  const router = useRouter();

  const handleDrillDown = () => {
    router.push(
      `/report/detail?start=${report.start_date}&end=${report.end_date}&name=${encodeURIComponent(report.name)}`
    );
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/report/custom/${report.id}/edit`);
  };

  return (
    <div
      className="glass rounded-[16px] p-4"
    >
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
            {formatDateRange(report.start_date, report.end_date)}
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

      <PeriodSummaryRows summary={summary} />
    </div>
  );
}
