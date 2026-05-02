"use client";

import { useMemo, useState } from "react";
import { List, CalendarDays } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import { formatIDR } from "@/lib/format/number";
import { formatDisplayDate } from "@/lib/format/date";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import { useTranslations } from "next-intl";

interface DaySummary {
  date: string; // YYYY-MM-DD
  income: number;
  expenses: number;
}

function buildDailySummaries(transactions: Transaction[], start: string, end: string): DaySummary[] {
  const map = new Map<string, DaySummary>();

  for (const tx of transactions) {
    if (!tx.is_active) continue;
    if (tx.transaction_date < start || tx.transaction_date > end) continue;
    if (tx.type === "transfer") continue;

    const existing = map.get(tx.transaction_date) ?? { date: tx.transaction_date, income: 0, expenses: 0 };
    if (tx.type === "income") existing.income += tx.amount;
    else if (tx.type === "expense") existing.expenses += tx.amount;
    map.set(tx.transaction_date, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/** Abbreviate large numbers: 1200000 → "1.2M", 50000 → "50K", 500 → "500" */
function abbr(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "M";
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + "K";
  }
  return Math.round(n).toString();
}

interface DailySummarySectionProps {
  transactions: Transaction[];
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DailySummarySection({ transactions, start, end }: DailySummarySectionProps) {
  const t = useTranslations("report");
  const [view, setView] = useState<"list" | "calendar">("list");

  const summaries = useMemo(
    () => buildDailySummaries(transactions, start, end),
    [transactions, start, end]
  );

  const summaryMap = useMemo(() => {
    const m = new Map<string, DaySummary>();
    for (const s of summaries) m.set(s.date, s);
    return m;
  }, [summaries]);

  // Calendar grid uses the month that contains 'start'
  const monthDate = parseISO(start);
  const calStart = startOfWeek(startOfMonth(monthDate));
  const calEnd = endOfWeek(endOfMonth(monthDate));
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="space-y-3">
      {/* Header + toggle */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          {t("daily.title")}
        </h2>
        <div
          className="flex items-center rounded-full p-0.5 gap-0.5"
          style={{ background: "var(--bg-secondary)" }}
        >
          <button
            onClick={() => setView("list")}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
            style={{
              background: view === "list" ? "var(--color-brand)" : "transparent",
              color: view === "list" ? "white" : "var(--text-tertiary)",
            }}
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView("calendar")}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
            style={{
              background: view === "calendar" ? "var(--color-brand)" : "transparent",
              color: view === "calendar" ? "white" : "var(--text-tertiary)",
            }}
            aria-label="Calendar view"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {summaries.length === 0 ? (
        <p className="text-[11px] text-center py-4" style={{ color: "var(--text-tertiary)" }}>
          {t("daily.noData")}
        </p>
      ) : view === "list" ? (
        /* ── List View ── */
        <div className="glass rounded-[16px] overflow-hidden">
          {summaries.map((day, idx) => (
            <div key={day.date}>
              {idx > 0 && (
                <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
              )}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {formatDisplayDate(day.date)}
                </span>
                <div className="flex items-center gap-3">
                  {day.income > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--color-positive)" }}>
                      +{formatIDR(day.income)}
                    </span>
                  )}
                  {day.expenses > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--color-negative)" }}>
                      -{formatIDR(day.expenses)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Calendar View ── */
        <div className="glass rounded-[16px] p-3">
          {/* Month label */}
          <p className="text-center text-[11px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            {format(monthDate, "MMMM yyyy")}
          </p>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[9px] font-medium py-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
            {calDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, monthDate);
              const summary = summaryMap.get(dateStr);

              return (
                <div
                  key={dateStr}
                  className="flex flex-col p-1 rounded-[4px]"
                  style={{
                    minHeight: 44,
                    opacity: inMonth ? 1 : 0.2,
                    background: summary ? "var(--bg-secondary)" : "transparent",
                  }}
                >
                  {/* Date number — top left */}
                  <span
                    className="text-[9px] font-semibold leading-none mb-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Income */}
                  {summary && summary.income > 0 && (
                    <span
                      className="text-[9px] font-medium leading-tight tabular-nums"
                      style={{ color: "var(--color-positive)" }}
                    >
                      +{abbr(summary.income)}
                    </span>
                  )}

                  {/* Expense */}
                  {summary && summary.expenses > 0 && (
                    <span
                      className="text-[9px] font-medium leading-tight tabular-nums"
                      style={{ color: "var(--color-negative)" }}
                    >
                      -{abbr(summary.expenses)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
