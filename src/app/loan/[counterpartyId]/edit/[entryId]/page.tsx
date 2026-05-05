"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoanEntryForm, type LoanEntryFormValues } from "@/components/loan/LoanEntryForm";
import { useLoanEntryStore } from "@/lib/stores/useLoanStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";
import { loanCounterpartiesRepo } from "@/lib/storage/loan-counterparties";
import { useMounted } from "@/hooks/useMounted";
import { Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseIDR } from "@/lib/format/number";

// [14] Edit Loan Entry
export default function EditLoanEntryPage({
  params,
}: {
  params: Promise<{ counterpartyId: string; entryId: string }>;
}) {
  const { counterpartyId, entryId } = use(params);
  const router = useRouter();
  const mounted = useMounted();
  const t = useTranslations("loan");

  const { wallets, loadWallets } = useWalletStore();
  const { updateEntry, deleteEntry } = useLoanEntryStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  // Render title yang konsisten saat SSR (sebelum mount, localStorage belum tersedia)
  if (!mounted) {
    return (
      <>
        <AppHeader title={t("editEntry")} showBack />
        <div className="px-4 py-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-[12px] animate-pulse"
              style={{ background: "var(--bg-secondary)" }}
            />
          ))}
        </div>
      </>
    );
  }

  // Load entry and counterparty directly from storage (source of truth)
  // Hanya dijalankan setelah mounted (client-side) untuk menghindari hydration mismatch
  const entry = loanEntriesRepo.getById(entryId);
  const counterparty = loanCounterpartiesRepo.getById(counterpartyId);

  if (!entry || !entry.is_active || !counterparty) {
    return (
      <>
        <AppHeader title={t("editEntry")} showBack />
        <div className="px-4 py-8">
          <EmptyState
            icon={Users}
            title={t("entryNotFound")}
            description={t("entryNotFoundDesc")}
          />
        </div>
      </>
    );
  }

  const initialValues: Partial<LoanEntryFormValues> = {
    transaction_date: entry.transaction_date,
    transaction_time: entry.transaction_time,
    amount: String(entry.amount),
    name: counterparty.name,
    wallet_id: entry.wallet_id,
    note: entry.note ?? "",
  };

  async function handleSubmit(values: LoanEntryFormValues) {
    setIsSubmitting(true);
    try {
      updateEntry(
        entryId,
        {
          type: entry!.type,
          amount: parseIDR(values.amount),
          wallet_id: values.wallet_id,
          note: values.note.trim() || null,
          transaction_date: values.transaction_date,
          transaction_time: values.transaction_time,
        },
        counterpartyId
      );

      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    deleteEntry(entryId, counterpartyId);
    router.replace(`/loan/${counterpartyId}`);
  }

  const typeLabel = entry.type === "give" ? t("editGive") : t("editGet");

  const headerActions = (
    <button
      onClick={() => setIsDeleteDialogOpen(true)}
      className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
      style={{
        minWidth: "var(--tap-target-min)",
        minHeight: "var(--tap-target-min)",
        color: "var(--color-negative)",
      }}
      aria-label="Delete entry"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );

  return (
    <>
      <AppHeader title={typeLabel} showBack actions={headerActions} />

      <LoanEntryForm
        type={entry.type}
        initialValues={initialValues}
        isNameLocked
        wallets={wallets}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("deleteEntryConfirm.title")}
        description={t("deleteEntryConfirm.description")}
        confirmLabel={t("deleteEntryConfirm.confirm")}
        cancelLabel={t("deleteEntryConfirm.cancel")}
        variant="destructive"
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          handleDelete();
        }}
      />
    </>
  );
}
