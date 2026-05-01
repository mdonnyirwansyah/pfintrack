"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { WalletForm } from "@/features/wallet/components/WalletForm";
import { useWalletActions } from "@/features/wallet/hooks/useWalletActions";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";

// [8] Add Wallet
export default function AddWalletPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleCreate, isNameTaken, loadWallets } = useWalletActions();

  // Ensure wallet store is hydrated so duplicate-name check works
  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const handleSubmit = async (values: WalletFormValues) => {
    setIsSubmitting(true);
    try {
      handleCreate(values);
      router.push("/wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader title="Add Wallet" showBack />

      <div className="px-4 py-4">
        <WalletForm
          isAddMode
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          isNameTaken={isNameTaken}
        />
      </div>
    </>
  );
}
