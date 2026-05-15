"use client";

import { ArrowUpDown, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortKey = "datetime_desc" | "datetime_asc" | "amount_desc" | "amount_asc";

interface SortPillProps<T extends string> {
  value: T;
  onChange: (key: T) => void;
  options: Readonly<{ value: T; label: string }[]>;
}

export function SortPill<T extends string>({ value, onChange, options }: Readonly<SortPillProps<T>>) {
  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="glass flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium outline-none cursor-pointer"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowUpDown className="w-3 h-3 shrink-0" />
        <span>{currentLabel}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="glass w-auto min-w-[130px]"
        style={{ borderRadius: 12 }}
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="text-[12px] justify-between focus:bg-[var(--color-brand-soft)] focus:text-[var(--text-primary)]"
            style={{ color: "var(--text-primary)" }}
          >
            {opt.label}
            {opt.value === value && (
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-brand)" }} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
