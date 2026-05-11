"use client";

import { formatIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

interface LoanSummaryBarProps {
  totalGet: number;
  totalGive: number;
}

/**
 * Summary bar untuk halaman utama Loan.
 * Konsep warna sama dengan SummaryBar di transactions:
 * - Label  : var(--text-secondary)
 * - Get    : var(--color-positive)
 * - Give   : var(--color-negative)
 * - Balance: dinamis berdasarkan nilai
 */
export function LoanSummaryBar({ totalGet, totalGive }: LoanSummaryBarProps) {
  const t = useTranslations("loan.summary");
  const balance = totalGive - totalGet;

  const getPrefix = totalGet > 0 ? "+ " : "";
  const givePrefix = totalGive > 0 ? "- " : "";
  let balancePrefix: string;
  let balanceColor: string;
  if (balance < 0) {
    balancePrefix = "+ ";
    balanceColor = "var(--color-positive)";
  } else if (balance > 0) {
    balancePrefix = "- ";
    balanceColor = "var(--color-negative)";
  } else {
    balancePrefix = "";
    balanceColor = "var(--text-secondary)";
  }

  return (
    <div
      className="glass flex rounded-[16px] overflow-hidden mb-4"
      style={{ minHeight: 64 }}
    >
      {/* Get column */}
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
          suppressHydrationWarning
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
          {t("give")}
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-negative)" }}
          suppressHydrationWarning
        >
          {givePrefix}{formatIDR(totalGive)}
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
          {t("balance")}
        </span>
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: balanceColor }}
          suppressHydrationWarning
        >
          {balancePrefix}{formatIDR(Math.abs(balance))}
        </span>
      </div>
    </div>
  );
}
