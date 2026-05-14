"use client";

import { useMemo } from "react";
import { useMounted } from "@/hooks/useMounted";
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
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import type { Transaction } from "@/lib/types/transaction";
import { calcIncome, calcExpenses } from "@/lib/report/calculations";
import { formatIDR } from "@/lib/format/number";
import { useTranslations, useLocale } from "next-intl";

interface MonthlyOverviewChartProps {
  transactions: Transaction[];
}

interface MonthData {
  label: string; // Short month label e.g. "May" / "Mei"
  start: string; // YYYY-MM-01
  end: string;   // YYYY-MM-DD (last day)
  income: number;
  expenses: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.name === "income")?.value ?? 0;
  const expenses = payload.find((p) => p.name === "expenses")?.value ?? 0;
  return (
    <div
      className="glass rounded-[12px] px-3 py-2 text-[11px] space-y-1"
      style={{ pointerEvents: "none" }}
    >
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {income > 0 && (
        <p style={{ color: "var(--color-positive)" }}>
          + {formatIDR(income)}
        </p>
      )}
      {expenses > 0 && (
        <p style={{ color: "var(--color-negative)" }}>
          - {formatIDR(expenses)}
        </p>
      )}
    </div>
  );
}

export function MonthlyOverviewChart({ transactions }: MonthlyOverviewChartProps) {
  const t = useTranslations("report");
  const locale = useLocale();
  const mounted = useMounted();

  const dateFnsLocale = locale === "id" ? idLocale : enUS;

  const chartData = useMemo<MonthData[]>(() => {
    const now = new Date();
    const months: MonthData[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const label = format(monthDate, "MMM", { locale: dateFnsLocale });
      const income = calcIncome(transactions, start, end);
      const expenses = calcExpenses(transactions, start, end);
      months.push({ label, start, end, income, expenses });
    }

    return months;
  }, [transactions, dateFnsLocale]);


  return (
    <figure className="glass rounded-[16px] px-4 pt-3 pb-4 space-y-3">
      <figcaption
        className="text-[12px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("monthlyOverview.title")}
      </figcaption>

      <div style={{ width: "100%", height: 160, minWidth: 0 }}>
      {mounted ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <BarChart
          data={chartData}
          barGap={2}
          barCategoryGap="25%"
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <YAxis
            tickFormatter={fmtY}
            tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickCount={4}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar
            dataKey="income"
            name="income"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
            fill="var(--color-positive)"
          />
          <Bar
            dataKey="expenses"
            name="expenses"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
            fill="var(--color-negative)"
          />
        </BarChart>
      </ResponsiveContainer> : null}
      </div>
    </figure>
  );
}
