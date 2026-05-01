"use client";

import { useState, useRef, useEffect } from "react";
import { Calculator } from "lucide-react";
import type { WalletType } from "@/lib/types/wallet";
import { formatIDR, parseIDR } from "@/lib/format/number";
import { cn } from "@/lib/utils";

export interface WalletFormValues {
  name: string;
  /** Raw string during editing; parsed to number on submit */
  balance: string;
  wallet_type: WalletType;
}

interface WalletFormErrors {
  name?: string;
  balance?: string;
}

interface WalletFormProps {
  initialValues?: Partial<WalletFormValues>;
  isAddMode?: boolean;
  isSubmitting: boolean;
  onSubmit: (values: WalletFormValues) => void;
  isNameTaken: (name: string) => boolean;
  deleteSlot?: React.ReactNode;
}

const WALLET_TYPE_OPTIONS: { value: WalletType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "bank_digital", label: "Bank Digital" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "investment", label: "Investasi" },
  { value: "savings", label: "Tabungan Khusus" },
  { value: "digital_asset", label: "Aset Digital" },
  { value: "other", label: "Lainnya" },
];

const MAX_BALANCE = 999_999_999_999.99;

function validateForm(
  values: WalletFormValues,
  isNameTaken: (name: string) => boolean
): WalletFormErrors {
  const errors: WalletFormErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = "Nama wallet tidak boleh kosong";
  } else if (trimmedName.length < 2) {
    errors.name = "Nama minimal 2 karakter";
  } else if (trimmedName.length > 50) {
    errors.name = "Nama maksimal 50 karakter";
  } else if (isNameTaken(trimmedName)) {
    errors.name = "Nama wallet sudah digunakan";
  }

  const balanceStr = values.balance.trim();
  if (!balanceStr) {
    errors.balance = "Saldo tidak boleh kosong";
  } else {
    const parsed = parseIDR(balanceStr);
    if (isNaN(parsed) || parsed < 0) {
      errors.balance = "Saldo harus berupa angka positif";
    } else if (parsed > MAX_BALANCE) {
      errors.balance = "Saldo melebihi batas maksimum";
    }
  }

  return errors;
}

export function WalletForm({
  initialValues,
  isAddMode = true,
  isSubmitting,
  onSubmit,
  isNameTaken,
  deleteSlot,
}: WalletFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [balance, setBalance] = useState(
    initialValues?.balance !== undefined ? initialValues.balance : ""
  );
  const [walletType, setWalletType] = useState<WalletType>(
    initialValues?.wallet_type ?? "other"
  );
  const [errors, setErrors] = useState<WalletFormErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field on mount (add mode)
  useEffect(() => {
    if (isAddMode && nameRef.current) {
      nameRef.current.focus();
    }
  }, [isAddMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: WalletFormValues = {
      name,
      balance,
      wallet_type: walletType,
    };
    const validationErrors = validateForm(values, isNameTaken);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit({ ...values, name: name.trim() });
  };

  const handleBalanceFocus = () => {
    // Show raw decimal number for easy editing
    if (balance) {
      const parsed = parseIDR(balance);
      if (!isNaN(parsed)) {
        setBalance(String(parsed));
      }
    }
  };

  const handleBalanceBlur = () => {
    // Format with locale on blur for readability
    if (balance) {
      const parsed = parseIDR(balance);
      if (!isNaN(parsed) && parsed >= 0) {
        setBalance(formatIDR(parsed));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Wallet Name */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-name"
          className="text-[13px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Wallet Name
        </label>
        <input
          id="wallet-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter the name"
          maxLength={50}
          autoComplete="off"
          className={cn(
            "w-full px-4 rounded-[12px] text-[16px] outline-none transition-colors",
            "border",
            errors.name
              ? "border-[var(--color-negative)]"
              : "border-[var(--border-default)] focus:border-[var(--color-brand)]"
          )}
          style={{
            minHeight: "var(--tap-target-min)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-card)",
          }}
          aria-describedby={errors.name ? "wallet-name-error" : undefined}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name && (
          <p
            id="wallet-name-error"
            className="text-[12px]"
            style={{ color: "var(--color-negative)" }}
            role="alert"
          >
            {errors.name}
          </p>
        )}
      </div>

      {/* Wallet Type */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-type"
          className="text-[13px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Wallet Type
        </label>
        <select
          id="wallet-type"
          value={walletType}
          onChange={(e) => setWalletType(e.target.value as WalletType)}
          className={cn(
            "w-full px-4 rounded-[12px] text-[16px] outline-none transition-colors appearance-none",
            "border border-[var(--border-default)] focus:border-[var(--color-brand)]"
          )}
          style={{
            minHeight: "var(--tap-target-min)",
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {WALLET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Balance */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="wallet-balance"
          className="text-[13px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {isAddMode ? "Initial Balance" : "Balance"}
        </label>
        <div className="relative">
          <input
            id="wallet-balance"
            type="text"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onFocus={handleBalanceFocus}
            onBlur={handleBalanceBlur}
            placeholder="Enter the balance"
            className={cn(
              "w-full px-4 pr-12 rounded-[12px] text-[16px] outline-none transition-colors",
              "border",
              errors.balance
                ? "border-[var(--color-negative)]"
                : "border-[var(--border-default)] focus:border-[var(--color-brand)]"
            )}
            style={{
              minHeight: "var(--tap-target-min)",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-card)",
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
        {errors.balance && (
          <p
            id="wallet-balance-error"
            className="text-[12px]"
            style={{ color: "var(--color-negative)" }}
            role="alert"
          >
            {errors.balance}
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full rounded-[12px] text-[16px] font-semibold transition-all active:scale-[0.98]",
          "flex items-center justify-center gap-2",
          isSubmitting && "opacity-70 cursor-not-allowed"
        )}
        style={{
          minHeight: "var(--tap-target-min)",
          backgroundColor: "var(--color-brand)",
          color: "var(--text-on-primary)",
        }}
      >
        {isSubmitting ? (
          <>
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden="true"
            />
            Saving...
          </>
        ) : isAddMode ? (
          "Save"
        ) : (
          "Save Changes"
        )}
      </button>

      {/* Delete slot — only in edit mode */}
      {deleteSlot && <div className="mt-2">{deleteSlot}</div>}
    </form>
  );
}
