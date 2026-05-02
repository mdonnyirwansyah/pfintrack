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

function AddIncomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createTransaction, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("transactions");

  // Baca ?date= dari URL, fallback ke hari ini
  const dateParam = searchParams.get("date");
  const initialDate = dateParam ?? todayISO();

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const allTxns = transactionsRepo.getAll();
  const titleSuggestions = getTitleSuggestions(allTxns, "income");
  const categorySuggestions = getCategorySuggestions(allTxns, "income");

  const handleSubmit = async (values: IncomeExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      createTransaction({
        type: "income",
        wallet_id: values.wallet_id,
        amount: parseFloat(values.amount),
        title: values.title || null,
        category: values.category || null,
        description: values.description || null,
        transaction_date: values.transaction_date,
        transaction_time: values.transaction_time,
      });
      router.push(`/transactions?date=${dateParam ?? todayISO()}`);
    } catch (err) {
      console.error("Failed to create income:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title={t("addIncome")} showBack />
      <IncomeExpenseForm
        type="income"
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

export default function AddIncomePage() {
  return (
    <Suspense>
      <AddIncomeContent />
    </Suspense>
  );
}
