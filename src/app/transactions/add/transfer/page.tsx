"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { TransferForm, type TransferFormValues } from "../../_components/TransferForm";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";

export default function AddTransferPage() {
  const router = useRouter();
  const { createTransaction, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const handleSubmit = async (values: TransferFormValues) => {
    setIsSubmitting(true);
    try {
      createTransaction({
        type: "transfer",
        wallet_id: values.source_wallet_id,
        destination_wallet_id: values.destination_wallet_id,
        amount: parseFloat(values.amount),
        title: null,
        category: null,
        description: values.description || null,
        transaction_date: values.transaction_date,
        transaction_time: values.transaction_time,
      });
      router.push("/transactions");
    } catch (err) {
      console.error("Failed to create transfer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="Add Transfer" showBack />
      <TransferForm
        wallets={wallets}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}
