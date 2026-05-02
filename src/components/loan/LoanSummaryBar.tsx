"use client";

import { formatIDR } from "@/lib/format/number";

interface LoanSummaryBarProps {
  totalGet: number;
  totalGive: number;
}

/**
 * Summary bar for the Loan List page.
 * Shows total outstanding across all counterparties:
 *   Get = sum of outstanding where outstanding > 0 (they owe me)
 *   Give = sum of |outstanding| where outstanding < 0 (I owe them)
 */
export function LoanSummaryBar({ totalGet, totalGive }: LoanSummaryBarProps) {
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
      <div className="flex-1 flex flex-col items-center py-3 px-2">
        <span
          className="text-[11px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-accent-warm)" }}
        >
          Get
        </span>
        <span
          className="text-[15px] font-semibold"
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
      <div className="flex-1 flex flex-col items-center py-3 px-2">
        <span
          className="text-[11px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--color-negative)" }}
        >
          Give
        </span>
        <span
          className="text-[15px] font-semibold"
          style={{ color: "var(--color-negative)" }}
        >
          {formatIDR(totalGive)}
        </span>
      </div>
    </div>
  );
}
