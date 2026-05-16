"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TypeToConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly confirmPhrase: string;
  readonly inputLabel: string;
  readonly inputPlaceholder: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
}

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmPhrase,
  inputLabel,
  inputPlaceholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: TypeToConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const canConfirm = typed === confirmPhrase;

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="glass-strong rounded-[20px] w-[calc(100vw-2rem)]"
        style={{ maxWidth: "340px" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            className="text-[16px] font-semibold"
            style={{ color: "var(--color-negative)" }}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            className="text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 py-1">
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            {inputLabel}
          </p>
          <span
            className="font-mono font-semibold px-2 py-1 rounded-[8px] text-[13px] select-none self-start"
            style={{
              background: "color-mix(in srgb, var(--color-negative) 12%, transparent)",
              color: "var(--color-negative)",
              userSelect: "none",
            }}
          >
            {confirmPhrase}
          </span>
          <input
            type="text"
            value={typed}
            placeholder={inputPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full rounded-[12px] px-3 py-2.5 text-[14px] outline-none border"
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderColor: typed.length > 0 && !canConfirm
                ? "var(--color-negative)"
                : "var(--border-default)",
            }}
          />
        </div>

        <AlertDialogFooter className="flex-row gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-[12px] text-[14px] font-medium"
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="flex-1 rounded-[12px] text-[14px] font-semibold transition-opacity"
            style={{
              background: canConfirm ? "var(--color-negative)" : "var(--bg-secondary)",
              color: canConfirm ? "var(--text-on-primary)" : "var(--text-tertiary)",
              minHeight: "var(--tap-target-min)",
              opacity: canConfirm ? 1 : 0.5,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
