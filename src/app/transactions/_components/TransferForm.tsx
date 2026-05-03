"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import type { Wallet } from "@/lib/types/wallet";
import { WalletPicker } from "@/components/shared/WalletPicker";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import { formatIDR, parseIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

export interface TransferFormValues {
  transaction_date: string;
  transaction_time: string;
  source_wallet_id: string;
  destination_wallet_id: string;
  amount: string;
  description: string;
}

interface TransferFormProps {
  wallets: Wallet[];
  initialValues?: Partial<TransferFormValues>;
  isSubmitting: boolean;
  submitLabel?: string;
  onSubmit: (values: TransferFormValues) => void;
  footerActions?: React.ReactNode;
}

type FormErrors = Partial<Record<keyof TransferFormValues, string>>;

export function TransferForm({
  wallets,
  initialValues,
  isSubmitting,
  submitLabel,
  onSubmit,
  footerActions,
}: TransferFormProps) {
  const router = useRouter();
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const resolvedSubmitLabel = submitLabel ?? tc("save");

  const defaults: TransferFormValues = {
    transaction_date: todayISO(),
    transaction_time: currentTimeHHMM(),
    source_wallet_id: "",
    destination_wallet_id: "",
    amount: "",
    description: "",
    ...initialValues,
  };

  if (initialValues?.amount) {
    const parsed = parseIDR(initialValues.amount);
    if (!isNaN(parsed)) {
      defaults.amount = formatIDR(parsed);
    }
  }

  const [form, setForm] = useState<TransferFormValues>(defaults);
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeWalletPicker, setActiveWalletPicker] = useState<
    "source" | "destination" | null
  >(null);

  // Auto-open source wallet picker on mount if it's add mode
  useEffect(() => {
    if (!initialValues?.source_wallet_id) {
      setActiveWalletPicker("source");
    }
  }, [initialValues?.source_wallet_id]);

  const sourceWallet = wallets.find((w) => w.id === form.source_wallet_id) ?? null;
  const destWallet = wallets.find((w) => w.id === form.destination_wallet_id) ?? null;

  // Filter wallets to exclude the other selection
  const sourceWallets = wallets.filter(
    (w) => w.is_active && w.id !== form.destination_wallet_id
  );
  const destWallets = wallets.filter(
    (w) => w.is_active && w.id !== form.source_wallet_id
  );

  const set = useCallback(
    (field: keyof TransferFormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    const amount = parseIDR(form.amount) || 0;

    if (!form.transaction_date) e.transaction_date = t("validation.dateRequired");
    if (!form.transaction_time) e.transaction_time = t("validation.timeRequired");
    if (!form.source_wallet_id) e.source_wallet_id = t("validation.sourceWalletRequired");
    if (!form.destination_wallet_id) e.destination_wallet_id = t("validation.destWalletRequired");
    if (
      form.source_wallet_id &&
      form.destination_wallet_id &&
      form.source_wallet_id === form.destination_wallet_id
    ) {
      e.destination_wallet_id = t("validation.sameWallet");
    }
    if (!form.amount) e.amount = t("validation.amountRequired");
    else if (isNaN(amount) || amount <= 0) e.amount = t("validation.amountInvalid");
    else if (amount > 999_999_999_999.99) e.amount = t("validation.amountExceeds");
    if (form.description.trim().length > 255)
      e.description = t("validation.descriptionTooLong");

    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...form,
      description: form.description.trim(),
    });
  };

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] text-[14px] outline-none transition-colors";
  const inputStyle = (hasError?: string) => ({
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: `1px solid ${hasError ? "var(--color-negative)" : "var(--border-default)"}`,
    minHeight: "var(--tap-target-min)",
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4">
      {/* Date & Time Row */}
      <div className="flex gap-2 w-full">
        {/* Date */}
        <div className="flex-[3] min-w-0 overflow-hidden">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Date
          </label>
          <input
            type="date"
            value={form.transaction_date}
            onChange={(e) => set("transaction_date", e.target.value)}
            className={inputClass}
            style={inputStyle(errors.transaction_date)}
          />
          {errors.transaction_date && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_date}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="flex-[2] min-w-0 overflow-hidden">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Time
          </label>
          <input
            type="time"
            value={form.transaction_time}
            onChange={(e) => set("transaction_time", e.target.value)}
            className={inputClass}
            style={inputStyle(errors.transaction_time)}
          />
          {errors.transaction_time && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_time}
            </p>
          )}
        </div>
      </div>

      {/* Source Wallet */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          From Wallet
        </label>
        <button
          type="button"
          onClick={() => setActiveWalletPicker("source")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] active:opacity-70 transition-opacity"
          style={{
            ...inputStyle(errors.source_wallet_id),
            minHeight: "var(--tap-target-min)",
          }}
        >
          <span style={{ color: sourceWallet ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {sourceWallet ? sourceWallet.name : "Select source wallet"}
          </span>
          {sourceWallet && (
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {formatIDR(sourceWallet.balance)}
            </span>
          )}
        </button>
        {errors.source_wallet_id && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.source_wallet_id}
          </p>
        )}
      </div>

      {/* Destination Wallet */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          To Wallet
        </label>
        <button
          type="button"
          onClick={() => setActiveWalletPicker("destination")}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] active:opacity-70 transition-opacity"
          style={{
            ...inputStyle(errors.destination_wallet_id),
            minHeight: "var(--tap-target-min)",
          }}
        >
          <span style={{ color: destWallet ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {destWallet ? destWallet.name : "Select destination wallet"}
          </span>
          {destWallet && (
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {formatIDR(destWallet.balance)}
            </span>
          )}
        </button>
        {errors.destination_wallet_id && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.destination_wallet_id}
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Amount
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter the amount"
            value={form.amount}
            onChange={(e) => {
              let val = e.target.value;
              val = val.replace(/[^0-9,]/g, "");
              if (!val) {
                set("amount", "");
                return;
              }
              const parts = val.split(",");
              let integerPart = parts[0];
              const decimalPart = parts.length > 1 ? "," + parts[1] : "";
              if (integerPart) {
                const parsed = parseInt(integerPart, 10);
                if (!isNaN(parsed)) {
                  integerPart = parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                } else {
                  integerPart = "";
                }
              }
              set("amount", integerPart + decimalPart);
            }}
            className={inputClass + " pr-12"}
            style={inputStyle(errors.amount)}
          />
          <Calculator
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.amount}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Description (optional)
        </label>
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={255}
          rows={3}
          className="w-full px-4 py-3 rounded-[12px] text-[14px] outline-none transition-colors resize-none"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: `1px solid ${errors.description ? "var(--color-negative)" : "var(--border-default)"}`,
          }}
        />
        {errors.description && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.description}
          </p>
        )}
      </div>

      {/* Footer actions */}
      {footerActions}

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold active:opacity-70 transition-opacity"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-secondary)",
            minHeight: "var(--tap-target-min)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold active:opacity-70 transition-opacity disabled:opacity-50"
          style={{
            background: "var(--color-brand)",
            color: "var(--text-on-primary)",
            minHeight: "var(--tap-target-min)",
          }}
        >
          {isSubmitting ? tc("saving") : resolvedSubmitLabel}
        </button>
      </div>

      {/* Source wallet picker */}
      <WalletPicker
        open={activeWalletPicker === "source"}
        onClose={() => setActiveWalletPicker(null)}
        wallets={sourceWallets}
        selectedWalletId={form.source_wallet_id}
        onSelect={(wallet) => {
          set("source_wallet_id", wallet.id);
          setActiveWalletPicker(null);
        }}
      />

      {/* Destination wallet picker */}
      <WalletPicker
        open={activeWalletPicker === "destination"}
        onClose={() => setActiveWalletPicker(null)}
        wallets={destWallets}
        selectedWalletId={form.destination_wallet_id}
        onSelect={(wallet) => {
          set("destination_wallet_id", wallet.id);
          setActiveWalletPicker(null);
        }}
      />
    </form>
  );
}
