"use client";

import { formatIDR } from "@/lib/format/number";

interface LoanDetailSummaryBarProps {
  totalGet: number;
  totalGive: number;
  outstanding: number;
}

/**
 * 3-column summary bar untuk halaman detail Loan per counterparty.
 * Konsep warna sama dengan SummaryBar di transactions:
 * - Label      : var(--text-secondary)
 * - Get        : var(--color-positive)
 * - Give       : var(--color-negative)
 * - Balance    : dinamis berdasarkan nilai
 */
export function LoanDetailSummaryBar({
  totalGet,
  totalGive,
  outstanding,
}: LoanDetailSummaryBarProps) {
  const getPrefix = totalGet > 0 ? "+ " : "";
  const balancePrefix = outstanding < 0 ? "+ " : "";
  const balanceColor =
    outstanding > 0
      ? "var(--color-positive)"
      : outstanding < 0
      ? "var(--color-negative)"
      : "var(--text-secondary)";

  return (
    <div
      className="glass flex rounded-[16px] overflow-hidden mb-4"
      style={{}}
    >
      {/* Get column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Get
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-positive)" }}
        >
          {getPrefix}{formatIDR(totalGet)}
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
          style={{ color: "var(--text-secondary)" }}
        >
          Give
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
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

      {/* Balance column */}
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Balance
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: balanceColor }}
        >
          {balancePrefix}{formatIDR(Math.abs(outstanding))}
        </span>
      </div>
    </div>
  );
}
