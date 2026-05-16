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
import { formatIDR } from "@/lib/format/number";
import { useTranslations, useLocale } from "next-intl";

interface CategoryTrendChartProps {
  readonly transactions: Transaction[];
  readonly categoryName: string;
}

interface MonthBar {
  label: string;
  fullLabel: string;
  total: number;
}

interface CustomTooltipProps {
  readonly active?: boolean;
  readonly payload?: Array<{ value: number }>;
  readonly label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      className="glass rounded-[10px] px-2.5 py-1.5 text-[10px] space-y-0.5"
      style={{ pointerEvents: "none" }}
    >
      <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      {value > 0 && (
        <p className="tabular-nums" style={{ color: "var(--color-negative)" }}>
          - {formatIDR(value)}
        </p>
      )}
    </div>
  );
}

export function CategoryTrendChart({
  transactions,
  categoryName,
}: CategoryTrendChartProps) {
  const t = useTranslations("report.categoryTrend");
  const locale = useLocale();
  const dateFnsLocale = locale === "id" ? idLocale : enUS;
  const mounted = useMounted();

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    const bars: MonthBar[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const label = format(monthDate, "MMM", { locale: dateFnsLocale });
      const fullLabel = format(monthDate, "MMM yyyy", { locale: dateFnsLocale });

      const total = transactions
        .filter(
          (tx) =>
            tx.is_active &&
            tx.type === "expense" &&
            tx.category !== "Balance Correction" &&
            (tx.category ?? "Other") === categoryName &&
            tx.transaction_date >= start &&
            tx.transaction_date <= end
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      bars.push({ label, fullLabel, total });
    }

    const withData = bars.filter((b) => b.total > 0);
    const avg = withData.length > 0
      ? withData.reduce((s, b) => s + b.total, 0) / withData.length
      : 0;

    let highestBar = withData[0] ?? null;
    let lowestBar = withData[0] ?? null;
    for (const b of withData) {
      if (b.total > (highestBar?.total ?? 0)) highestBar = b;
      if (b.total < (lowestBar?.total ?? Infinity)) lowestBar = b;
    }

    return {
      chartData: bars,
      stats: { avg, highest: highestBar, lowest: lowestBar },
    };
  }, [transactions, categoryName, dateFnsLocale]);

  const hasData = chartData.some((b) => b.total > 0);

  if (!hasData) {
    return (
      <p
        className="text-[12px] text-center py-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        {t("noData")}
      </p>
    );
  }

  return (
    <div className="glass rounded-[16px] px-4 pt-3 pb-4 space-y-3">
      <h2
        className="text-[12px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("sixMonths", { category: categoryName })}
      </h2>

      <div style={{ width: "100%", height: 160, minWidth: 0 }}>
      {mounted ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <BarChart
          data={chartData}
          barCategoryGap="30%"
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
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
            dataKey="total"
            name="total"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            fill="var(--color-negative)"
          />
        </BarChart>
      </ResponsiveContainer> : null}
      </div>

      <div className="space-y-1 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {t("avgPerMonth")}
          </span>
          <span
            className="text-[11px] tabular-nums font-semibold"
            style={{ color: "var(--text-primary)" }}
            suppressHydrationWarning
          >
            {formatIDR(stats.avg)}
          </span>
        </div>
        {stats.highest && (
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {t("highest")}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: "var(--color-negative)" }}
              suppressHydrationWarning
            >
              {stats.highest.fullLabel} · {formatIDR(stats.highest.total)}
            </span>
          </div>
        )}
        {stats.lowest && stats.lowest !== stats.highest && (
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {t("lowest")}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: "var(--text-secondary)" }}
              suppressHydrationWarning
            >
              {stats.lowest.fullLabel} · {formatIDR(stats.lowest.total)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
