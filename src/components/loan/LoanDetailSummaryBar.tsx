"use client";

import { formatIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

interface LoanDetailSummaryBarProps {
  readonly totalGet: number;
  readonly totalGive: number;
  readonly outstanding: number;
}

export function LoanDetailSummaryBar({
  totalGet,
  totalGive,
  outstanding,
}: LoanDetailSummaryBarProps) {
  const t = useTranslations("loan.summary");
  const getPrefix = totalGet > 0 ? "+ " : "";
  const givePrefix = totalGive > 0 ? "- " : "";
  let balancePrefix: string;
  let balanceColor: string;
  if (outstanding < 0) {
    balancePrefix = "+ ";
    balanceColor = "var(--color-positive)";
  } else if (outstanding > 0) {
    balancePrefix = "- ";
    balanceColor = "var(--color-negative)";
  } else {
    balancePrefix = "";
    balanceColor = "var(--text-secondary)";
  }

  return (
    <div
      className="glass flex rounded-[16px] overflow-hidden mb-4"
      style={{}}
    >
      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("get")}
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-positive)" }}
        >
          {getPrefix}{formatIDR(totalGet)}
        </span>
      </div>

      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("give")}
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-negative)" }}
        >
          {givePrefix}{formatIDR(totalGive)}
        </span>
      </div>

      <div
        className="w-px self-stretch my-2"
        style={{ background: "var(--divider)" }}
      />

      <div className="flex-1 flex flex-col items-center py-3 px-1">
        <span
          className="text-[10px] font-medium uppercase tracking-wide mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("balance")}
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
