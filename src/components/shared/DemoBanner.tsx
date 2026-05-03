"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { clearDemoData } from "@/lib/demo-data";
import { ConfirmDialog } from "./ConfirmDialog";
import { useTranslations } from "next-intl";

export function DemoBanner() {
  const t = useTranslations("demo");
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const [dismissed, setDismissed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isDemoMode || dismissed) return null;

  return (
    <>
      <div
        className="flex items-start justify-between px-4 py-2.5 gap-2"
        style={{
          background: "var(--color-brand)",
          color: "var(--text-on-primary)",
        }}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium leading-snug">
            {t("banner.message")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold active:opacity-70 transition-opacity"
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "var(--text-on-primary)",
            }}
          >
            {t("banner.clearButton")}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center justify-center w-6 h-6 rounded-full active:opacity-70 transition-opacity"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label={t("banner.closeAriaLabel")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("clearConfirm.title")}
        description={t("clearConfirm.description")}
        confirmLabel={t("clearConfirm.confirm")}
        cancelLabel={t("clearConfirm.cancel")}
        variant="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          clearDemoData();
        }}
      />
    </>
  );
}
