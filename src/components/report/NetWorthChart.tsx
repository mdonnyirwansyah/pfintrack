"use client";

import { useMemo } from "react";
import { useMounted } from "@/hooks/useMounted";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { calculateMonthlySummary } from "@/lib/report/calculations";
import { formatIDR } from "@/lib/format/number";
import { useTranslations, useLocale } from "next-intl";

interface NetWorthChartProps {
  readonly transactions: Transaction[];
  readonly loanEntries: LoanEntry[];
  readonly balanceHistory: WalletBalanceHistory[];
}

interface MonthPoint {
  label: string;
  fullLabel: string;
  endBalance: number;
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
      <p
        className="tabular-nums font-semibold"
        style={{
          color: value >= 0 ? "var(--color-brand)" : "var(--color-negative)",
        }}
      >
        {formatIDR(value)}
      </p>
    </div>
  );
}

export function NetWorthChart({
  transactions,
  loanEntries,
  balanceHistory,
}: NetWorthChartProps) {
  const t = useTranslations("report");
  const locale = useLocale();
  const dateFnsLocale = locale === "id" ? idLocale : enUS;
  const mounted = useMounted();

  const chartData = useMemo<MonthPoint[]>(() => {
    const now = new Date();
    const points: MonthPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const label = format(monthDate, "MMM", { locale: dateFnsLocale });
      const fullLabel = format(monthDate, "MMM yyyy", { locale: dateFnsLocale });
      const { endBalance } = calculateMonthlySummary(
        transactions,
        loanEntries,
        balanceHistory,
        start,
        end
      );
      points.push({ label, fullLabel, endBalance });
    }

    return points;
  }, [transactions, loanEntries, balanceHistory, dateFnsLocale]);

  // Need at least 2 data points to be meaningful
  const hasData = chartData.some((p) => p.endBalance !== 0);
  const nonZeroCount = chartData.filter((p) => p.endBalance !== 0).length;
  if (!hasData || nonZeroCount < 2) return null;

  const currentBalance = chartData[chartData.length - 1]?.endBalance ?? 0;
  const earliestBalance = chartData[0]?.endBalance ?? 0;
  const delta = currentBalance - earliestBalance;
  const earliestLabel = chartData[0]?.fullLabel ?? "";

  const lineColor =
    currentBalance >= 0 ? "var(--color-brand)" : "var(--color-negative)";

  let deltaColor: string;
  if (delta > 0) deltaColor = "var(--color-positive)";
  else if (delta < 0) deltaColor = "var(--color-negative)";
  else deltaColor = "var(--text-secondary)";

  return (
    <figure className="glass rounded-[16px] px-4 pt-3 pb-4 space-y-3">
      <figcaption
        className="text-[12px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("netWorth.title")}
      </figcaption>

      <div style={{ width: "100%", height: 120, minWidth: 0 }}>
      {mounted ? <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "var(--color-brand)", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="endBalance"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer> : null}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {t("netWorth.now", { value: formatIDR(currentBalance) })}
        </span>
        <span
          className="text-[11px] tabular-nums font-semibold"
          style={{ color: deltaColor }}
          suppressHydrationWarning
        >
          {delta >= 0 ? "+" : ""}
          {formatIDR(delta)}{" "}
          <span className="font-normal" style={{ color: "var(--text-tertiary)" }}>
            {t("netWorth.from", { month: earliestLabel })}
          </span>
        </span>
      </div>
    </figure>
  );
}
