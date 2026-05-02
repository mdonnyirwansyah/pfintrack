"use client";

import { formatIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

interface SummaryBarProps {
  income: number;
  expenses: number;
  balance: number;
}

export function SummaryBar({ income, expenses, balance }: SummaryBarProps) {
  const t = useTranslations("transactions.summary");
  // Income: "+" hanya jika > 0
  const incomePrefix = income > 0 ? "+ " : "";
  // Balance: "+" hanya jika > 0, tanpa tanda jika 0 atau negatif
  const balancePrefix = balance > 0 ? "+ " : "";
  const balanceColor =
    balance > 0
      ? "var(--color-positive)"
      : balance < 0
      ? "var(--color-negative)"
      : "var(--text-secondary)";

  return (
    <div
      className="mx-4 mb-3 glass rounded-[16px] flex overflow-hidden"
    >
      {/* Income */}
      <div className="flex-1 flex flex-col items-center py-3 px-2">
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("income")}
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: "var(--color-positive)" }}
        >
          {incomePrefix}{formatIDR(income)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch my-2" style={{ background: "var(--divider)" }} />

      {/* Expenses */}
      <div className="flex-1 flex flex-col items-center py-3 px-2">
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("expenses")}
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: "var(--color-negative)" }}
        >
          {formatIDR(expenses)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch my-2" style={{ background: "var(--divider)" }} />

      {/* Balance */}
      <div className="flex-1 flex flex-col items-center py-3 px-2">
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("balance")}
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: balanceColor }}
        >
          {balancePrefix}{formatIDR(Math.abs(balance))}
        </span>
      </div>
    </div>
  );
}
