"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Calculator, Wallet as WalletIcon, AlertTriangle } from "lucide-react";
import type { Wallet } from "@/lib/types/wallet";
import { WalletPicker } from "@/components/shared/WalletPicker";
import { TitleSuggestionChips, CategorySuggestionChips } from "./SuggestionChips";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import { formatIDR, formatThousands, parseIDR } from "@/lib/format/number";
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
  readonly type: "income" | "expense";
  readonly wallets: Wallet[];
  readonly initialValues?: Partial<IncomeExpenseFormValues>;
  readonly titleSuggestions: Array<{ title: string; category: string }>;
  readonly categorySuggestions: string[];
  readonly isSubmitting: boolean;
  readonly isEditMode?: boolean;
  readonly hideMetaFields?: boolean;
  readonly onSubmit: (values: IncomeExpenseFormValues) => void;
  readonly footerActions?: React.ReactNode;
}

type FormErrors = Partial<Record<keyof IncomeExpenseFormValues, string>>;

export function IncomeExpenseForm({
  type,
  wallets,
  initialValues,
  titleSuggestions,
  categorySuggestions,
  isSubmitting,
  isEditMode = false,
  hideMetaFields = false,
  onSubmit,
  footerActions,
}: IncomeExpenseFormProps) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const resolvedSubmitLabel = isEditMode ? tc("saveChanges") : tc("save");

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

  if (initialValues?.amount) {
    const parsed = parseIDR(initialValues.amount);
    if (!Number.isNaN(parsed)) {
      defaults.amount = formatIDR(parsed);
    }
  }

  const [form, setForm] = useState<IncomeExpenseFormValues>(defaults);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open wallet picker on mount if it's add mode
  useEffect(() => {
    if (!initialValues?.wallet_id) {
      setIsWalletOpen(true);
    }
  }, [initialValues?.wallet_id]);

  const selectedWallet = wallets.find((w) => w.id === form.wallet_id) ?? null;
  const parsedAmount = parseIDR(form.amount) || 0;
  const originalAmount = isEditMode ? (parseIDR(initialValues?.amount ?? "0") || 0) : 0;
  const insufficientBalance =
    type === "expense" &&
    selectedWallet !== null &&
    parsedAmount > 0 &&
    parsedAmount > selectedWallet.balance + originalAmount;

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
    else if (Number.isNaN(amount) || amount <= 0) e.amount = t("validation.amountInvalid");
    else if (amount > 999_999_999_999.99) e.amount = t("validation.amountExceeds");
    if (!hideMetaFields) {
      if (!form.title.trim()) e.title = t("validation.titleRequired");
      else if (form.title.trim().length > 100) e.title = t("validation.titleTooLong");
      if (!form.category.trim()) e.category = t("validation.categoryRequired");
      else if (form.category.trim().length > 50) e.category = t("validation.categoryTooLong");
      if (form.description.trim().length > 255) e.description = t("validation.descriptionTooLong");
    }

    return e;
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
      <div className="flex gap-2 w-full">
        <div className="flex-[3] min-w-0 overflow-hidden">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {t("form.date")}
          </label>
          <input
            type="date"
            value={form.transaction_date}
            onChange={(e) => set("transaction_date", e.target.value)}
            className={inputClass}
            style={{
              ...inputStyle(errors.transaction_date),
              ...(hideMetaFields ? { opacity: 0.5, cursor: "not-allowed" } : {}),
            }}
            disabled={hideMetaFields}
            suppressHydrationWarning
          />
          {errors.transaction_date && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_date}
            </p>
          )}
        </div>

        <div className="flex-[2] min-w-0 overflow-hidden">
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {t("form.time")}
          </label>
          <input
            type="time"
            value={form.transaction_time}
            onChange={(e) => set("transaction_time", e.target.value)}
            className={inputClass}
            style={{
              ...inputStyle(errors.transaction_time),
              ...(hideMetaFields ? { opacity: 0.5, cursor: "not-allowed" } : {}),
            }}
            disabled={hideMetaFields}
            suppressHydrationWarning
          />
          {errors.transaction_time && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
              {errors.transaction_time}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {t("form.wallet")}
        </label>
        <button
          type="button"
          onClick={() => !hideMetaFields && setIsWalletOpen(true)}
          disabled={hideMetaFields}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] active:opacity-70 transition-opacity"
          style={{
            ...inputStyle(errors.wallet_id),
            minHeight: "var(--tap-target-min)",
            ...(hideMetaFields ? { opacity: 0.5, cursor: "not-allowed" } : {}),
          }}
        >
          <span style={{ color: selectedWallet ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {selectedWallet ? selectedWallet.name : t("form.selectWallet")}
          </span>
          <WalletIcon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        </button>
        {selectedWallet && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {t("form.balance")}: {formatIDR(selectedWallet.balance)}
          </p>
        )}
        {errors.wallet_id && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.wallet_id}
          </p>
        )}
      </div>

      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          {t("form.amount")}
        </label>
        <div className="relative">
          <input
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            placeholder={t("form.amountPlaceholder")}
            value={form.amount}
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
                  integerPart = formatThousands(parsed);
                } else {
                  integerPart = "";
                }
              }
              set("amount", integerPart + decimalPart);
            }}
            className={inputClass + " pr-12"}
            style={inputStyle(errors.amount)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                titleInputRef.current?.focus();
              }
            }}
          />
          <Calculator
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {["000", "00"].map((zeros) => (
            <button
              key={zeros}
              type="button"
              onClick={() => {
                const intPart = (form.amount || "0").replaceAll(".", "").split(",")[0];
                const num = Number.parseInt(intPart || "0", 10);
                const factor = zeros === "000" ? 1000 : 100;
                const newNum = num * factor;
                if (newNum <= 999_999_999_999) {
                  set("amount", formatThousands(newNum));
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
              {t("form.insufficientBalance")}
            </p>
          </div>
        )}
        {errors.amount && (
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-negative)" }}>
            {errors.amount}
          </p>
        )}
      </div>

      {!hideMetaFields && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {t("form.title")}
          </label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder={t("form.titlePlaceholder")}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={100}
            className={inputClass}
            style={inputStyle(errors.title)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                categoryInputRef.current?.focus();
              }
            }}
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
      )}

      {!hideMetaFields && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {t("form.category")}
          </label>
          <input
            ref={categoryInputRef}
            type="text"
            placeholder={t("form.categoryPlaceholder")}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            maxLength={50}
            className={inputClass}
            style={inputStyle(errors.category)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                descriptionRef.current?.focus();
              }
            }}
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
      )}

      {!hideMetaFields && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {t("form.description")}
          </label>
          <textarea
            ref={descriptionRef}
            placeholder={t("form.descriptionPlaceholder")}
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
      )}

      {footerActions}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 rounded-[12px] text-[14px] font-semibold active:opacity-70 transition-opacity disabled:opacity-50"
        style={{
          background: "var(--color-brand)",
          color: "var(--text-on-primary)",
          minHeight: "var(--tap-target-min)",
        }}
      >
        {isSubmitting ? tc("saving") : resolvedSubmitLabel}
      </button>

      <WalletPicker
        open={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        wallets={wallets}
        selectedWalletId={form.wallet_id}
        onSelect={(wallet) => {
          set("wallet_id", wallet.id);
          setIsWalletOpen(false);
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 300);
        }}
      />
    </form>
  );
}
