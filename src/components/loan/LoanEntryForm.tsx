"use client";

import { useState, useEffect, useRef } from "react";
import { Calculator, ChevronDown, Trash2, AlertTriangle } from "lucide-react";
import type { LoanEntryType } from "@/lib/types/loan";
import type { Wallet } from "@/lib/types/wallet";
import { WalletPicker } from "@/components/shared/WalletPicker";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import { formatIDR, parseIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

export interface LoanEntryFormValues {
  transaction_date: string;
  transaction_time: string;
  amount: string;
  name: string;
  wallet_id: string | null;
  note: string;
}

export interface LoanEntryFormErrors {
  transaction_date?: string;
  transaction_time?: string;
  amount?: string;
  name?: string;
  wallet_id?: string;
  note?: string;
}

interface LoanEntryFormProps {
  type: LoanEntryType;
  initialValues?: Partial<LoanEntryFormValues>;
  /** If true, name field is pre-filled and locked (cannot be edited) */
  isNameLocked?: boolean;
  wallets: Wallet[];
  isSubmitting: boolean;
  isEditMode?: boolean;
  /** If provided, shows a Delete button (edit mode) */
  onDelete?: () => void;
  onSubmit: (values: LoanEntryFormValues) => void;
}

const MAX_AMOUNT = 999_999_999_999.99;

function getDefaults(initial?: Partial<LoanEntryFormValues>): LoanEntryFormValues {
  const defaults: LoanEntryFormValues = {
    transaction_date: initial?.transaction_date ?? todayISO(),
    transaction_time: initial?.transaction_time ?? currentTimeHHMM(),
    amount: initial?.amount ?? "",
    name: initial?.name ?? "",
    wallet_id: initial?.wallet_id ?? null,
    note: initial?.note ?? "",
  };

  if (initial?.amount) {
    const parsed = parseIDR(initial.amount);
    if (!Number.isNaN(parsed)) {
      defaults.amount = formatIDR(parsed);
    }
  }

  return defaults;
}

export function LoanEntryForm({
  type,
  initialValues,
  isNameLocked = false,
  wallets,
  isSubmitting,
  isEditMode = false,
  onDelete,
  onSubmit,
}: LoanEntryFormProps) {
  const [values, setValues] = useState<LoanEntryFormValues>(() =>
    getDefaults(initialValues)
  );
  const [errors, setErrors] = useState<LoanEntryFormErrors>({});
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open wallet picker on mount if it's add mode
  useEffect(() => {
    if (!initialValues?.wallet_id) {
      setIsWalletPickerOpen(true);
    }
  }, [initialValues?.wallet_id]);

  const selectedWallet = wallets.find((w) => w.id === values.wallet_id) ?? null;
  const parsedAmount = parseIDR(values.amount) || 0;
  // In edit mode the wallet balance already reflects the original entry being deducted,
  // so add it back before comparing to avoid a false "insufficient" warning.
  const originalAmount = isEditMode ? (parseIDR(initialValues?.amount ?? "0") || 0) : 0;
  const insufficientBalance =
    type === "give" &&
    selectedWallet !== null &&
    parsedAmount > 0 &&
    parsedAmount > selectedWallet.balance + originalAmount;

  const t = useTranslations("loan");
  const tc = useTranslations("common");

  function set<K extends keyof LoanEntryFormValues>(
    key: K,
    value: LoanEntryFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    if (errors[key as keyof LoanEntryFormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): LoanEntryFormErrors {
    const errs: LoanEntryFormErrors = {};
    const amountNum = parseIDR(values.amount);

    if (!values.transaction_date) {
      errs.transaction_date = t("validation.dateRequired");
    }
    if (!values.transaction_time) {
      errs.transaction_time = t("validation.timeRequired");
    }
    if (!values.amount.trim()) {
      errs.amount = t("validation.amountRequired");
    } else if (Number.isNaN(amountNum) || amountNum <= 0) {
      errs.amount = t("validation.amountInvalid");
    } else if (amountNum > MAX_AMOUNT) {
      errs.amount = t("validation.amountExceeds");
    }

    if (!values.wallet_id) {
      errs.wallet_id = t("validation.walletRequired");
    }

    if (!isNameLocked) {
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        errs.name = t("validation.nameRequired");
      } else if (trimmedName.length < 2) {
        errs.name = t("validation.nameTooShort");
      } else if (trimmedName.length > 50) {
        errs.name = t("validation.nameTooLong");
      }
    }

    if (values.note.length > 255) {
      errs.note = t("validation.noteTooLong");
    }

    return errs;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...values,
      name: values.name.trim(),
      note: values.note.trim(),
    });
  }

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] text-[14px] outline-none transition-colors";
  const inputStyle = (hasError?: string) => ({
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: `1px solid ${hasError ? "var(--color-negative)" : "var(--border-default)"}`,
    minHeight: "var(--tap-target-min)",
  });

  return (
    <>
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4" noValidate>
        {/* Date & Time Row */}
        <div className="flex gap-2 w-full">
          {/* Date */}
          <div className="flex-[3] min-w-0 overflow-hidden space-y-1">
            <label
              className="block text-[12px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("form.date")}
            </label>
            <input
              type="date"
              value={values.transaction_date}
              onChange={(e) => set("transaction_date", e.target.value)}
              className={inputClass}
              style={inputStyle(errors.transaction_date)}
              suppressHydrationWarning
            />
            {errors.transaction_date && (
              <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
                {errors.transaction_date}
              </p>
            )}
          </div>

          {/* Time */}
          <div className="flex-[2] min-w-0 overflow-hidden space-y-1">
            <label
              className="block text-[12px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("form.time")}
            </label>
            <input
              type="time"
              value={values.transaction_time}
              onChange={(e) => set("transaction_time", e.target.value)}
              className={inputClass}
              style={inputStyle(errors.transaction_time)}
              suppressHydrationWarning
            />
            {errors.transaction_time && (
              <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
                {errors.transaction_time}
              </p>
            )}
          </div>
        </div>

        {/* Wallet selector (required) */}
        <div className="space-y-1">
          <label
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("form.wallet")}
          </label>
          <button
            type="button"
            onClick={() => setIsWalletPickerOpen(true)}
            className="w-full flex items-center justify-between rounded-[12px] px-4 transition-all active:scale-[0.98]"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${errors.wallet_id ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
            }}
          >
            <span
              className="text-[14px]"
              style={{
                color: selectedWallet
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              {selectedWallet ? selectedWallet.name : t("form.selectWallet")}
            </span>
            <ChevronDown
              className="w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
            />
          </button>
          {selectedWallet && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {t("form.currentBalance")} {formatIDR(selectedWallet.balance)}
            </p>
          )}
          {errors.wallet_id && (
            <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.wallet_id}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("form.amount")}
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${errors.amount ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
            }}
          >
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              placeholder={t("form.amount")}
              value={values.amount}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replaceAll(/[^0-9,]/g, "");
                if (!val) {
                  set("amount", "");
                  return;
                }
                const parts = val.split(",");
                let integerPart = parts[0];
                const decimalPart = parts.length > 1 ? "," + parts[1] : "";
                if (integerPart) {
                  const parsed = Number.parseInt(integerPart, 10);
                  if (!Number.isNaN(parsed)) {
                    integerPart = parsed.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, ".");
                  } else {
                    integerPart = "";
                  }
                }
                set("amount", integerPart + decimalPart);
              }}
              className="flex-1 bg-transparent outline-none text-[14px] py-3"
              style={{ color: "var(--text-primary)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  nameInputRef.current?.focus();
                }
              }}
            />
            <Calculator
              className="w-4 h-4 ml-3 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {["000", "00"].map((zeros) => (
              <button
                key={zeros}
                type="button"
                onClick={() => {
                  const intPart = (values.amount || "0").replaceAll(".", "").split(",")[0];
                  const num = Number.parseInt(intPart || "0", 10);
                  const factor = zeros === "000" ? 1000 : 100;
                  const newNum = num * factor;
                  if (newNum <= 999_999_999_999) {
                    set("amount", newNum.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, "."));
                  }
                }}
                className="px-2.5 py-1 rounded-[6px] text-[10px] font-medium transition-opacity active:opacity-60"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                +{zeros}
              </button>
            ))}
          </div>
          {insufficientBalance && !errors.amount && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-accent-warm)" }} />
              <p className="text-[11px]" style={{ color: "var(--color-accent-warm)" }}>
                {t("insufficientBalance")}
              </p>
            </div>
          )}
          {errors.amount && (
            <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.amount}
            </p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("form.name")}
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${errors.name ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
              opacity: isNameLocked ? 0.7 : 1,
            }}
          >
            <input
              ref={nameInputRef}
              type="text"
              placeholder={t("form.namePlaceholder")}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={isNameLocked}
              maxLength={50}
              className="flex-1 bg-transparent outline-none text-[14px] py-3 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  noteRef.current?.focus();
                }
              }}
            />
          </div>
          {errors.name && (
            <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("form.noteOptional")}
          </label>
          <div
            className="relative rounded-[12px] px-4 py-3"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${errors.note ? "var(--color-negative)" : "var(--border-default)"}`,
            }}
          >
            <textarea
              ref={noteRef}
              placeholder={t("form.notePlaceholder")}
              value={values.note}
              onChange={(e) => set("note", e.target.value)}
              maxLength={255}
              rows={3}
              className="w-full bg-transparent outline-none text-[14px] resize-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {errors.note && (
            <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.note}
            </p>
          )}
          <p
            className="text-[10px] text-right"
            style={{ color: "var(--text-tertiary)" }}
          >
            {values.note.length}/255
          </p>
        </div>

        {/* Delete button (edit mode only) */}
        {onDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] transition-all active:scale-[0.98]"
            style={{
              background: "var(--color-negative-soft)",
              color: "var(--color-negative)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-[14px] font-medium">{t("deleteEntry")}</span>
          </button>
        )}

        {/* Save button */}
        <div className="pt-2 pb-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3.5 rounded-[14px] font-semibold text-[14px] transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "var(--color-brand)",
              color: "var(--text-on-primary)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            {(() => {
              if (isSubmitting) {
                return (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    />
                    {tc("saving")}
                  </span>
                );
              }
              if (isEditMode) return tc("saveChanges");
              return tc("save");
            })()}
          </button>
        </div>
      </form>

      {/* Wallet picker bottom sheet */}
      <WalletPicker
        open={isWalletPickerOpen}
        onClose={() => setIsWalletPickerOpen(false)}
        wallets={wallets}
        selectedWalletId={values.wallet_id ?? undefined}
        onSelect={(wallet) => {
          setValues((prev) => ({ ...prev, wallet_id: wallet.id }));
          setErrors((prev) => ({ ...prev, wallet_id: undefined }));
          setIsWalletPickerOpen(false);
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 300);
        }}
      />

      {/* Delete confirmation dialog */}
      {onDelete && (
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title={t("deleteEntryConfirm.title")}
          description={t("deleteEntryConfirm.description")}
          confirmLabel={t("deleteEntryConfirm.confirm")}
          cancelLabel={t("deleteEntryConfirm.cancel")}
          variant="destructive"
          onConfirm={() => {
            setIsDeleteDialogOpen(false);
            onDelete();
          }}
        />
      )}
    </>
  );
}
