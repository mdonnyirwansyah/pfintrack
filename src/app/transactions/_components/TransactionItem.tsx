"use client";

import { memo, useState } from "react";
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

function getIconBackground(isIncome: boolean, isExpense: boolean): string {
  if (isIncome) return "var(--color-positive-soft)";
  if (isExpense) return "var(--color-negative-soft)";
  return "var(--bg-secondary)";
}

function getTitle(
  isTransfer: boolean,
  isBalanceCorrection: boolean,
  walletName: string | undefined,
  destWalletName: string | undefined,
  title: string | null | undefined,
  category: string | null | undefined,
  balanceCorrectionLabel: string
): string {
  if (isTransfer) return `${walletName ?? "?"} → ${destWalletName ?? "?"}`;
  if (isBalanceCorrection) return balanceCorrectionLabel;
  return title ?? category ?? "-";
}

function getSubtitle(
  isTransfer: boolean,
  description: string | null | undefined,
  category: string | null | undefined
): string {
  if (isTransfer) return description ?? "Transfer";
  return (category ?? "") + (description ? ` • ${description}` : "");
}

function getDateTimeLabel(
  showDate: boolean,
  date: string,
  time: string,
  locale: string
): string {
  if (showDate) return `${formatDisplayDate(date, locale)} · ${time}`;
  return time;
}

export const TransactionItem = memo(function TransactionItem({ transaction, wallets, showDate = false, onConfirmDelete }: TransactionItemProps) {
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
  const isBalanceCorrection = transaction.category === "Balance Correction";

  let amountColor: string;
  if (isIncome) {
    amountColor = "var(--color-positive)";
  } else if (isExpense) {
    amountColor = "var(--color-negative)";
  } else {
    amountColor = "var(--text-primary)";
  }

  let amountPrefix: string;
  if (isIncome) {
    amountPrefix = "+ ";
  } else if (isExpense) {
    amountPrefix = "- ";
  } else {
    amountPrefix = "";
  }

  const iconBg = getIconBackground(isIncome, isExpense);
  const iconBorder = isTransfer ? "1px solid var(--border-default)" : "none";

  const titleLabel = getTitle(
    isTransfer,
    isBalanceCorrection,
    wallet?.name,
    destWallet?.name,
    transaction.title,
    transaction.category,
    t("filter.balanceCorrection")
  );

  const subtitleLabel = getSubtitle(isTransfer, transaction.description, transaction.category);
  const dateTimeLabel = getDateTimeLabel(showDate, transaction.transaction_date, transaction.transaction_time, locale);

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
          className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: iconBg, border: iconBorder }}
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
              {titleLabel}
            </span>
            <span
              className="text-[10px] font-semibold flex-shrink-0 tabular-nums"
              style={{ color: amountColor }}
            >
              {amountPrefix}
              {formatIDR(transaction.amount)}
            </span>
          </div>

          {isBalanceCorrection ? (
            /* Balance Correction: wallet badge + time in one compact row */
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {wallet ? (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-[6px]"
                  style={{
                    background: "var(--color-brand-soft)",
                    color: "var(--color-brand)",
                  }}
                >
                  {wallet.name}
                </span>
              ) : <span />}
              <span
                className="text-[9px] flex-shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                {dateTimeLabel}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span
                  className="text-[9px] truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {subtitleLabel}
                </span>
                <span
                  className="text-[9px] flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {dateTimeLabel}
                </span>
              </div>
              {!isTransfer && wallet && (
                <div className="mt-0.5">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-[6px]"
                    style={{
                      background: "var(--color-brand-soft)",
                      color: "var(--color-brand)",
                    }}
                  >
                    {wallet.name}
                  </span>
                </div>
              )}
            </>
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
});
