"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { IncomeExpenseForm, type IncomeExpenseFormValues } from "../../_components/IncomeExpenseForm";
import { useTransactionStore, getTitleSuggestions, getCategorySuggestions } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { transactionsRepo } from "@/lib/storage/transactions";

export default function AddIncomePage() {
  const router = useRouter();
  const { createTransaction, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  // Get suggestions from all transactions (not just store state — load fresh)
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
      router.push("/transactions");
    } catch (err) {
      console.error("Failed to create income:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="Add Income" showBack />
      <IncomeExpenseForm
        type="income"
        wallets={wallets}
        titleSuggestions={titleSuggestions}
        categorySuggestions={categorySuggestions}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}
