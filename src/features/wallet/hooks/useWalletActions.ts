"use client";

import { useWalletStore } from "@/lib/stores/useWalletStore";
import { parseIDR } from "@/lib/format/number";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";
import type { WalletType } from "@/lib/types/wallet";

/**
 * Convenience hook that wraps useWalletStore actions with form-value parsing.
 */
export function useWalletActions() {
  const { createWallet, updateWallet, softDeleteWallet, isNameTaken, loadWallets } =
    useWalletStore();

  function handleCreate(values: WalletFormValues) {
    const balance = parseIDR(values.balance.trim());
    return createWallet({
      name: values.name.trim(),
      wallet_type: values.wallet_type as WalletType,
      balance: isNaN(balance) ? 0 : balance,
    });
  }

  function handleUpdate(id: string, values: WalletFormValues, previousBalance: number) {
    const balance = parseIDR(values.balance.trim());
    return updateWallet(
      id,
      {
        name: values.name.trim(),
        wallet_type: values.wallet_type as WalletType,
        balance: isNaN(balance) ? previousBalance : balance,
      },
      previousBalance
    );
  }

  function handleDelete(id: string) {
    softDeleteWallet(id);
  }

  return { handleCreate, handleUpdate, handleDelete, isNameTaken, loadWallets };
}
