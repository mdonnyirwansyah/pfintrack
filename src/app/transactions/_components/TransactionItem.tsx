"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/lib/types/transaction";
import type { Wallet } from "@/lib/types/wallet";
import { formatIDR } from "@/lib/format/number";
import { ArrowRightLeft } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useLongPress } from "@/hooks/useLongPress";
import { useTranslations, useLocale } from "next-intl";
import { formatDisplayDate } from "@/lib/format/date";

interface TransactionItemProps {
  transaction: Transaction;
  wallets: Wallet[];
  showDate?: boolean;
  onConfirmDelete?: (id: string) => void;
}

export function TransactionItem({ transaction, wallets, showDate = false, onConfirmDelete }: TransactionItemProps) {
  const router = useRouter();
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const wallet = wallets.find((w) => w.id === transaction.wallet_id);
  const destWallet =
    transaction.destination_wallet_id
      ? wallets.find((w) => w.id === transaction.destination_wallet_id)
      : null;

  const isIncome = transaction.type === "income";
  const isExpense = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";

  const amountColor = isIncome
    ? "var(--color-positive)"
    : isExpense
    ? "var(--color-negative)"
    : "var(--text-primary)";

  const amountPrefix = isIncome ? "+ " : isExpense ? "- " : "";

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (onConfirmDelete) setShowDeleteDialog(true);
    },
  });

  return (
    <>
      <button
        onClick={() => router.push(`/transactions/${transaction.id}`)}
        className="w-full flex items-center gap-2.5 px-4 py-2 active:opacity-70 transition-opacity text-left"
        style={{ minHeight: 48 }}
        {...longPressHandlers}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: isIncome
              ? "var(--color-positive-soft)"
              : isExpense
              ? "var(--color-negative-soft)"
              : "var(--bg-secondary)",
            border: isTransfer ? "1px solid var(--border-default)" : "none",
          }}
        >
          {isTransfer ? (
            <ArrowRightLeft
              className="w-4 h-4"
              style={{ color: "var(--text-primary)" }}
            />
          ) : (
            <span className="text-[12px] font-bold" style={{ color: amountColor }}>
              {isIncome ? "+" : "-"}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {isTransfer
                ? `${wallet?.name ?? "?"} → ${destWallet?.name ?? "?"}`
                : transaction.category === "Balance Correction"
                  ? t("filter.balanceCorrection")
                  : (transaction.title ?? transaction.category ?? "-")}
            </span>
            <span
              className="text-[10px] font-semibold flex-shrink-0 tabular-nums"
              style={{ color: amountColor }}
            >
              {amountPrefix}
              {formatIDR(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span
              className="text-[9px] truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {isTransfer
                ? (transaction.description ?? "Transfer")
                : (transaction.category === "Balance Correction"
                    ? t("filter.balanceCorrection")
                    : (transaction.category ?? "")) + (transaction.description ? ` • ${transaction.description}` : "")}
            </span>
            <span
              className="text-[9px] flex-shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              {showDate
                ? `${formatDisplayDate(transaction.transaction_date, locale)} · ${transaction.transaction_time}`
                : transaction.transaction_time}
            </span>
          </div>
          {!isTransfer && wallet && (
            <div className="mt-0.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-brand-soft)",
                  color: "var(--color-brand)",
                }}
              >
                {wallet.name}
              </span>
            </div>
          )}
        </div>
      </button>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("deleteConfirm.title")}
        description={t("deleteConfirm.description")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={() => {
          setShowDeleteDialog(false);
          onConfirmDelete?.(transaction.id);
        }}
      />
    </>
  );
}
