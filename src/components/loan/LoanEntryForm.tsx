"use client";

import { useState } from "react";
import { Calculator, Calendar, Clock, ChevronDown, Trash2 } from "lucide-react";
import type { LoanEntryType } from "@/lib/types/loan";
import type { Wallet } from "@/lib/types/wallet";
import { WalletPicker } from "@/components/shared/WalletPicker";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";

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
  note?: string;
}

interface LoanEntryFormProps {
  type: LoanEntryType;
  initialValues?: Partial<LoanEntryFormValues>;
  /** If true, name field is pre-filled and locked (cannot be edited) */
  isNameLocked?: boolean;
  wallets: Wallet[];
  isSubmitting: boolean;
  /** If provided, shows a Delete button (edit mode) */
  onDelete?: () => void;
  onSubmit: (values: LoanEntryFormValues) => void;
}

const MAX_AMOUNT = 999_999_999_999.99;

function getDefaults(initial?: Partial<LoanEntryFormValues>): LoanEntryFormValues {
  return {
    transaction_date: initial?.transaction_date ?? todayISO(),
    transaction_time: initial?.transaction_time ?? currentTimeHHMM(),
    amount: initial?.amount ?? "",
    name: initial?.name ?? "",
    wallet_id: initial?.wallet_id ?? null,
    note: initial?.note ?? "",
  };
}

export function LoanEntryForm({
  type,
  initialValues,
  isNameLocked = false,
  wallets,
  isSubmitting,
  onDelete,
  onSubmit,
}: LoanEntryFormProps) {
  const [values, setValues] = useState<LoanEntryFormValues>(() =>
    getDefaults(initialValues)
  );
  const [errors, setErrors] = useState<LoanEntryFormErrors>({});
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const selectedWallet = wallets.find((w) => w.id === values.wallet_id) ?? null;

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
    const amountNum = parseFloat(
      values.amount.replace(/\./g, "").replace(",", ".")
    );

    if (!values.transaction_date) {
      errs.transaction_date = "Tanggal harus dipilih";
    }
    if (!values.transaction_time) {
      errs.transaction_time = "Waktu harus dipilih";
    }
    if (!values.amount.trim()) {
      errs.amount = "Nominal tidak boleh kosong";
    } else if (isNaN(amountNum) || amountNum <= 0) {
      errs.amount = "Nominal harus lebih dari 0";
    } else if (amountNum > MAX_AMOUNT) {
      errs.amount = "Nominal melebihi batas maksimum";
    }

    if (!isNameLocked) {
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        errs.name = "Nama tidak boleh kosong";
      } else if (trimmedName.length < 2) {
        errs.name = "Nama minimal 2 karakter";
      } else if (trimmedName.length > 50) {
        errs.name = "Nama maksimal 50 karakter";
      }
    }

    if (values.note.length > 255) {
      errs.note = "Note maksimal 255 karakter";
    }

    return errs;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <>
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4" noValidate>
        {/* Date */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Date
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${errors.transaction_date ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
            }}
          >
            <Calendar
              className="w-4 h-4 mr-3 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="date"
              value={values.transaction_date}
              onChange={(e) => set("transaction_date", e.target.value)}
              className="flex-1 bg-transparent outline-none text-[15px] py-3"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {errors.transaction_date && (
            <p className="text-[12px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_date}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Time
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${errors.transaction_time ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
            }}
          >
            <Clock
              className="w-4 h-4 mr-3 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="time"
              value={values.transaction_time}
              onChange={(e) => set("transaction_time", e.target.value)}
              className="flex-1 bg-transparent outline-none text-[15px] py-3"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {errors.transaction_time && (
            <p className="text-[12px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_time}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Amount
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${errors.amount ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
            }}
          >
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount"
              value={values.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="flex-1 bg-transparent outline-none text-[15px] py-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: "var(--text-primary)" }}
              min="0"
              step="any"
            />
            <Calculator
              className="w-4 h-4 ml-3 shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          {errors.amount && (
            <p className="text-[12px]" style={{ color: "var(--color-negative)" }}>
              {errors.amount}
            </p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Name
          </label>
          <div
            className="relative flex items-center rounded-[12px] px-4"
            style={{
              background: isNameLocked ? "var(--bg-secondary)" : "var(--bg-card)",
              border: `1px solid ${errors.name ? "var(--color-negative)" : "var(--border-default)"}`,
              minHeight: "var(--tap-target-min)",
              opacity: isNameLocked ? 0.7 : 1,
            }}
          >
            <input
              type="text"
              placeholder="Enter the name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={isNameLocked}
              maxLength={50}
              className="flex-1 bg-transparent outline-none text-[15px] py-3 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {errors.name && (
            <p className="text-[12px]" style={{ color: "var(--color-negative)" }}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Wallet selector (optional) */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Wallet (optional)
          </label>
          <button
            type="button"
            onClick={() => setIsWalletPickerOpen(true)}
            className="w-full flex items-center justify-between rounded-[12px] px-4 transition-all active:scale-[0.98]"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            <span
              className="text-[15px]"
              style={{
                color: selectedWallet
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              {selectedWallet
                ? selectedWallet.name
                : "Select Wallet (optional)"}
            </span>
            <div className="flex items-center gap-2">
              {selectedWallet && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    set("wallet_id", null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      set("wallet_id", null);
                    }
                  }}
                  className="text-[12px] px-2 py-0.5 rounded-full cursor-pointer"
                  style={{
                    color: "var(--text-tertiary)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  Clear
                </span>
              )}
              <ChevronDown
                className="w-4 h-4"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </button>
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Note (optional)
          </label>
          <div
            className="relative rounded-[12px] px-4 py-3"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${errors.note ? "var(--color-negative)" : "var(--border-default)"}`,
            }}
          >
            <textarea
              placeholder="Note (optional)"
              value={values.note}
              onChange={(e) => set("note", e.target.value)}
              maxLength={255}
              rows={3}
              className="w-full bg-transparent outline-none text-[15px] resize-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {errors.note && (
            <p className="text-[12px]" style={{ color: "var(--color-negative)" }}>
              {errors.note}
            </p>
          )}
          <p
            className="text-[11px] text-right"
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
            <span className="text-[15px] font-medium">Delete Entry</span>
          </button>
        )}

        {/* Save button */}
        <div className="pt-2 pb-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3.5 rounded-[14px] font-semibold text-[16px] transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "var(--color-brand)",
              color: "var(--text-on-primary)",
              minHeight: "var(--tap-target-min)",
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                />
                Saving...
              </span>
            ) : (
              `Save ${type === "give" ? "Give" : "Get"}`
            )}
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
          set("wallet_id", wallet.id);
          setIsWalletPickerOpen(false);
        }}
      />

      {/* Delete confirmation dialog */}
      {onDelete && (
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Delete this entry?"
          description="This will roll back any wallet balance changes caused by this entry."
          confirmLabel="Delete"
          cancelLabel="Cancel"
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
