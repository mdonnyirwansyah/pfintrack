"use client";

import { useState, useRef, useEffect } from "react";
import { Calculator } from "lucide-react";
import type { WalletType } from "@/lib/types/wallet";
import { formatIDR, formatThousands, parseIDR } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface WalletFormValues {
  name: string;
  balance: string;
  wallet_type: WalletType;
}

interface WalletFormErrors {
  name?: string;
  balance?: string;
}

interface WalletFormProps {
  readonly initialValues?: Partial<WalletFormValues>;
  readonly isAddMode?: boolean;
  readonly isSubmitting: boolean;
  readonly onSubmit: (values: WalletFormValues) => void;
  readonly isNameTaken: (name: string) => boolean;
  readonly deleteSlot?: React.ReactNode;
}

const MAX_BALANCE = 999_999_999_999.99;

export function WalletForm({
  initialValues,
  isAddMode = true,
  isSubmitting,
  onSubmit,
  isNameTaken,
  deleteSlot,
}: WalletFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [balance, setBalance] = useState(() => {
    const init = initialValues?.balance;
    if (!init) return "";
    const parsed = parseIDR(init);
    return !Number.isNaN(parsed) ? formatIDR(parsed) : init;
  });
  const [walletType, setWalletType] = useState<WalletType>(
    initialValues?.wallet_type ?? "bank"
  );
  const [errors, setErrors] = useState<WalletFormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("wallet");
  const tc = useTranslations("common");

  const WALLET_TYPE_OPTIONS: { value: WalletType; label: string }[] = [
    { value: "bank", label: t("types.bank") },
    { value: "bank_digital", label: t("types.bank_digital") },
    { value: "e_wallet", label: t("types.e_wallet") },
    { value: "investment", label: t("types.investment") },
    { value: "savings", label: t("types.savings") },
    { value: "digital_asset", label: t("types.digital_asset") },
    { value: "other", label: t("types.other") },
  ];

  function validateForm(
    values: WalletFormValues,
    isNameTakenFn: (name: string) => boolean
  ): WalletFormErrors {
    const errs: WalletFormErrors = {};

    const trimmedName = values.name.trim();
    if (!trimmedName) {
      errs.name = t("validation.nameRequired");
    } else if (trimmedName.length < 2) {
      errs.name = t("validation.nameTooShort");
    } else if (trimmedName.length > 50) {
      errs.name = t("validation.nameTooLong");
    } else if (isNameTakenFn(trimmedName)) {
      errs.name = t("validation.nameTaken");
    }

    const balanceStr = values.balance.trim();
    if (!balanceStr) {
      errs.balance = t("validation.balanceRequired");
    } else {
      const parsed = parseIDR(balanceStr);
      if (Number.isNaN(parsed) || parsed < 0) {
        errs.balance = t("validation.balanceInvalid");
      } else if (parsed > MAX_BALANCE) {
        errs.balance = t("validation.balanceExceeds");
      }
    }

    return errs;
  }

  useEffect(() => {
    if (isAddMode && nameRef.current) {
      nameRef.current.focus();
    }
  }, [isAddMode]);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values: WalletFormValues = {
      name,
      balance,
      wallet_type: walletType,
    };
    const validationErrors = validateForm(values, isNameTaken as (name: string) => boolean);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit({ ...values, name: name.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-name"
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("form.name")}
        </label>
        <input
          id="wallet-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("form.namePlaceholder")}
          maxLength={50}
          autoComplete="off"
          className={cn(
            "w-full px-4 rounded-[12px] text-[14px] outline-none transition-colors",
            "border",
            errors.name
              ? "border-[var(--color-negative)]"
              : "border-[var(--border-default)] focus:border-[var(--color-brand)]"
          )}
          style={{
            minHeight: "var(--tap-target-min)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-secondary)",
          }}
          aria-describedby={errors.name ? "wallet-name-error" : undefined}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name && (
          <p
            id="wallet-name-error"
            className="text-[11px]"
            style={{ color: "var(--color-negative)" }}
            role="alert"
          >
            {errors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-type"
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("form.type")}
        </label>
        <select
          id="wallet-type"
          value={walletType}
          onChange={(e) => setWalletType(e.target.value as WalletType)}
          className={cn(
            "w-full px-4 rounded-[12px] text-[14px] outline-none transition-colors appearance-none",
            "border border-[var(--border-default)] focus:border-[var(--color-brand)]"
          )}
          style={{
            minHeight: "var(--tap-target-min)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          {WALLET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-balance"
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {isAddMode ? t("form.initialBalance") : t("form.balance")}
        </label>
        <div className="relative">
          <input
            id="wallet-balance"
            type="text"
            inputMode="decimal"
            value={balance}
            onChange={(e) => {
              let val = e.target.value;
              val = val.replaceAll(/[^0-9,]/g, "");
              if (!val) {
                setBalance("");
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
              setBalance(integerPart + decimalPart);
            }}
            placeholder={t("form.balancePlaceholder")}
            className={cn(
              "w-full px-4 pr-12 rounded-[12px] text-[14px] outline-none transition-colors",
              "border",
              errors.balance
                ? "border-[var(--color-negative)]"
                : "border-[var(--border-default)] focus:border-[var(--color-brand)]"
            )}
            style={{
              minHeight: "var(--tap-target-min)",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-secondary)",
            }}
            aria-describedby={errors.balance ? "wallet-balance-error" : undefined}
            aria-invalid={errors.balance ? true : undefined}
          />
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
            aria-hidden="true"
          >
            <Calculator className="w-5 h-5" />
          </div>
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {["000", "00"].map((zeros) => (
            <button
              key={zeros}
              type="button"
              onClick={() => {
                const intPart = (balance || "0").replaceAll(".", "").split(",")[0];
                const num = Number.parseInt(intPart || "0", 10);
                const factor = zeros === "000" ? 1000 : 100;
                const newNum = num * factor;
                if (newNum <= 999_999_999_999) {
                  setBalance(formatThousands(newNum));
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
        {errors.balance && (
          <p
            id="wallet-balance-error"
            className="text-[11px]"
            style={{ color: "var(--color-negative)" }}
            role="alert"
          >
            {errors.balance}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full rounded-[12px] text-[14px] font-semibold transition-all active:scale-[0.98]",
          "flex items-center justify-center gap-2",
          isSubmitting && "opacity-70 cursor-not-allowed"
        )}
        style={{
          minHeight: "var(--tap-target-min)",
          backgroundColor: "var(--color-brand)",
          color: "var(--text-on-primary)",
        }}
      >
        {(() => {
          if (isSubmitting) {
            return (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  aria-hidden="true"
                />
                {tc("saving")}
              </>
            );
          }
          if (isAddMode) return tc("save");
          return tc("saveChanges");
        })()}
      </button>

      {deleteSlot && <div className="mt-2">{deleteSlot}</div>}
    </form>
  );
}
