"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { IncomeExpenseForm, type IncomeExpenseFormValues } from "../_components/IncomeExpenseForm";
import { TransferForm, type TransferFormValues } from "../_components/TransferForm";
import { useTransactionStore, getTitleSuggestions, getCategorySuggestions } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { transactionsRepo } from "@/lib/storage/transactions";
import type { Transaction } from "@/lib/types/transaction";
import { FileText } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { parseIDR } from "@/lib/format/number";

interface EditTransactionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTransactionPage({ params }: EditTransactionPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { updateTransaction, softDeleteTransaction, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    void loadTransactions();
    void loadWallets();
    void transactionsRepo.getById(id).then(setTransaction);
  }, [id, loadTransactions, loadWallets]);

  const { transactions } = useTransactionStore();
  const titleSuggestions =
    transaction?.type === "income" || transaction?.type === "expense"
      ? getTitleSuggestions(transactions, transaction.type)
      : [];
  const categorySuggestions =
    transaction?.type === "income" || transaction?.type === "expense"
      ? getCategorySuggestions(transactions, transaction.type, locale)
      : [];

  // Loading
  if (transaction === undefined) {
    return (
      <>
        <AppHeader title={tc("edit")} showBack />
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-[12px] animate-pulse"
              style={{ background: "var(--bg-secondary)" }}
            />
          ))}
        </div>
      </>
    );
  }

  // Not found or deleted
  if (transaction === null || !transaction.is_active) {
    return (
      <>
        <AppHeader title={tc("edit")} showBack />
        <EmptyState
          icon={FileText}
          title={t("notFound")}
          description={t("notFoundDesc")}
        />
      </>
    );
  }

  const typeLabel =
    transaction.type === "income"
      ? t("editIncome")
      : transaction.type === "expense"
      ? t("editExpense")
      : t("editTransfer");

  const handleDeleteConfirm = () => {
    softDeleteTransaction(transaction.id);
    router.replace("/transactions");
  };

  const headerActions = (
    <button
      onClick={() => setIsDeleteDialogOpen(true)}
      className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
      style={{
        minWidth: "var(--tap-target-min)",
        minHeight: "var(--tap-target-min)",
        color: "var(--color-negative)",
      }}
      aria-label="Delete transaction"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );

  if (transaction.type === "transfer") {
    const handleTransferSubmit = async (values: TransferFormValues) => {
      setIsSubmitting(true);
      try {
        updateTransaction(transaction.id, {
          type: "transfer",
          wallet_id: values.source_wallet_id,
          destination_wallet_id: values.destination_wallet_id,
          amount: parseIDR(values.amount),
          title: null,
          category: null,
          description: values.description || null,
          transaction_date: values.transaction_date,
          transaction_time: values.transaction_time,
        });
        router.replace("/transactions");
      } catch (err) {
        console.error("Failed to update transfer:", err);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <>
        <AppHeader title={typeLabel} showBack actions={headerActions} />
        <TransferForm
          wallets={wallets}
          initialValues={{
            transaction_date: transaction.transaction_date,
            transaction_time: transaction.transaction_time,
            source_wallet_id: transaction.wallet_id,
            destination_wallet_id: transaction.destination_wallet_id ?? "",
            amount: String(transaction.amount),
            description: transaction.description ?? "",
          }}
          isSubmitting={isSubmitting}
          isEditMode
          onSubmit={handleTransferSubmit}
        />
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title={t("deleteConfirm.title")}
          description={t("deleteConfirm.description")}
          confirmLabel={t("deleteConfirm.confirm")}
          variant="destructive"
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  }

  // Income or Expense
  const handleIncomeExpenseSubmit = async (values: IncomeExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      updateTransaction(transaction.id, {
        type: transaction.type,
        wallet_id: values.wallet_id,
        destination_wallet_id: null,
        amount: parseIDR(values.amount),
        title: values.title || null,
        category: values.category || null,
        description: values.description || null,
        transaction_date: values.transaction_date,
        transaction_time: values.transaction_time,
      });
      router.replace("/transactions");
    } catch (err) {
      console.error("Failed to update transaction:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title={typeLabel} showBack actions={headerActions} />
      <IncomeExpenseForm
        type={transaction.type as "income" | "expense"}
        wallets={wallets}
        initialValues={{
          transaction_date: transaction.transaction_date,
          transaction_time: transaction.transaction_time,
          wallet_id: transaction.wallet_id,
          amount: String(transaction.amount),
          title: transaction.title ?? "",
          category: transaction.category ?? "",
          description: transaction.description ?? "",
        }}
        titleSuggestions={titleSuggestions}
        categorySuggestions={categorySuggestions}
        isSubmitting={isSubmitting}
        isEditMode
        onSubmit={handleIncomeExpenseSubmit}
      />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("deleteConfirm.title")}
        description={t("deleteConfirm.description")}
        confirmLabel={t("deleteConfirm.confirm")}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
