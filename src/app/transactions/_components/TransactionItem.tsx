"use client";

import { useRouter } from "next/navigation";
import type { Transaction } from "@/lib/types/transaction";
import type { Wallet } from "@/lib/types/wallet";
import { formatIDR } from "@/lib/format/number";
import { ArrowRightLeft } from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
  wallets: Wallet[];
}

export function TransactionItem({ transaction, wallets }: TransactionItemProps) {
  const router = useRouter();

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
    : "var(--text-secondary)";

  const amountPrefix = isIncome ? "+ " : isExpense ? "- " : "";

  return (
    <button
      onClick={() => router.push(`/transactions/${transaction.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity text-left"
      style={{ minHeight: "var(--tap-target-min)" }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: isIncome
            ? "var(--color-positive-soft)"
            : isExpense
            ? "var(--color-negative-soft)"
            : "var(--bg-secondary)",
        }}
      >
        {isTransfer ? (
          <ArrowRightLeft
            className="w-5 h-5"
            style={{ color: "var(--text-secondary)" }}
          />
        ) : (
          <span className="text-[13px] font-bold" style={{ color: amountColor }}>
            {isIncome ? "+" : "-"}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[15px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {isTransfer
              ? `${wallet?.name ?? "?"} → ${destWallet?.name ?? "?"}`
              : (transaction.title ?? transaction.category ?? "-")}
          </span>
          <span
            className="text-[15px] font-semibold flex-shrink-0"
            style={{ color: amountColor }}
          >
            {amountPrefix}
            {formatIDR(transaction.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className="text-[13px] truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {isTransfer
              ? (transaction.description ?? "Transfer")
              : transaction.category ?? ""}
          </span>
          <span
            className="text-[12px] flex-shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          >
            {transaction.transaction_time}
          </span>
        </div>
        {!isTransfer && wallet && (
          <div className="mt-0.5">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
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
  );
}
