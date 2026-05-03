"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Wallet as WalletIcon, AlertTriangle } from "lucide-react";
import type { TransactionType } from "@/lib/types/transaction";
import type { Wallet } from "@/lib/types/wallet";
import { WalletPicker } from "@/components/shared/WalletPicker";
import { TitleSuggestionChips, CategorySuggestionChips } from "./SuggestionChips";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import { formatIDR, parseIDR } from "@/lib/format/number";
import { useTranslations } from "next-intl";

export interface IncomeExpenseFormValues {
  transaction_date: string;
  transaction_time: string;
  wallet_id: string;
  amount: string;
  title: string;
  category: string;
  description: string;
}

interface IncomeExpenseFormProps {
  type: "income" | "expense";
  wallets: Wallet[];
  initialValues?: Partial<IncomeExpenseFormValues>;
  titleSuggestions: Array<{ title: string; category: string }>;
  categorySuggestions: string[];
  isSubmitting: boolean;
  submitLabel?: string;
  onSubmit: (values: IncomeExpenseFormValues) => void;
  /** Extra actions rendered after the form (e.g. delete button on edit page) */
  footerActions?: React.ReactNode;
}

type FormErrors = Partial<Record<keyof IncomeExpenseFormValues, string>>;

export function IncomeExpenseForm({
  type,
  wallets,
  initialValues,
  titleSuggestions,
  categorySuggestions,
  isSubmitting,
  submitLabel,
  onSubmit,
  footerActions,
}: IncomeExpenseFormProps) {
  const router = useRouter();
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const resolvedSubmitLabel = submitLabel ?? tc("save");

  const defaults: IncomeExpenseFormValues = {
    transaction_date: todayISO(),
    transaction_time: currentTimeHHMM(),
    wallet_id: "",
    amount: "",
    title: "",
    category: "",
    description: "",
    ...initialValues,
  };

  const [form, setForm] = useState<IncomeExpenseFormValues>(defaults);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const selectedWallet = wallets.find((w) => w.id === form.wallet_id) ?? null;
  const parsedAmount = parseIDR(form.amount) || 0;
  const insufficientBalance =
    type === "expense" &&
    selectedWallet !== null &&
    parsedAmount > 0 &&
    parsedAmount > selectedWallet.balance;

  const set = useCallback(
    (field: keyof IncomeExpenseFormValues, value: string) => {
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
    if (!form.wallet_id) e.wallet_id = t("validation.walletRequired");
    if (!form.amount) e.amount = t("validation.amountRequired");
    else if (isNaN(amount) || amount <= 0) e.amount = t("validation.amountInvalid");
    else if (amount > 999_999_999_999.99) e.amount = t("validation.amountExceeds");
    if (!form.title.trim()) e.title = t("validation.titleRequired");
    else if (form.title.trim().length > 100) e.title = t("validation.titleTooLong");
    if (!form.category.trim()) e.category = t("validation.categoryRequired");
    else if (form.category.trim().length > 50) e.category = t("validation.categoryTooLong");
    if (form.description.trim().length > 255) e.description = t("validation.descriptionTooLong");

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
      title: form.title.trim(),
      category: form.category.trim(),
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

      {/* Wallet selector */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Wallet
        </label>
        <button
          type="button"
          onClick={() => setIsWalletOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] active:opacity-70 transition-opacity"
          style={{
            ...inputStyle(errors.wallet_id),
            minHeight: "var(--tap-target-min)",
          }}
        >
          <span style={{ color: selectedWallet ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {selectedWallet ? selectedWallet.name : "Select wallet"}
          </span>
          <WalletIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        </button>
        {selectedWallet && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Balance: {formatIDR(selectedWallet.balance)}
          </p>
        )}
        {errors.wallet_id && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.wallet_id}
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
            onChange={(e) => set("amount", e.target.value)}
            onFocus={() => {
              const parsed = parseIDR(form.amount);
              if (!isNaN(parsed)) set("amount", String(parsed));
            }}
            onBlur={() => {
              const parsed = parseIDR(form.amount);
              if (!isNaN(parsed) && parsed > 0) set("amount", formatIDR(parsed));
            }}
            className={inputClass + " pr-12"}
            style={inputStyle(errors.amount)}
          />
          <Calculator
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
        {insufficientBalance && !errors.amount && (
          <div className="flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-accent-warm)" }} />
            <p className="text-[11px]" style={{ color: "var(--color-accent-warm)" }}>
              Insufficient wallet balance
            </p>
          </div>
        )}
        {errors.amount && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.amount}
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Title
        </label>
        <input
          type="text"
          placeholder="Type here for new title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={100}
          className={inputClass}
          style={inputStyle(errors.title)}
        />
        <TitleSuggestionChips
          suggestions={titleSuggestions}
          onSelect={(title, category) => {
            setForm((prev) => ({ ...prev, title, category }));
            setErrors((prev) => ({ ...prev, title: undefined, category: undefined }));
          }}
        />
        {errors.title && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.title}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Category
        </label>
        <input
          type="text"
          placeholder="Type here for new category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          maxLength={50}
          className={inputClass}
          style={inputStyle(errors.category)}
        />
        <CategorySuggestionChips
          suggestions={categorySuggestions}
          onSelect={(cat) => {
            setForm((prev) => ({ ...prev, category: cat }));
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
        />
        {errors.category && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.category}
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

      {/* Wallet picker */}
      <WalletPicker
        open={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        wallets={wallets}
        selectedWalletId={form.wallet_id}
        onSelect={(wallet) => {
          set("wallet_id", wallet.id);
          setIsWalletOpen(false);
        }}
      />
    </form>
  );
}

// Helper to determine transaction type display label
export function getTypeLabel(type: TransactionType): string {
  switch (type) {
    case "income":
      return "Income";
    case "expense":
      return "Expense";
    case "transfer":
      return "Transfer";
  }
}
