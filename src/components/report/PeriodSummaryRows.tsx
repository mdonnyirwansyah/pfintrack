"use client";

import type { PeriodSummary } from "@/lib/report/calculations";
import { formatIDR, formatIDRSigned } from "@/lib/format/number";
import { useTranslations } from "next-intl";
import { useAppStore } from "@/lib/stores/useAppStore";

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
      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: color ?? "var(--text-primary)" }}
        suppressHydrationWarning
      >
        {value}
      </span>
    </div>
  );
}

export function PeriodSummaryRows({ summary }: PeriodSummaryRowsProps) {
  const t = useTranslations("report.summary");
  const reportVisibility = useAppStore((s) => s.reportVisibility);

  let balanceColor: string;
  if (summary.balance > 0) {
    balanceColor = "var(--color-positive)";
  } else if (summary.balance < 0) {
    balanceColor = "var(--color-negative)";
  } else {
    balanceColor = "var(--text-primary)";
  }

  let loanColor: string;
  if (summary.loan !== null && summary.loan > 0) {
    loanColor = "var(--color-positive)";
  } else if (summary.loan !== null && summary.loan < 0) {
    loanColor = "var(--color-negative)";
  } else {
    loanColor = "var(--text-primary)";
  }

  let correctionColor: string;
  if (summary.balanceCorrection !== null && summary.balanceCorrection > 0) {
    correctionColor = "var(--color-positive)";
  } else if (summary.balanceCorrection !== null && summary.balanceCorrection < 0) {
    correctionColor = "var(--color-negative)";
  } else {
    correctionColor = "var(--text-primary)";
  }

  return (
    <div className="space-y-0.5">
      <SummaryRow
        label={t("expenses")}
        value={summary.expenses > 0 ? `- ${formatIDR(summary.expenses)}` : formatIDR(0)}
        color="var(--color-negative)"
      />
      <SummaryRow
        label={t("income")}
        value={`+ ${formatIDR(summary.income)}`}
        color="var(--color-positive)"
      />
      <div className="my-1" style={{ height: "1px", background: "var(--divider)" }} />
      <SummaryRow
        label={t("balance")}
        value={summary.balance === 0 ? formatIDR(0) : formatIDRSigned(summary.balance)}
        color={balanceColor}
      />
      {summary.loan !== null && reportVisibility.showLoanRow && (
        <SummaryRow
          label={t("loan")}
          value={formatIDRSigned(summary.loan)}
          color={loanColor}
        />
      )}
      {summary.balanceCorrection !== null && reportVisibility.showBalanceCorrectionRow && (
        <SummaryRow
          label={t("balanceCorrection")}
          value={formatIDRSigned(summary.balanceCorrection)}
          color={correctionColor}
        />
      )}
      {/* Saving Rate row */}
      {reportVisibility.showSavingRateCard && (() => {
        if (summary.income === 0) {
          return (
            <SummaryRow
              label={t("savingRate")}
              value="N/A"
              color="var(--text-tertiary)"
            />
          );
        }
        const rate = ((summary.income - summary.expenses) / summary.income) * 100;
        let rateColor: string;
        if (rate >= 20) rateColor = "var(--color-positive)";
        else if (rate >= 10) rateColor = "var(--color-accent)";
        else rateColor = "var(--color-negative)";
        return (
          <SummaryRow
            label={t("savingRate")}
            value={`${Math.round(rate)}%`}
            color={rateColor}
          />
        );
      })()}
    </div>
  );
}
