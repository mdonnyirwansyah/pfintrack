"use client";

import { formatIDR } from "@/lib/format/number";

interface LoanDetailSummaryBarProps {
  totalGet: number;
  totalGive: number;
  outstanding: number;
}

/**
 * 3-column summary bar shown in the Loan Detail page.
 */
export function LoanDetailSummaryBar({
  totalGet,
  totalGive,
  outstanding,
}: LoanDetailSummaryBarProps) {
  return (
    <div
      className="flex rounded-[16px] overflow-hidden mb-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Get column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-accent-warm)" }}
        >
          Get
        </span>
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--color-accent-warm)" }}
        >
          + {formatIDR(totalGet)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      {/* Give column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-negative)" }}
        >
          Give
        </span>
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--color-negative)" }}
        >
          {formatIDR(totalGive)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      {/* Outstanding / Selisih column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "#E91E8C" }}
        >
          Balance
        </span>
        <span
          className="text-[13px] font-semibold"
          style={{ color: "#E91E8C" }}
        >
          {formatIDR(outstanding)}
        </span>
      </div>
    </div>
  );
}
