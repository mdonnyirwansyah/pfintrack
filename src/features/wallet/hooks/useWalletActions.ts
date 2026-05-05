"use client";

import { useWalletStore } from "@/lib/stores/useWalletStore";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import { parseIDR } from "@/lib/format/number";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";
import type { WalletType } from "@/lib/types/wallet";

/**
 * Convenience hook that wraps useWalletStore actions with form-value parsing.
 * Also creates Balance Correction transactions when wallet balance is set or changed.
 */
export function useWalletActions() {
  const { createWallet, updateWallet, softDeleteWallet, isNameTaken, loadWallets } =
    useWalletStore();

  function handleCreate(values: WalletFormValues) {
    const balance = parseIDR(values.balance.trim());
    const actualBalance = isNaN(balance) ? 0 : balance;

    // Create wallet with 0 balance — balance will be applied via Balance Correction transaction
    const wallet = createWallet({
      name: values.name.trim(),
      wallet_type: values.wallet_type as WalletType,
      balance: 0,
    });

    if (actualBalance > 0) {
      // Write balance history for the initial balance (manual edit = wallet creation)
      walletBalanceHistoryRepo.create({
        wallet_id: wallet.id,
        previous_balance: 0,
        new_balance: actualBalance,
      });

      // Create Balance Correction income transaction (applies wallet side-effect: balance += actualBalance)
      useTransactionStore.getState().createTransaction({
        type: "income",
        wallet_id: wallet.id,
        amount: actualBalance,
        title: "Balance Correction",
        category: "Balance Correction",
        transaction_date: todayISO(),
        transaction_time: currentTimeHHMM(),
      });
    }

    return wallet;
  }

  function handleUpdate(id: string, values: WalletFormValues, previousBalance: number) {
    const newBalanceParsed = parseIDR(values.balance.trim());
    const actualNewBalance = isNaN(newBalanceParsed) ? previousBalance : newBalanceParsed;
    const delta = actualNewBalance - previousBalance;

    // Update name and type only — balance is handled via transaction below
    const updated = updateWallet(id, {
      name: values.name.trim(),
      wallet_type: values.wallet_type as WalletType,
    });

    if (delta !== 0) {
      // Write balance history for the manual balance change
      walletBalanceHistoryRepo.create({
        wallet_id: id,
        previous_balance: previousBalance,
        new_balance: actualNewBalance,
      });

      // Create Balance Correction transaction (applies wallet side-effect for the delta)
      useTransactionStore.getState().createTransaction({
        type: delta > 0 ? "income" : "expense",
        wallet_id: id,
        amount: Math.abs(delta),
        title: "Balance Correction",
        category: "Balance Correction",
        transaction_date: todayISO(),
        transaction_time: currentTimeHHMM(),
      });
    }

    return updated;
  }

  function handleDelete(id: string) {
    softDeleteWallet(id);
  }

  return { handleCreate, handleUpdate, handleDelete, isNameTaken, loadWallets };
}
