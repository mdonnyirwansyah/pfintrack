"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const tc = useTranslations("common");

  if (!mounted) {
    return (
      <div
        className="w-10 h-10 rounded-full"
        style={{ background: "var(--bg-secondary)" }}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center rounded-full transition-all active:scale-95"
      style={{
        width: "var(--tap-target-min)",
        height: "var(--tap-target-min)",
        color: "var(--text-primary)",
      }}
      aria-label={isDark ? tc("switchToLight") : tc("switchToDark")}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
