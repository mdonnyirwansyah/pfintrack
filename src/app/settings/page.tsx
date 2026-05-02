"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Globe, Info, Hash } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { useMounted } from "@/hooks/useMounted";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/actions/setLocale";
import { useAppStore } from "@/lib/stores/useAppStore";

type ThemeOption = "light" | "dark" | "system";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showDecimals = useAppStore((s) => s.showDecimals);
  const setShowDecimals = useAppStore((s) => s.setShowDecimals);

  const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Monitor },
  ];

  const LANGUAGE_OPTIONS = [
    { value: "en" as const, label: t("lang.en") },
    { value: "id" as const, label: t("lang.id") },
  ];

  const handleLocaleChange = (newLocale: "en" | "id") => {
    if (newLocale === locale || isPending) return;
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  };

  const rowClass =
    "flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70";
  const sectionClass = "glass rounded-[16px] overflow-hidden mb-4";
  const dividerStyle = { height: 1, background: "var(--divider)", marginInline: 16 };

  return (
    <>
      <AppHeader title={t("title")} />

      <div className="px-4 py-4 space-y-2">

        {/* ── Appearance ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("appearance")}
        </p>

        <div className={sectionClass}>
          {/* Theme selector */}
          {THEME_OPTIONS.map(({ value, label, icon: Icon }, idx) => {
            const isActive = mounted ? theme === value : value === "system";
            return (
              <div key={value}>
                {idx > 0 && <div style={dividerStyle} />}
                <button
                  className={rowClass + " w-full"}
                  onClick={() => setTheme(value)}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                      style={{
                        background: isActive
                          ? "var(--color-brand-soft)"
                          : "var(--bg-secondary)",
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{
                          color: isActive
                            ? "var(--color-brand)"
                            : "var(--text-secondary)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[15px]"
                      style={{
                        color: isActive
                          ? "var(--color-brand)"
                          : "var(--text-primary)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Checkmark */}
                  {isActive && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--color-brand)", flexShrink: 0 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Language ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("language")}
        </p>

        <div className={sectionClass}>
          {LANGUAGE_OPTIONS.map(({ value, label }, idx) => {
            const isActive = locale === value;
            return (
              <div key={value}>
                {idx > 0 && <div style={dividerStyle} />}
                <button
                  className={rowClass + " w-full"}
                  onClick={() => handleLocaleChange(value)}
                  aria-pressed={isActive}
                  disabled={isPending}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                      style={{
                        background: isActive
                          ? "var(--color-brand-soft)"
                          : "var(--bg-secondary)",
                      }}
                    >
                      <Globe
                        className="w-4 h-4"
                        style={{
                          color: isActive
                            ? "var(--color-brand)"
                            : "var(--text-secondary)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[15px]"
                      style={{
                        color: isActive
                          ? "var(--color-brand)"
                          : "var(--text-primary)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "var(--color-brand)", flexShrink: 0 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Display ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("display")}
        </p>

        <div className={sectionClass}>
          <button
            className={rowClass + " w-full"}
            onClick={() => setShowDecimals(!showDecimals)}
            aria-pressed={showDecimals}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                style={{ background: "var(--bg-secondary)" }}
              >
                <Hash className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="text-left">
                <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>
                  {t("showDecimals")}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {t("showDecimalsDesc")}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <div
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{
                backgroundColor: showDecimals ? "var(--color-brand)" : "var(--border-default)",
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                style={{
                  backgroundColor: "white",
                  transform: showDecimals ? "translateX(20px)" : "translateX(2px)",
                }}
              />
            </div>
          </button>
        </div>

        {/* ── About ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("about")}
        </p>

        <div className={sectionClass}>
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px]"
                style={{ background: "var(--bg-secondary)" }}
              >
                <Info className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="text-[15px]" style={{ color: "var(--text-primary)" }}>
                pfintrack
              </span>
            </div>
            <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
              v0.1.0
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
