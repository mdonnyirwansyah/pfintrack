"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Globe, ChevronRight, Info } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { useMounted } from "@/hooks/useMounted";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// Language options — stored as stub for future i18n implementation
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "id", label: "Indonesia" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  // Language state — stubbed until i18n is implemented
  const currentLang = "en";

  const rowClass =
    "flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70";
  const sectionClass = "glass rounded-[16px] overflow-hidden mb-4";
  const sectionStyle = {
    boxShadow: "var(--shadow-sm)",
  };
  const dividerStyle = { height: 1, background: "var(--divider)", marginInline: 16 };

  return (
    <>
      <AppHeader title="Settings" />

      <div className="px-4 py-4 space-y-2">

        {/* ── Appearance ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Appearance
        </p>

        <div className={sectionClass} style={sectionStyle}>
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
          Language
        </p>

        <div className={sectionClass} style={sectionStyle}>
          {LANGUAGE_OPTIONS.map(({ value, label }, idx) => {
            const isActive = currentLang === value;
            return (
              <div key={value}>
                {idx > 0 && <div style={dividerStyle} />}
                <div className={rowClass}>
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
                    {!isActive && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent)",
                        }}
                      >
                        Soon
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── About ── */}
        <p
          className="text-[12px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          About
        </p>

        <div className={sectionClass} style={sectionStyle}>
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
