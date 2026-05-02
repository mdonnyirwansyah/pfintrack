"use client";

import { formatIDR } from "@/lib/format/number";

interface SummaryBarProps {
  income: number;
  expenses: number;
  balance: number;
}

export function SummaryBar({ income, expenses, balance }: SummaryBarProps) {
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
      className="mx-4 mb-3 rounded-[16px] grid grid-cols-3 gap-px overflow-hidden"
      style={{
        background: "var(--divider)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Income */}
      <div
        className="flex flex-col items-center py-3 px-2"
        style={{ background: "var(--bg-card)" }}
      >
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Income
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: "var(--color-positive)" }}
        >
          {incomePrefix}{formatIDR(income)}
        </span>
      </div>

      {/* Expenses */}
      <div
        className="flex flex-col items-center py-3 px-2"
        style={{ background: "var(--bg-card)" }}
      >
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Expenses
        </span>
        <span
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: "var(--color-negative)" }}
        >
          {formatIDR(expenses)}
        </span>
      </div>

      {/* Balance */}
      <div
        className="flex flex-col items-center py-3 px-2"
        style={{ background: "var(--bg-card)" }}
      >
        <span
          className="text-[11px] font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Balance
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
