"use client";

import { X, TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";
import { useTranslations } from "next-intl";

export type InsightType =
  | "categoryUp"
  | "lowSavingRate"
  | "categoryDominant"
  | "expenseDown"
  | "noIncome";

export interface InsightData {
  type: InsightType;
  /** Category name (for categoryUp / categoryDominant) */
  category?: string;
  /** Numeric percent, already rounded (for categoryUp / categoryDominant / expenseDown) */
  percent?: number;
  /** Month label e.g. "Apr" (for categoryUp) */
  month?: string;
}

interface InsightCardProps {
  insight: InsightData;
  onDismiss: () => void;
}

function InsightIcon({ type }: { type: InsightType }) {
  switch (type) {
    case "categoryUp":
      return <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-negative)" }} />;
    case "lowSavingRate":
      return <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-negative)" }} />;
    case "categoryDominant":
      return <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-accent)" }} />;
    case "expenseDown":
      return <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-positive)" }} />;
    case "noIncome":
      return <Info className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />;
  }
}

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const t = useTranslations("report.insight");
  const tc = useTranslations("common");

  let message = "";
  switch (insight.type) {
    case "categoryUp":
      message = t("categoryUp", {
        category: insight.category ?? "",
        percent: insight.percent ?? 0,
        month: insight.month ?? "",
      });
      break;
    case "lowSavingRate":
      message = t("lowSavingRate");
      break;
    case "categoryDominant":
      message = t("categoryDominant", {
        category: insight.category ?? "",
        percent: insight.percent ?? 0,
      });
      break;
    case "expenseDown":
      message = t("expenseDown", { percent: insight.percent ?? 0 });
      break;
    case "noIncome":
      message = t("noIncome");
      break;
  }

  let accentColor: string;
  if (insight.type === "expenseDown") {
    accentColor = "var(--color-positive)";
  } else if (insight.type === "noIncome") {
    accentColor = "var(--text-tertiary)";
  } else if (insight.type === "categoryDominant") {
    accentColor = "var(--color-accent)";
  } else {
    accentColor = "var(--color-negative)";
  }

  return (
    <div
      className="glass rounded-[16px] px-4 py-3"
      style={{
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        <InsightIcon type={insight.type} />
        <p
          className="text-[12px] flex-1 leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {message}
        </p>
        <button
          onClick={onDismiss}
          className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 transition-opacity active:opacity-60"
          style={{ color: "var(--text-tertiary)" }}
          aria-label={tc("close")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
