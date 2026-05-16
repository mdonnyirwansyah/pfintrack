"use client";

import { useWalletStore } from "@/lib/stores/useWalletStore";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import { parseIDR } from "@/lib/format/number";
import { todayISO, currentTimeHHMM } from "@/lib/format/date";
import type { WalletFormValues } from "@/features/wallet/components/WalletForm";
import type { WalletType } from "@/lib/types/wallet";

export function useWalletActions() {
  const { createWallet, updateWallet, softDeleteWallet, isNameTaken, loadWallets } =
    useWalletStore();

  async function handleCreate(values: WalletFormValues) {
    const balance = parseIDR(values.balance.trim());
    const actualBalance = Number.isNaN(balance) ? 0 : balance;

    const wallet = await createWallet({
      name: values.name.trim(),
      wallet_type: values.wallet_type as WalletType,
      balance: 0,
    });

    if (actualBalance > 0) {
      await walletBalanceHistoryRepo.create({
        wallet_id: wallet.id,
        previous_balance: 0,
        new_balance: actualBalance,
      });

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

  async function handleUpdate(id: string, values: WalletFormValues, previousBalance: number) {
    const newBalanceParsed = parseIDR(values.balance.trim());
    const actualNewBalance = Number.isNaN(newBalanceParsed) ? previousBalance : newBalanceParsed;
    const delta = actualNewBalance - previousBalance;

    const updated = await updateWallet(id, {
      name: values.name.trim(),
      wallet_type: values.wallet_type as WalletType,
    });

    if (delta !== 0) {
      await walletBalanceHistoryRepo.create({
        wallet_id: id,
        previous_balance: previousBalance,
        new_balance: actualNewBalance,
      });

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

  async function handleDelete(id: string) {
    await softDeleteWallet(id);
  }

  return { handleCreate, handleUpdate, handleDelete, isNameTaken, loadWallets };
}
