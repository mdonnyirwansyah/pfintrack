"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { LoanEntryForm, type LoanEntryFormValues } from "@/components/loan/LoanEntryForm";
import { useLoanCounterpartyStore, useLoanEntryStore } from "@/lib/stores/useLoanStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";
import type { LoanCounterparty } from "@/lib/types/loan";
import { useTranslations } from "next-intl";
import { parseIDR } from "@/lib/format/number";

function AddGetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counterpartyIdParam = searchParams.get("counterpartyId");

  const { wallets, loadWallets } = useWalletStore();
  const { findOrCreateCounterparty } = useLoanCounterpartyStore();
  const { createEntry } = useLoanEntryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedCounterparty, setLockedCounterparty] = useState<LoanCounterparty | null>(null);
  const [counterpartyFetched, setCounterpartyFetched] = useState(!counterpartyIdParam);
  const t = useTranslations("loan");

  useEffect(() => {
    void loadWallets();
    if (counterpartyIdParam) {
      void loanCounterpartiesRepo.getById(counterpartyIdParam).then((cp) => {
        setLockedCounterparty(cp);
        setCounterpartyFetched(true);
      });
    }
  }, [loadWallets, counterpartyIdParam]);

  const initialValues: Partial<LoanEntryFormValues> = {
    name: lockedCounterparty?.name ?? "",
  };

  async function handleSubmit(values: LoanEntryFormValues) {
    setIsSubmitting(true);
    try {
      const counterpartyId = lockedCounterparty
        ? lockedCounterparty.id
        : (await findOrCreateCounterparty(values.name)).id;
      await createEntry({
        counterpartyId,
        type: "get",
        amount: parseIDR(values.amount),
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
      <AppHeader title={t("addGet")} showBack />
      {counterpartyFetched && (
        <LoanEntryForm
          type="get"
          initialValues={initialValues}
          isNameLocked={!!lockedCounterparty}
          wallets={wallets}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      )}
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
