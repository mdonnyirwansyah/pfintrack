import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { Wallet } from "@/lib/types/wallet";
import { readKey, writeKey } from "./base";
import { idbUpdate, idbUpdateMany } from "./idb-client";
import { STORAGE_BACKEND } from "./config";

const WALLETS_KEY = "wallets";

async function applyDelta(walletId: string, delta: number): Promise<void> {
  if (STORAGE_BACKEND === "idb") {
    const updated = await idbUpdate<Wallet>("wallets", walletId, (wallet) => ({
      ...wallet,
      balance: wallet.balance + delta,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) {
      console.warn(
        `[wallet-balance-ops] wallet not found: ${walletId}, skipping balance update`
      );
    }
  } else {
    const all = readKey<Wallet>(WALLETS_KEY);
    const idx = all.findIndex((w) => w.id === walletId);
    if (idx === -1) {
      console.warn(
        `[wallet-balance-ops] wallet not found: ${walletId}, skipping balance update`
      );
      return;
    }
    all[idx] = {
      ...all[idx],
      balance: all[idx].balance + delta,
      updated_at: new Date().toISOString(),
    };
    writeKey(WALLETS_KEY, all);
  }
}

async function applyTransferDeltas(
  sourceId: string,
  sourceDelta: number,
  destId: string | null,
  destDelta: number,
): Promise<void> {
  if (!destId) {
    await applyDelta(sourceId, sourceDelta);
    return;
  }

  if (STORAGE_BACKEND === "idb") {
    const now = new Date().toISOString();
    const deltaById: Record<string, number> = {
      [sourceId]: sourceDelta,
      [destId]: destDelta,
    };
    await idbUpdateMany<Wallet>(
      "wallets",
      [sourceId, destId],
      (existing, id) => {
        if (!existing) {
          console.warn(
            `[wallet-balance-ops] wallet not found: ${id}, skipping balance update`
          );
          return null;
        }
        return {
          ...existing,
          balance: existing.balance + deltaById[id],
          updated_at: now,
        };
      },
    );
  } else {
    const all = readKey<Wallet>(WALLETS_KEY);
    const now = new Date().toISOString();
    const apply = (id: string, delta: number) => {
      const idx = all.findIndex((w) => w.id === id);
      if (idx === -1) {
        console.warn(
          `[wallet-balance-ops] wallet not found: ${id}, skipping balance update`
        );
        return;
      }
      all[idx] = {
        ...all[idx],
        balance: all[idx].balance + delta,
        updated_at: now,
      };
    };
    apply(sourceId, sourceDelta);
    apply(destId, destDelta);
    writeKey(WALLETS_KEY, all);
  }
}

export async function applyTransactionToWallet(tx: Transaction): Promise<void> {
  switch (tx.type) {
    case "income":
      await applyDelta(tx.wallet_id, tx.amount);
      break;
    case "expense":
      await applyDelta(tx.wallet_id, -tx.amount);
      break;
    case "transfer":
      await applyTransferDeltas(
        tx.wallet_id,
        -tx.amount,
        tx.destination_wallet_id,
        tx.amount,
      );
      break;
  }
}

export async function rollbackTransactionFromWallet(tx: Transaction): Promise<void> {
  switch (tx.type) {
    case "income":
      await applyDelta(tx.wallet_id, -tx.amount);
      break;
    case "expense":
      await applyDelta(tx.wallet_id, tx.amount);
      break;
    case "transfer":
      await applyTransferDeltas(
        tx.wallet_id,
        tx.amount,
        tx.destination_wallet_id,
        -tx.amount,
      );
      break;
  }
}

export async function applyLoanEntryToWallet(entry: LoanEntry): Promise<void> {
  if (!entry.wallet_id) return;

  switch (entry.type) {
    case "give":
      await applyDelta(entry.wallet_id, -entry.amount);
      break;
    case "get":
      await applyDelta(entry.wallet_id, entry.amount);
      break;
  }
}

export async function rollbackLoanEntryFromWallet(entry: LoanEntry): Promise<void> {
  if (!entry.wallet_id) return;

  switch (entry.type) {
    case "give":
      await applyDelta(entry.wallet_id, entry.amount);
      break;
    case "get":
      await applyDelta(entry.wallet_id, -entry.amount);
      break;
  }
}
