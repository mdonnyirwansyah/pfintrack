/**
 * Cross-cutting helpers for updating wallet.balance as a side-effect
 * of Transaction and Loan operations.
 *
 * CRITICAL INVARIANTS (§6.3):
 *  - These helpers MUST NOT write to `wallet_balance_history`.
 *  - `wallet_balance_history` is ONLY written by the Wallet module
 *    when a user manually edits balance via the Edit Wallet screen.
 *  - All writes here go directly to `wallets` only.
 */

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
        `[wallet-balance-ops] wallet not found: ${walletId} — skipping balance update`
      );
    }
  } else {
    const all = readKey<Wallet>(WALLETS_KEY);
    const idx = all.findIndex((w) => w.id === walletId);
    if (idx === -1) {
      console.warn(
        `[wallet-balance-ops] wallet not found: ${walletId} — skipping balance update`
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

/**
 * Atomic two-wallet balance mutation for transfers.
 * On IDB backend both writes happen inside a single readwrite transaction:
 * either both balances commit or neither does (no half-applied transfer if
 * the tab is closed mid-operation).
 *
 * If either wallet id is missing, it is skipped and a warning is logged —
 * matching the existing `applyDelta` behavior so callers don't see new
 * failure modes.
 */
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
            `[wallet-balance-ops] wallet not found: ${id} — skipping balance update`
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
    // localStorage is synchronous — already atomic at the JS-tick level.
    const all = readKey<Wallet>(WALLETS_KEY);
    const now = new Date().toISOString();
    const apply = (id: string, delta: number) => {
      const idx = all.findIndex((w) => w.id === id);
      if (idx === -1) {
        console.warn(
          `[wallet-balance-ops] wallet not found: ${id} — skipping balance update`
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

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

/**
 * Apply a transaction's effect to wallet balance(s).
 * - income:   wallet.balance += amount
 * - expense:  wallet.balance -= amount
 * - transfer: source -= amount, destination += amount
 */
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

/**
 * Rollback (reverse) a transaction's effect from wallet balance(s).
 * Used before editing or soft-deleting a transaction.
 */
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

// ---------------------------------------------------------------------------
// Loan entry helpers
// ---------------------------------------------------------------------------

/**
 * Apply a loan entry's effect to wallet balance (if wallet_id is set).
 * - give: wallet.balance -= amount  (user paid out)
 * - get:  wallet.balance += amount  (user received)
 */
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

/**
 * Rollback (reverse) a loan entry's effect from wallet balance.
 * Used before editing or soft-deleting a loan entry.
 */
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
