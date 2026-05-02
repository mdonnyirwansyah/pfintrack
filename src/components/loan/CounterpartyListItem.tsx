"use client";

import { ChevronRight } from "lucide-react";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import { formatIDR } from "@/lib/format/number";

interface CounterpartyListItemProps {
  counterparty: LoanCounterparty;
  entries: LoanEntry[];
  onClick: () => void;
}

function computeAggregates(entries: LoanEntry[]) {
  const totalGive = entries
    .filter((e) => e.type === "give")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalGet = entries
    .filter((e) => e.type === "get")
    .reduce((sum, e) => sum + e.amount, 0);
  const outstanding = totalGive - totalGet;
  return { totalGive, totalGet, outstanding };
}

export function CounterpartyListItem({
  counterparty,
  entries,
  onClick,
}: CounterpartyListItemProps) {
  const { outstanding } = computeAggregates(entries);

  const isPaidOff =
    counterparty.manual_paid_off || outstanding === 0;

  // Subtitle: note from the most-recent entry or fallback
  const sortedEntries = [...entries].sort((a, b) => {
    const da = `${a.transaction_date}T${a.transaction_time}`;
    const db = `${b.transaction_date}T${b.transaction_time}`;
    return db.localeCompare(da);
  });
  const subtitle =
    sortedEntries.length > 0
      ? sortedEntries[0].note || "Without explanation"
      : "Without explanation";

  return (
    <button
      onClick={onClick}
      className="w-full glass flex items-center gap-3 px-4 py-3 rounded-[16px] text-left transition-all active:scale-[0.98]"
      style={{
        minHeight: "var(--tap-target-min)",
      }}
    >
      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {counterparty.name}
        </p>
        <p
          className="text-[13px] truncate mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Outstanding / Paid off */}
      <div className="flex items-center gap-1 shrink-0">
        {isPaidOff ? (
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--color-positive)" }}
          >
            Paid off
          </span>
        ) : outstanding > 0 ? (
          <span
            className="text-[15px] font-semibold"
            style={{ color: "var(--color-positive)" }}
          >
            {formatIDR(outstanding)}
          </span>
        ) : (
          <span
            className="text-[15px] font-semibold"
            style={{ color: "var(--color-negative)" }}
          >
            {formatIDR(Math.abs(outstanding))}
          </span>
        )}
        <ChevronRight
          className="w-4 h-4"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    </button>
  );
}
