"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

export type SortKey = "datetime_desc" | "datetime_asc" | "amount_desc" | "amount_asc";

interface SortPillProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

const SORT_KEYS: SortKey[] = ["datetime_desc", "datetime_asc", "amount_desc", "amount_asc"];

export function SortPill({ value, onChange }: SortPillProps) {
  const t = useTranslations("transactions.sort");
  const [open, setOpen] = useState(false);
  const isDefault = value === "datetime_desc";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
        style={{
          background: !isDefault ? "var(--color-brand)" : "var(--bg-secondary)",
          color: !isDefault ? "var(--text-on-primary)" : "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        {t(value)}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            role="button"
            tabIndex={0}
            aria-label="Close sort menu"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(false); }}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-[12px] overflow-hidden py-1 min-w-[130px]"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {SORT_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors"
                style={{
                  color: value === key ? "var(--color-brand)" : "var(--text-primary)",
                  background: value === key ? "var(--color-brand-soft)" : "transparent",
                }}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Apply sortKey to a transaction array (returns new sorted array) */
export function applySortKey<T extends { transaction_date: string; transaction_time: string; created_at: string; amount: number }>(
  items: T[],
  sortKey: SortKey
): T[] {
  return [...items].sort((a, b) => {
    if (sortKey === "datetime_desc") {
      const d = b.transaction_date.localeCompare(a.transaction_date);
      if (d !== 0) return d;
      const t = b.transaction_time.localeCompare(a.transaction_time);
      return t !== 0 ? t : b.created_at.localeCompare(a.created_at);
    }
    if (sortKey === "datetime_asc") {
      const d = a.transaction_date.localeCompare(b.transaction_date);
      if (d !== 0) return d;
      const t = a.transaction_time.localeCompare(b.transaction_time);
      return t !== 0 ? t : a.created_at.localeCompare(b.created_at);
    }
    if (sortKey === "amount_desc") return b.amount - a.amount;
    return a.amount - b.amount;
  });
}
