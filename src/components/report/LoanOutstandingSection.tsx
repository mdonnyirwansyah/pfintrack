"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import { formatIDR } from "@/lib/format/number";

interface LoanOutstandingSectionProps {
  loanCounterparties: LoanCounterparty[];
  loanEntries: LoanEntry[];
}

export function LoanOutstandingSection({
  loanCounterparties,
  loanEntries,
}: LoanOutstandingSectionProps) {
  const t = useTranslations("report");

  const { totalReceivable, totalPayable } = useMemo(() => {
    let receivable = 0;
    let payable = 0;

    for (const cp of loanCounterparties) {
      if (!cp.is_active || cp.manual_paid_off) continue;

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

      if (outstanding > 0) receivable += outstanding;
      else if (outstanding < 0) payable += Math.abs(outstanding);
    }

    return { totalReceivable: receivable, totalPayable: payable };
  }, [loanCounterparties, loanEntries]);

  if (totalReceivable === 0 && totalPayable === 0) return null;

  return (
    <div className="glass rounded-[16px] overflow-hidden" style={{ padding: 0 }}>
      {/* Section header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--divider)" }}
      >
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("loanSummary.title")}
        </span>
      </div>

      {/* Receivable row */}
      {totalReceivable > 0 && (
        <div
          className="flex items-center justify-between px-4"
          style={{ minHeight: "var(--tap-target-min)", borderBottom: totalPayable > 0 ? "1px solid var(--divider)" : undefined }}
        >
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {t("loanSummary.receivable")}
          </span>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-positive)" }}>
            +{formatIDR(totalReceivable)}
          </span>
        </div>
      )}

      {/* Payable row */}
      {totalPayable > 0 && (
        <div
          className="flex items-center justify-between px-4"
          style={{ minHeight: "var(--tap-target-min)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {t("loanSummary.payable")}
          </span>
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-negative)" }}>
            -{formatIDR(totalPayable)}
          </span>
        </div>
      )}
    </div>
  );
}
