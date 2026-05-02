"use client";

import { ChevronRight } from "lucide-react";
import type { LoanEntry } from "@/lib/types/loan";
import { formatIDR } from "@/lib/format/number";
import { formatDisplayDate } from "@/lib/format/date";
import { useTranslations } from "next-intl";

interface LoanEntryListItemProps {
  entry: LoanEntry;
  onClick: () => void;
}

export function LoanEntryListItem({ entry, onClick }: LoanEntryListItemProps) {
  const isGet = entry.type === "get";
  const t = useTranslations("loan");
  const subtitle = entry.note || t("withoutExplanation");

  return (
    <button
      onClick={onClick}
      className="w-full glass flex items-center gap-3 px-4 py-3 rounded-[16px] text-left transition-all active:scale-[0.98]"
      style={{
        minHeight: "var(--tap-target-min)",
      }}
    >
      {/* Date + note */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {formatDisplayDate(entry.transaction_date)}
        </p>
        <p
          className="text-[9px] truncate mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{
            color: isGet ? "var(--color-positive)" : "var(--text-primary)",
          }}
        >
          {isGet ? `+ ${formatIDR(entry.amount)}` : formatIDR(entry.amount)}
        </span>
        <ChevronRight
          className="w-4 h-4"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    </button>
  );
}
