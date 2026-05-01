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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="glass-strong mx-4 rounded-[20px]"
        style={{ maxWidth: "340px" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            className="text-[17px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription
              className="text-[15px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </AlertDialogDescription>
          )}
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
            {cancelLabel}
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
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
