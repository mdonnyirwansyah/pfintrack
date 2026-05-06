"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { IncomeExpenseForm, type IncomeExpenseFormValues } from "../../_components/IncomeExpenseForm";
import { useTransactionStore, getTitleSuggestions, getCategorySuggestions } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { transactionsRepo } from "@/lib/storage/transactions";
import { todayISO } from "@/lib/format/date";
import { useTranslations } from "next-intl";
import { parseIDR } from "@/lib/format/number";

function AddExpenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createTransaction, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("transactions");

  // Read ?date= from URL, fallback to today
  const dateParam = searchParams.get("date");
  const initialDate = dateParam ?? todayISO();

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const allTxns = transactionsRepo.getAll();
  const titleSuggestions = getTitleSuggestions(allTxns, "expense");
  const categorySuggestions = getCategorySuggestions(allTxns, "expense");

  const handleSubmit = async (values: IncomeExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      createTransaction({
        type: "expense",
        wallet_id: values.wallet_id,
        amount: parseIDR(values.amount),
        title: values.title || null,
        category: values.category || null,
        description: values.description || null,
        transaction_date: values.transaction_date,
        transaction_time: values.transaction_time,
      });
      router.push(`/transactions?date=${dateParam ?? todayISO()}`);
    } catch (err) {
      console.error("Failed to create expense:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title={t("addExpense")} showBack />
      <IncomeExpenseForm
        type="expense"
        wallets={wallets}
        initialValues={{ transaction_date: initialDate }}
        titleSuggestions={titleSuggestions}
        categorySuggestions={categorySuggestions}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export default function AddExpensePage() {
  return (
    <Suspense>
      <AddExpenseContent />
    </Suspense>
  );
}
