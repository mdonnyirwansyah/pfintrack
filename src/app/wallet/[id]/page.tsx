"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { WalletForm } from "@/features/wallet/components/WalletForm";
import { useWalletActions } from "@/features/wallet/hooks/useWalletActions";
import { walletsRepo } from "@/lib/storage/wallets";
import { formatIDR } from "@/lib/format/number";
import type { Wallet } from "@/lib/types/wallet";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { transactionsRepo } from "@/lib/storage/transactions";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";

export default function EditWalletPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInUse, setIsInUse] = useState(false);

  const { handleUpdate, handleDelete, isNameTaken, loadWallets } = useWalletActions();
  const t = useTranslations("wallet");
  const tc = useTranslations("common");

  useEffect(() => {
    async function init() {
      await loadWallets();
      const found = await walletsRepo.getById(id);
      if (found?.is_active) {
        setWallet(found);
        const [txs, loans] = await Promise.all([
          transactionsRepo.getByWalletId(found.id),
          loanEntriesRepo.getByWalletId(found.id),
        ]);
        setIsInUse(txs.length > 0 || loans.length > 0);
      } else {
        setNotFound(true);
      }
    }
    void init();
  }, [id, loadWallets]);

  const handleSubmit = async (values: WalletFormValues) => {
    if (!wallet) return;
    setIsSubmitting(true);
    try {
      await handleUpdate(wallet.id, values, wallet.balance);
      router.push("/wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!wallet) return;
    await handleDelete(wallet.id);
    router.push("/wallet");
  };

  const checkNameTaken = (name: string) => isNameTaken(name, wallet?.id);

  if (notFound) {
    return (
      <>
        <AppHeader title={t("editTitle")} showBack />
        <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("notFound")}
          </p>
          <button
            onClick={() => router.push("/wallet")}
            className="text-[14px] font-medium mt-2"
            style={{ color: "var(--color-brand)" }}
          >
            {t("backToList")}
          </button>
        </div>
      </>
    );
  }

  if (!wallet) {
    return (
      <>
        <AppHeader title={t("editTitle")} showBack />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-[64px] w-full rounded-[12px]" />
          <Skeleton className="h-[64px] w-full rounded-[12px]" />
          <Skeleton className="h-[64px] w-full rounded-[12px]" />
          <Skeleton className="h-[64px] w-full rounded-[12px]" />
        </div>
      </>
    );
  }

  const headerActions = (
    <button
      onClick={() => {
        if (isInUse) {
          toast.error(t("cannotDeleteInUse"), {
            id: "delete-in-use",
            duration: 3000,
          });
        } else {
          setIsDeleteDialogOpen(true);
        }
      }}
      className="flex items-center justify-center rounded-full transition-opacity active:opacity-60"
      style={{
        minWidth: "var(--tap-target-min)",
        minHeight: "var(--tap-target-min)",
        color: isInUse ? "var(--text-tertiary)" : "var(--color-negative)",
      }}
      aria-label={tc("delete")}
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );

  return (
    <>
      <AppHeader title={t("editTitle")} showBack actions={headerActions} />

      <div className="px-4 py-4">
        <div
          className="glass rounded-[16px] px-4 py-3 mb-4 flex items-center justify-between"
          style={{}}
        >
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("currentBalance")}
          </span>
          <span
            className="text-[16px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {formatIDR(wallet.balance)}
          </span>
        </div>

        <WalletForm
          initialValues={{
            name: wallet.name,
            balance: formatIDR(wallet.balance),
            wallet_type: wallet.wallet_type,
          }}
          isAddMode={false}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          isNameTaken={checkNameTaken}
        />
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("deleteConfirm.title")}
        description={t("deleteConfirm.description", { name: wallet.name })}
        confirmLabel={t("deleteConfirm.confirm")}
        cancelLabel={t("deleteConfirm.cancel")}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
