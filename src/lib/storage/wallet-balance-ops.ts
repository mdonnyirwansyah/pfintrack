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
import { readKey, writeKey } from "./base";
import type { Wallet } from "@/lib/types/wallet";

const WALLETS_KEY = "wallets";

function applyDelta(walletId: string, delta: number): void {
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

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

/**
 * Apply a transaction's effect to wallet balance(s).
 * - income:   wallet.balance += amount
 * - expense:  wallet.balance -= amount
 * - transfer: source -= amount, destination += amount
 */
export function applyTransactionToWallet(tx: Transaction): void {
  switch (tx.type) {
    case "income":
      applyDelta(tx.wallet_id, tx.amount);
      break;
    case "expense":
      applyDelta(tx.wallet_id, -tx.amount);
      break;
    case "transfer":
      applyDelta(tx.wallet_id, -tx.amount);
      if (tx.destination_wallet_id) {
        applyDelta(tx.destination_wallet_id, tx.amount);
      }
      break;
  }
}

/**
 * Rollback (reverse) a transaction's effect from wallet balance(s).
 * Used before editing or soft-deleting a transaction.
 */
export function rollbackTransactionFromWallet(tx: Transaction): void {
  switch (tx.type) {
    case "income":
      applyDelta(tx.wallet_id, -tx.amount);
      break;
    case "expense":
      applyDelta(tx.wallet_id, tx.amount);
      break;
    case "transfer":
      applyDelta(tx.wallet_id, tx.amount);
      if (tx.destination_wallet_id) {
        applyDelta(tx.destination_wallet_id, -tx.amount);
      }
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
export function applyLoanEntryToWallet(entry: LoanEntry): void {
  if (!entry.wallet_id) return;

  switch (entry.type) {
    case "give":
      applyDelta(entry.wallet_id, -entry.amount);
      break;
    case "get":
      applyDelta(entry.wallet_id, entry.amount);
      break;
  }
}

/**
 * Rollback (reverse) a loan entry's effect from wallet balance.
 * Used before editing or soft-deleting a loan entry.
 */
export function rollbackLoanEntryFromWallet(entry: LoanEntry): void {
  if (!entry.wallet_id) return;

  switch (entry.type) {
    case "give":
      applyDelta(entry.wallet_id, entry.amount);
      break;
    case "get":
      applyDelta(entry.wallet_id, -entry.amount);
      break;
  }
}
