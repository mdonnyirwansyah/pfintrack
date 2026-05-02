"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { WalletForm } from "@/features/wallet/components/WalletForm";
import { useWalletActions } from "@/features/wallet/hooks/useWalletActions";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { walletsRepo } from "@/lib/storage/wallets";
import { formatIDR } from "@/lib/format/number";
import type { Wallet } from "@/lib/types/wallet";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// [9] Edit Wallet
export default function EditWalletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { handleUpdate, handleDelete, isNameTaken, loadWallets } = useWalletActions();
  const loadWalletsFromStore = useWalletStore((s) => s.loadWallets);

  useEffect(() => {
    loadWallets();
    const found = walletsRepo.getById(id);
    if (!found || !found.is_active) {
      setNotFound(true);
    } else {
      setWallet(found);
    }
  }, [id, loadWallets]);

  const handleSubmit = async (values: WalletFormValues) => {
    if (!wallet) return;
    setIsSubmitting(true);
    try {
      handleUpdate(wallet.id, values, wallet.balance);
      router.push("/wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!wallet) return;
    handleDelete(wallet.id);
    router.push("/wallet");
  };

  // For duplicate name check: exclude the current wallet from the check
  const checkNameTaken = (name: string) => isNameTaken(name, wallet?.id);

  if (notFound) {
    return (
      <>
        <AppHeader title="Edit Wallet" showBack />
        <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
          <p
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Wallet not found
          </p>
          <button
            onClick={() => router.push("/wallet")}
            className="text-[15px] font-medium mt-2"
            style={{ color: "var(--color-brand)" }}
          >
            Back to wallet list
          </button>
        </div>
      </>
    );
  }

  if (!wallet) {
    return (
      <>
        <AppHeader title="Edit Wallet" showBack />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-[52px] w-full rounded-[12px]" />
          <Skeleton className="h-[52px] w-full rounded-[12px]" />
          <Skeleton className="h-[52px] w-full rounded-[12px]" />
          <Skeleton className="h-[52px] w-full rounded-[12px]" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Edit Wallet" showBack />

      <div className="px-4 py-4">
        {/* Current balance info */}
        <div
          className="glass rounded-[16px] px-4 py-3 mb-4 flex items-center justify-between"
          style={{}}
        >
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Current Balance
          </span>
          <span
            className="text-[17px] font-semibold tabular-nums"
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
          deleteSlot={
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className={cn(
                "w-full rounded-[12px] text-[15px] font-semibold transition-all active:scale-[0.98]",
                "flex items-center justify-center gap-2 border"
              )}
              style={{
                minHeight: "var(--tap-target-min)",
                color: "var(--color-negative)",
                borderColor: "var(--color-negative)",
                backgroundColor: "transparent",
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Wallet
            </button>
          }
        />
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Wallet?"
        description={
          <>
            Wallet <strong>{wallet.name}</strong> will be deleted. This action
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
