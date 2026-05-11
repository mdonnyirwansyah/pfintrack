"use client";

import { useTranslations } from "next-intl";
import { ChartPie, HandCoins, Lightbulb, ArrowRightLeft, Pencil, BarChart3, TrendingUp, Eye, EyeOff } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { useAppStore } from "@/lib/stores/useAppStore";

export default function ReportSettingsPage() {
  const t = useTranslations("settings");
  const reportVisibility = useAppStore((s) => s.reportVisibility);
  const setReportVisibility = useAppStore((s) => s.setReportVisibility);
  const setAllReportVisibility = useAppStore((s) => s.setAllReportVisibility);

  const rowClass = "flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70";
  const sectionClass = "glass rounded-[16px] overflow-hidden mb-4";
  const dividerStyle = { height: 1, background: "var(--divider)", marginInline: 16 };

  const items = [
    {
      key: "showSavingRateCard" as const,
      label: t("report.showSavingRateCard"),
      icon: ChartPie,
    },
    {
      key: "showLoanOutstanding" as const,
      label: t("report.showLoanOutstanding"),
      icon: HandCoins,
    },
    {
      key: "showInsightCard" as const,
      label: t("report.showInsightCard"),
      icon: Lightbulb,
    },
    {
      key: "showDonutChart" as const,
      label: t("report.showDonutChart"),
      hint: t("report.showDonutChartHint"),
      icon: ChartPie,
    },
    {
      key: "showLoanRow" as const,
      label: t("report.showLoanRow"),
      icon: ArrowRightLeft,
    },
    {
      key: "showBalanceCorrectionRow" as const,
      label: t("report.showBalanceCorrectionRow"),
      icon: Pencil,
    },
    {
      key: "showMonthlyOverviewChart" as const,
      label: t("report.showMonthlyOverviewChart"),
      icon: BarChart3,
    },
    {
      key: "showNetWorthChart" as const,
      label: t("report.showNetWorthChart"),
      icon: TrendingUp,
    },
  ];

  const allOn = items.every(({ key }) => reportVisibility[key]);

  return (
    <>
      <AppHeader title={t("report.title")} showBack />

      <div className="px-4 py-4">
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setAllReportVisibility(!allOn)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-[0.96]"
            style={{
              background: allOn ? "var(--bg-secondary)" : "var(--color-brand)",
              color: allOn ? "var(--text-secondary)" : "var(--text-on-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {allOn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {allOn ? t("report.hideAll") : t("report.showAll")}
          </button>
        </div>

        <div className={sectionClass}>
          {items.map(({ key, label, hint, icon: Icon }, idx) => {
            const isOn = reportVisibility[key];
            return (
              <div key={key}>
                {idx > 0 && <div style={dividerStyle} />}
                <button
                  className={rowClass + " w-full"}
                  onClick={() => setReportVisibility(key, !isOn)}
                  aria-pressed={isOn}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                      style={{ background: "var(--bg-icon)" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </div>
                    {hint ? (
                      <div className="text-left">
                        <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                          {label}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {hint}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                        {label}
                      </span>
                    )}
                  </div>

                  <div
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: isOn ? "var(--color-brand)" : "var(--border-default)" }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                      style={{ backgroundColor: "white", transform: isOn ? "translateX(20px)" : "translateX(2px)" }}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
