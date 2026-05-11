"use client";

import { useMemo, useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import { List, CalendarDays, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/types/transaction";
import { formatIDR } from "@/lib/format/number";
import { formatDisplayDateLocale, formatMonthLabelLocale } from "@/lib/format/date";
import { SortPill, type SortKey } from "@/components/shared/SortPill";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function fmtY(v: number): string {
  if (v >= 1_000_000_000) return `${+(v / 1_000_000_000).toFixed(1)}G`;
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}k`;
  return `${v}`;
}
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { useTranslations, useLocale } from "next-intl";

interface DaySummary {
  date: string; // YYYY-MM-DD
  income: number;
  expenses: number;
}

function buildDailySummaries(
  transactions: Transaction[],
  start: string,
  end: string,
  selectedCategory?: string | null
): DaySummary[] {
  const map = new Map<string, DaySummary>();

  for (const tx of transactions) {
    if (!tx.is_active) continue;
    if (tx.transaction_date < start || tx.transaction_date > end) continue;
    if (tx.type === "transfer") continue;

    // If category filter is active, only include matching expense transactions
    if (selectedCategory) {
      if (tx.type !== "expense") continue;
      const txCat = tx.category ?? "Other";
      if (txCat !== selectedCategory) continue;
    }

    const existing = map.get(tx.transaction_date) ?? {
      date: tx.transaction_date,
      income: 0,
      expenses: 0,
    };
    if (tx.type === "income") existing.income += tx.amount;
    else if (tx.type === "expense") existing.expenses += tx.amount;
    map.set(tx.transaction_date, existing);
  }

  return Array.from(map.values());
}

function sortDailySummaries(summaries: DaySummary[], sortKey: SortKey): DaySummary[] {
  return [...summaries].sort((a, b) => {
    if (sortKey === "datetime_desc") return b.date.localeCompare(a.date);
    if (sortKey === "datetime_asc") return a.date.localeCompare(b.date);
    const aTotal = a.income + a.expenses;
    const bTotal = b.income + b.expenses;
    if (sortKey === "amount_desc") return bTotal - aTotal;
    if (sortKey === "amount_asc") return aTotal - bTotal;
    return b.date.localeCompare(a.date);
  });
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

interface DailyBarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function DailyBarTooltip({ active, payload, label }: DailyBarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.name === "income")?.value ?? 0;
  const expenses = payload.find((p) => p.name === "expenses")?.value ?? 0;
  return (
    <div
      className="glass rounded-[10px] px-2.5 py-1.5 text-[10px] space-y-0.5"
      style={{ pointerEvents: "none" }}
    >
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {income > 0 && (
        <p style={{ color: "var(--color-positive)" }}>+ {formatIDR(income)}</p>
      )}
      {expenses > 0 && (
        <p style={{ color: "var(--color-negative)" }}>- {formatIDR(expenses)}</p>
      )}
    </div>
  );
}

interface DailySummarySectionProps {
  transactions: Transaction[];
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  selectedCategory?: string | null;
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function DailySummarySection({
  transactions,
  start,
  end,
  selectedCategory,
}: DailySummarySectionProps) {
  const t = useTranslations("report");
  const locale = useLocale();
  const mounted = useMounted();
  const [view, setView] = useState<"list" | "calendar" | "chart">("calendar");
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");

  const startMonth = startOfMonth(parseISO(start));
  const endMonth   = startOfMonth(parseISO(end));
  const [currentMonth, setCurrentMonth] = useState(startMonth);

  const canPrev = currentMonth > startMonth;
  const canNext = currentMonth < endMonth;

  const rawSummaries = useMemo(
    () => buildDailySummaries(transactions, start, end, selectedCategory),
    [transactions, start, end, selectedCategory]
  );

  const summaries = useMemo(
    () => sortDailySummaries(rawSummaries, sortKey),
    [rawSummaries, sortKey]
  );

  const summaryMap = useMemo(() => {
    const m = new Map<string, DaySummary>();
    for (const s of rawSummaries) m.set(s.date, s);
    return m;
  }, [rawSummaries]);

  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd   = endOfWeek(endOfMonth(currentMonth));
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd });

  // Chart data: sorted ascending by date, with short day label for X-axis
  const chartData = useMemo(() => {
    const sorted = [...rawSummaries].sort((a, b) => a.date.localeCompare(b.date));
    // If > 20 days, only show every 5th label to avoid crowding
    const total = sorted.length;
    return sorted.map((s, idx) => {
      const dayNum = parseInt(s.date.slice(8, 10), 10);
      const showLabel = total <= 20 || (dayNum % 5 === 1 || dayNum === 1);
      return {
        date: s.date,
        label: showLabel ? String(dayNum) : "",
        income: s.income,
        expenses: s.expenses,
      };
    });
  }, [rawSummaries]);

  function renderListView() {
    return (
      <div className="glass rounded-[16px] overflow-hidden">
        {summaries.map((day, idx) => (
          <div key={day.date}>
            {idx > 0 && (
              <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
            )}
            <div className="flex items-center justify-between px-4 py-2.5">
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-primary)" }}
                suppressHydrationWarning
              >
                {formatDisplayDateLocale(day.date, locale)}
              </span>
              <div className="flex items-center gap-3">
                {day.income > 0 && (
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: "var(--color-positive)" }}
                    suppressHydrationWarning
                  >
                    +{formatIDR(day.income)}
                  </span>
                )}
                {day.expenses > 0 && (
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: "var(--color-negative)" }}
                    suppressHydrationWarning
                  >
                    -{formatIDR(day.expenses)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderChartView() {
    return (
      <div className="glass rounded-[16px] px-2 pt-3 pb-4">
        <div style={{ width: "100%", height: 160, minWidth: 0 }}>
        {mounted ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
          <BarChart
            data={chartData}
            barGap={2}
            barCategoryGap="20%"
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          >
            <YAxis
              tickFormatter={fmtY}
              tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickCount={4}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<DailyBarTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar
              dataKey="income"
              name="income"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              fill="var(--color-positive)"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(data: any) => {
                const dateStr = (data as { date: string }).date;
                const el = document.getElementById(`day-${dateStr}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{ cursor: "pointer" }}
            />
            <Bar
              dataKey="expenses"
              name="expenses"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              fill="var(--color-negative)"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(data: any) => {
                const dateStr = (data as { date: string }).date;
                const el = document.getElementById(`day-${dateStr}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{ cursor: "pointer" }}
            />
          </BarChart>
        </ResponsiveContainer> : null}
        </div>
      </div>
    );
  }

  function renderCalendarView() {
    return (
      <div className="glass rounded-[16px] p-3">
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            disabled={!canPrev}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-secondary)" }}
            suppressHydrationWarning
          >
            {formatMonthLabelLocale(currentMonth, locale)}
          </p>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            disabled={!canNext}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-opacity active:opacity-60 disabled:opacity-20"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers — i18n */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="text-center text-[9px] font-medium py-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t(`daily.weekdays.${key}`)}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
          {calDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, currentMonth);
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
                <span
                  className="text-[9px] font-semibold leading-none mb-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {format(day, "d")}
                </span>

                {summary && summary.income > 0 && (
                  <span
                    className="text-[9px] font-medium leading-tight tabular-nums"
                    style={{ color: "var(--color-positive)" }}
                    suppressHydrationWarning
                  >
                    +{abbr(summary.income)}
                  </span>
                )}

                {summary && summary.expenses > 0 && (
                  <span
                    className="text-[9px] font-medium leading-tight tabular-nums"
                    style={{ color: "var(--color-negative)" }}
                    suppressHydrationWarning
                  >
                    -{abbr(summary.expenses)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderViewContent() {
    if (summaries.length === 0) {
      return (
        <p className="text-[11px] text-center py-4" style={{ color: "var(--text-tertiary)" }}>
          {t("daily.noData")}
        </p>
      );
    }
    if (view === "list") return renderListView();
    if (view === "chart") return renderChartView();
    return renderCalendarView();
  }

  return (
    <div className="space-y-3">
      {/* Header + controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            {t("daily.title")}
          </h2>
          {selectedCategory && (
            <span
              className="text-[10px] font-medium"
              style={{ color: "var(--color-brand)" }}
            >
              {t("daily.filteredBy", { category: selectedCategory })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort pill — only in list view */}
          {view === "list" && (
            <SortPill value={sortKey} onChange={setSortKey} />
          )}

          {/* View toggle */}
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
            <button
              onClick={() => setView("chart")}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
              style={{
                background: view === "chart" ? "var(--color-brand)" : "transparent",
                color: view === "chart" ? "white" : "var(--text-tertiary)",
              }}
              aria-label={t("daily.chartView")}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {renderViewContent()}
    </div>
  );
}
