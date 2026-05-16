"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: "destructive" | "default";
  readonly onConfirm: () => void;
  readonly contentClassName?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  contentClassName,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const resolvedConfirmLabel = confirmLabel ?? t("confirm");
  const resolvedCancelLabel = cancelLabel ?? t("cancel");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={`glass-strong rounded-[20px] w-[calc(100vw-2rem)] ${contentClassName ?? ""}`}
        style={{ maxWidth: "340px" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            className="text-[16px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            className="text-[14px]"
            style={{ color: "var(--text-secondary)", display: description ? undefined : "none" }}
          >
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3">
          <AlertDialogCancel
            className="flex-1 rounded-[12px] border-0"
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            {resolvedCancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="flex-1 rounded-[12px] border-0 font-semibold"
            style={{
              backgroundColor:
                variant === "destructive"
                  ? "var(--color-negative)"
                  : "var(--color-brand)",
              color: "var(--text-on-primary)",
              minHeight: "var(--tap-target-min)",
            }}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
