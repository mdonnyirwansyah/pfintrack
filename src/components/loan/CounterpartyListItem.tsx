"use client";

import { memo } from "react";
import { ChevronRight, User } from "lucide-react";
import type { LoanCounterparty, LoanEntry } from "@/lib/types/loan";
import { formatIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";
import { IconBadge } from "@/components/shared/IconBadge";

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

export const CounterpartyListItem = memo(function CounterpartyListItem({
  counterparty,
  entries,
  onClick,
}: CounterpartyListItemProps) {
  const { outstanding } = computeAggregates(entries);
  const t = useTranslations("loan");

  const isPaidOff =
    counterparty.manual_paid_off || outstanding === 0;

  const mostRecent = entries.reduce<LoanEntry | null>((best, e) => {
    if (!best) return e;
    const eKey = `${e.transaction_date}T${e.transaction_time}`;
    const bKey = `${best.transaction_date}T${best.transaction_time}`;
    return eKey > bKey ? e : best;
  }, null);
  const subtitle = mostRecent?.note ?? t("withoutExplanation");

  return (
    <button
      onClick={onClick}
      className="w-full glass flex items-center gap-2.5 px-4 py-2.5 rounded-[16px] text-left transition-all active:scale-[0.98]"
      style={{
        minHeight: 48,
      }}
    >
      <IconBadge
        icon={User}
        iconColor="var(--color-brand)"
        background="var(--color-brand-soft)"
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {counterparty.name}
        </p>
        <p
          className="text-[9px] truncate mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {(() => {
          if (isPaidOff) {
            return (
              <span
                className="text-[9px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("paidOff")}
              </span>
            );
          }
          if (outstanding > 0) {
            return (
              <span
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: "var(--color-negative)" }}
              >
                - {formatIDR(outstanding)}
              </span>
            );
          }
          return (
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: "var(--color-positive)" }}
            >
              + {formatIDR(Math.abs(outstanding))}
            </span>
          );
        })()}
        <ChevronRight
          className="w-3.5 h-3.5"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    </button>
  );
});
