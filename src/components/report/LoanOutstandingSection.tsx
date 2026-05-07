"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import { formatIDR } from "@/lib/format/number";

interface LoanOutstandingSectionProps {
  loanCounterparties: LoanCounterparty[];
  loanEntries: LoanEntry[];
}

interface OutstandingRow {
  counterparty: LoanCounterparty;
  outstanding: number;
}

export function LoanOutstandingSection({
  loanCounterparties,
  loanEntries,
}: LoanOutstandingSectionProps) {
  const t = useTranslations("report");
  const router = useRouter();

  const outstandingRows = useMemo<OutstandingRow[]>(() => {
    const rows: OutstandingRow[] = [];

    for (const cp of loanCounterparties) {
      if (!cp.is_active) continue;
      // Skip counterparties already marked as manually paid off
      if (cp.manual_paid_off) continue;

      const entries = loanEntries.filter(
        (e) => e.is_active && e.counterparty_id === cp.id
      );

      const totalGive = entries
        .filter((e) => e.type === "give")
        .reduce((sum, e) => sum + e.amount, 0);

      const totalGet = entries
        .filter((e) => e.type === "get")
        .reduce((sum, e) => sum + e.amount, 0);

      const outstanding = totalGive - totalGet;

      // Skip if balance is zero (auto paid off)
      if (outstanding === 0) continue;

      rows.push({ counterparty: cp, outstanding });
    }

    return rows;
  }, [loanCounterparties, loanEntries]);

  // If no active outstanding counterparties, render nothing
  if (outstandingRows.length === 0) return null;

  return (
    <div
      className="glass rounded-[16px] overflow-hidden"
      style={{ padding: 0 }}
    >
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("loanSummary.title")}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {outstandingRows.length}
        </span>
      </div>

      {/* Rows */}
      {outstandingRows.map((row, idx) => {
        const isReceivable = row.outstanding > 0;
        const label = isReceivable
          ? t("loanSummary.receivable")
          : t("loanSummary.payable");
        const color = isReceivable
          ? "var(--color-positive)"
          : "var(--color-negative)";
        const prefix = isReceivable ? "+" : "-";
        const absAmount = Math.abs(row.outstanding);

        return (
          <div key={row.counterparty.id}>
            {idx > 0 && (
              <div
                className="mx-4"
                style={{ height: 1, background: "var(--divider)" }}
              />
            )}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 text-left"
              style={{ minHeight: "var(--tap-target-min)" }}
              onClick={() => router.push(`/loan/${row.counterparty.id}`)}
            >
              {/* Name */}
              <span
                className="text-[13px] font-medium flex-1 min-w-0 truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {row.counterparty.name}
              </span>

              {/* Type label */}
              <span
                className="text-[11px] mx-3 flex-shrink-0"
                style={{ color }}
              >
                {label}
              </span>

              {/* Amount */}
              <span
                className="text-[13px] font-semibold tabular-nums flex-shrink-0"
                style={{ color }}
              >
                {prefix}
                {formatIDR(absAmount)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
