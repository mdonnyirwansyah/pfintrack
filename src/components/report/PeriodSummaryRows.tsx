"use client";

import type { PeriodSummary } from "@/lib/report/calculations";
import { formatIDR, formatIDRSigned } from "@/lib/format/number";

interface PeriodSummaryRowsProps {
  summary: PeriodSummary;
}

interface SummaryRowProps {
  label: string;
  value: string;
  color?: string;
}

function SummaryRow({ label, value, color }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className="text-[14px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <span
        className="text-[14px] font-semibold"
        style={{ color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

export function PeriodSummaryRows({ summary }: PeriodSummaryRowsProps) {
  const balanceColor =
    summary.balance > 0
      ? "var(--color-positive)"
      : summary.balance < 0
        ? "var(--color-negative)"
        : "var(--text-primary)";

  const loanColor =
    summary.loan !== null && summary.loan > 0
      ? "var(--color-positive)"
      : summary.loan !== null && summary.loan < 0
        ? "var(--color-negative)"
        : "var(--text-primary)";

  const correctionColor =
    summary.balanceCorrection !== null && summary.balanceCorrection > 0
      ? "var(--color-positive)"
      : summary.balanceCorrection !== null && summary.balanceCorrection < 0
        ? "var(--color-negative)"
        : "var(--text-primary)";

  return (
    <div className="space-y-0.5">
      <SummaryRow label="Expenses" value={formatIDR(summary.expenses)} />
      <SummaryRow
        label="Income"
        value={`+ ${formatIDR(summary.income)}`}
        color="var(--color-positive)"
      />
      <div
        className="my-1"
        style={{
          height: "1px",
          background: "var(--divider)",
        }}
      />
      <SummaryRow
        label="Balance"
        value={
          summary.balance === 0
            ? formatIDR(0)
            : formatIDRSigned(summary.balance)
        }
        color={balanceColor}
      />
      {summary.loan !== null && (
        <SummaryRow
          label="Loan"
          value={formatIDRSigned(summary.loan)}
          color={loanColor}
        />
      )}
      {summary.balanceCorrection !== null && (
        <SummaryRow
          label="Balance Correction"
          value={formatIDRSigned(summary.balanceCorrection)}
          color={correctionColor}
        />
      )}
    </div>
  );
}
