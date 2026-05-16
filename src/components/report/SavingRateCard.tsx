"use client";

import { formatIDR, formatIDRSigned } from "@/lib/format/number";
import { useTranslations } from "next-intl";

interface SavingRateCardProps {
  readonly income: number;
  readonly expenses: number;
}

function getSavingRateColor(rate: number | null): string {
  if (rate === null) return "var(--text-tertiary)";
  if (rate >= 20) return "var(--color-positive)";
  if (rate >= 10) return "var(--color-accent)";
  return "var(--color-negative)";
}

function getSavingRateBarColor(rate: number | null): string {
  if (rate === null) return "var(--bg-secondary)";
  if (rate >= 20) return "var(--color-positive)";
  if (rate >= 10) return "var(--color-accent)";
  return "var(--color-negative)";
}

export function SavingRateCard({ income, expenses }: SavingRateCardProps) {
  const t = useTranslations("report.savingRate");

  const isNA = income === 0;
  const rate = isNA ? null : ((income - expenses) / income) * 100;
  const barPercent = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  const rateColor = getSavingRateColor(rate);
  const barColor = getSavingRateBarColor(rate);

  const rateLabel = isNA
    ? t("na")
    : `${Math.round(rate!)}%`;

  const saved = income - expenses;

  return (
    <div
      className="glass rounded-[16px] px-4 py-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("title")}
        </span>
        <span
          className="text-[17px] font-bold tabular-nums"
          style={{ color: rateColor }}
          suppressHydrationWarning
        >
          {rateLabel}
        </span>
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: "var(--bg-secondary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barPercent}%`,
            background: barColor,
          }}
        />
      </div>

      <p
        className="text-[11px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {t("benchmark")}
      </p>

      {!isNA && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {t("income")}{" "}
            <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {formatIDR(income)}
            </span>
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {t("saved")}{" "}
            <span
              className="tabular-nums font-semibold"
              style={{ color: rateColor }}
            >
              {formatIDRSigned(saved)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
