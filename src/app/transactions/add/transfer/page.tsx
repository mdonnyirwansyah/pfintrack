"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { TransferForm, type TransferFormValues } from "../../_components/TransferForm";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { todayISO } from "@/lib/format/date";
import { useTranslations } from "next-intl";
import { parseIDR } from "@/lib/format/number";

function AddTransferContent() {
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
    void loadWallets();
  }, [loadTransactions, loadWallets]);

  const handleSubmit = async (values: TransferFormValues) => {
    setIsSubmitting(true);
    try {
      await createTransaction({
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
      router.push(`/transactions?date=${dateParam ?? todayISO()}`);
    } catch (err) {
      console.error("Failed to create transfer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title={t("addTransfer")} showBack />
      <TransferForm
        wallets={wallets}
        initialValues={{ transaction_date: initialDate }}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export default function AddTransferPage() {
  return (
    <Suspense>
      <AddTransferContent />
    </Suspense>
  );
}
