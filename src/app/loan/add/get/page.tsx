"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { LoanEntryForm, type LoanEntryFormValues } from "@/components/loan/LoanEntryForm";
import { useLoanCounterpartyStore, useLoanEntryStore } from "@/lib/stores/useLoanStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";
import { useTranslations } from "next-intl";

// [12] Add Get Entry
function AddGetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counterpartyIdParam = searchParams.get("counterpartyId");

  const { wallets, loadWallets } = useWalletStore();
  const { findOrCreateCounterparty } = useLoanCounterpartyStore();
  const { createEntry } = useLoanEntryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("loan");

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  // Pre-fill name if counterpartyId param is provided
  const lockedCounterparty = counterpartyIdParam
    ? loanCounterpartiesRepo.getById(counterpartyIdParam)
    : null;

  const initialValues: Partial<LoanEntryFormValues> = {
    name: lockedCounterparty?.name ?? "",
  };

  async function handleSubmit(values: LoanEntryFormValues) {
    setIsSubmitting(true);
    try {
      const counterparty = findOrCreateCounterparty(values.name);

      createEntry({
        counterpartyId: counterparty.id,
        type: "get",
        amount: parseFloat(values.amount),
        wallet_id: values.wallet_id,
        note: values.note.trim() || null,
        transaction_date: values.transaction_date,
        transaction_time: values.transaction_time,
      });

      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader
        title={t("addGet")}
        showBack
      />

      <LoanEntryForm
        type="get"
        initialValues={initialValues}
        isNameLocked={!!lockedCounterparty}
        wallets={wallets}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}

export default function AddGetPage() {
  return (
    <Suspense>
      <AddGetContent />
    </Suspense>
  );
}
