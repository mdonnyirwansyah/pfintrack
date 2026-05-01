---
name: wallet-balance-trace
description: Reference table for how each operation should affect wallet.balance and whether it logs to wallet_balance_history. Use when writing or auditing transaction/loan handlers.
---

# wallet-balance-trace

Per spec global §6.3 — single source of truth.

## Mutation Table

| Action | wallet.balance effect | Log to wallet_balance_history? |
|--------|----------------------|--------------------------------|
| Add wallet (initial balance) | set initial | ❌ |
| **Edit balance via Wallet edit form** | set new | ✅ **YES** |
| Add transaction income | `+= amount` | ❌ |
| Add transaction expense | `-= amount` | ❌ |
| Add transaction transfer | source `-= amount`, dest `+= amount` | ❌ |
| Edit/delete transaction | rollback old, apply new | ❌ |
| Add loan give (with wallet) | `-= amount` | ❌ |
| Add loan get (with wallet) | `+= amount` | ❌ |
| Edit/delete loan entry | rollback old, apply new | ❌ |
| Soft delete wallet | no balance change | ❌ |

## Single Rule
**Only manual edit in Wallet module writes to `wallet_balance_history`.** Everything else has its own audit trail in `transactions` or `loan_entries`.

## Helper Functions (must be used)
```ts
import {
  applyTransactionToWallet,
  rollbackTransactionFromWallet,
  applyLoanEntryToWallet,
  rollbackLoanEntryFromWallet,
} from '@/lib/storage/wallet-balance-ops';
```

## Edit Pattern
```ts
// Before saving an edit:
rollbackXFromWallet(oldRecord);
applyXToWallet(newRecord);
xRepo.update(id, newRecord);
```

## Cascade (Loan counterparty delete)
```ts
const entries = loanEntriesRepo.getByCounterparty(id);
entries.forEach(e => rollbackLoanEntryFromWallet(e));
entries.forEach(e => loanEntriesRepo.softDelete(e.id));
counterpartiesRepo.softDelete(id);
```
