"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Globe, Info, Hash, Trash2, Download, Upload, ShieldCheck, ShieldOff, ChartPie, ChevronRight, Palette, BookOpen } from "lucide-react";
import { useColorTheme } from "@/hooks/useColorTheme";
import type { ColorTheme } from "@/hooks/useColorTheme";
import { AppHeader } from "@/components/shared/AppHeader";
import { useMounted } from "@/hooks/useMounted";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/actions/setLocale";
import { useAppStore } from "@/lib/stores/useAppStore";
import { useTourStore } from "@/lib/stores/useTourStore";
import { clearDemoData } from "@/lib/demo-data";
import { exportBackup, importBackup, deleteAllData } from "@/lib/storage/backup";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TypeToConfirmDialog } from "@/components/shared/TypeToConfirmDialog";
import { toast } from "sonner";

type ThemeOption = "light" | "dark" | "system";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const mounted = useMounted();
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showDecimals = useAppStore((s) => s.showDecimals);
  const setShowDecimals = useAppStore((s) => s.setShowDecimals);
  const resetTour = useTourStore((s) => s.resetTour);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoConfirmOpen, setDemoConfirmOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const [storageSupported, setStorageSupported] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const td = useTranslations("settings.data");

  useEffect(() => {
    setIsDemoMode(window.localStorage.getItem("pfintrack_demo_mode") === "true");
  }, []);

  useEffect(() => {
    if (!navigator.storage?.persisted) return;
    setStorageSupported(true);
    void navigator.storage.persisted().then(setStoragePersisted);
  }, []);

  const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Monitor },
  ];

  const COLOR_THEME_OPTIONS: { value: ColorTheme; label: string; dot: string }[] = [
    { value: "blue", label: t("accentColor.blue"), dot: "#5B8DEF" },
    { value: "pink", label: t("accentColor.pink"), dot: "#E8799A" },
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
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2"
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
                      className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                      style={{
                        background: isActive
                          ? "var(--color-brand-soft)"
                          : "var(--bg-icon)",
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
                      className="text-[13px]"
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

          {/* Color Theme Swatch Row */}
          <div style={dividerStyle} />
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <Palette className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                {t("accentColor.label")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {COLOR_THEME_OPTIONS.map(({ value, label, dot }) => {
                const isActive = mounted ? colorTheme === value : value === "blue";
                return (
                  <button
                    key={value}
                    aria-label={label}
                    aria-pressed={isActive}
                    onClick={() => setColorTheme(value)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: dot,
                      outline: isActive
                        ? `2px solid ${dot}`
                        : "2px solid transparent",
                      outlineOffset: 2,
                      padding: 6,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Language ── */}
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
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
                      className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                      style={{
                        background: isActive
                          ? "var(--color-brand-soft)"
                          : "var(--bg-icon)",
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
                      className="text-[13px]"
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
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
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
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <Hash className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {t("showDecimals")}
                </p>
                <p className="text-[11px] mt-0.5 font-medium tabular-nums" style={{ color: "var(--color-brand)" }}>
                  {showDecimals ? "100.000,00" : "100.000"}
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

        {/* ── Report ── */}
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("report.title")}
        </p>

        <div className={sectionClass}>
          <button
            className={rowClass + " w-full"}
            onClick={() => router.push("/settings/report")}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <ChartPie className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                {t("report.visibilitySettings")}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* ── Demo Mode ── */}
        {isDemoMode && (
          <>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
              style={{ color: "var(--color-negative)" }}
            >
              {t("demo.sectionTitle")}
            </p>
            <div className={sectionClass}>
              <button
                className={rowClass + " w-full"}
                onClick={() => setDemoConfirmOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                    style={{ background: "var(--color-negative-soft)" }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "var(--color-negative)" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium" style={{ color: "var(--color-negative)" }}>
                      {t("demo.clearButton")}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {t("demo.clearDesc")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Data & Storage ── */}
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {td("sectionTitle")}
        </p>

        <div className={sectionClass}>
          {/* Persistent storage */}
          <button
            className={rowClass + " w-full"}
            disabled={!storageSupported || !!storagePersisted}
            onClick={async () => {
              if (!navigator.storage?.persist) return;
              const granted = await navigator.storage.persist();
              setStoragePersisted(granted);
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{
                  background: storagePersisted
                    ? "color-mix(in srgb, var(--color-positive) 15%, transparent)"
                    : "var(--bg-icon)",
                }}
              >
                {storagePersisted ? (
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--color-positive)" }} />
                ) : (
                  <ShieldOff className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                )}
              </div>
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {td("persistTitle")}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: storagePersisted ? "var(--color-positive)" : "var(--text-tertiary)" }}>
                  {(() => {
                    if (!storageSupported) return td("persistUnsupported");
                    if (storagePersisted) return td("persistDesc");
                    return td("persistNotGranted");
                  })()}
                </p>
              </div>
            </div>
          </button>

          <div style={dividerStyle} />

          {/* Export */}
          <button
            className={rowClass + " w-full"}
            onClick={async () => {
              try {
                await exportBackup();
              } catch {
                toast.error(td("importError"));
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <Download className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {td("exportTitle")}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {td("exportDesc")}
                </p>
              </div>
            </div>
          </button>

          <div style={dividerStyle} />

          {/* Import */}
          <button
            className={rowClass + " w-full"}
            onClick={() => importInputRef.current?.click()}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <Upload className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {td("importTitle")}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {td("importDesc")}
                </p>
              </div>
            </div>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.gz,application/json,application/gzip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPendingImportFile(file);
              setImportConfirmOpen(true);
              e.target.value = "";
            }}
          />

          <div style={dividerStyle} />

          {/* Delete All Data */}
          <button
            className={rowClass + " w-full"}
            onClick={() => setDeleteAllOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "color-mix(in srgb, var(--color-negative) 12%, transparent)" }}
              >
                <Trash2 className="w-4 h-4" style={{ color: "var(--color-negative)" }} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium" style={{ color: "var(--color-negative)" }}>
                  {td("deleteAllTitle")}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {td("deleteAllDesc").split(".")[0]}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* ── Bantuan ── */}
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("help")}
        </p>

        <div className={sectionClass}>
          <button
            className={rowClass + " w-full"}
            onClick={() => resetTour()}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <BookOpen className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                {t("viewTutorial")}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* ── About ── */}
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("about")}
        </p>

        <div className={sectionClass}>
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                style={{ background: "var(--bg-icon)" }}
              >
                <Info className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                PFinTrack
              </span>
            </div>
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              v0.1.0
            </span>
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={demoConfirmOpen}
        onOpenChange={setDemoConfirmOpen}
        title={t("demo.confirmTitle")}
        description={t("demo.confirmDesc")}
        confirmLabel={t("demo.confirmAction")}
        cancelLabel={t("demo.confirmCancel")}
        variant="destructive"
        onConfirm={() => {
          setDemoConfirmOpen(false);
          void clearDemoData();
        }}
      />

      <ConfirmDialog
        open={importConfirmOpen}
        onOpenChange={setImportConfirmOpen}
        title={td("importConfirmTitle")}
        description={td("importConfirmDesc")}
        confirmLabel={td("importConfirmAction")}
        cancelLabel={td("importConfirmCancel")}
        variant="destructive"
        onConfirm={async () => {
          setImportConfirmOpen(false);
          if (!pendingImportFile) return;
          try {
            await importBackup(pendingImportFile);
            toast.success(td("importSuccess"));
            setTimeout(() => window.location.reload(), 800);
          } catch {
            toast.error(td("importError"));
          } finally {
            setPendingImportFile(null);
          }
        }}
      />

      <TypeToConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title={td("deleteAllTitle")}
        description={td("deleteAllDesc")}
        confirmPhrase={td("deleteAllPhrase")}
        inputLabel={td("deleteAllInputLabel")}
        inputPlaceholder={td("deleteAllInputPlaceholder")}
        confirmLabel={td("deleteAllConfirm")}
        cancelLabel={td("deleteAllCancel")}
        onConfirm={async () => {
          try {
            await deleteAllData();
            toast.success(td("deleteAllSuccess"));
            setTimeout(() => window.location.reload(), 800);
          } catch {
            toast.error(td("importError"));
          }
        }}
      />
    </>
  );
}
