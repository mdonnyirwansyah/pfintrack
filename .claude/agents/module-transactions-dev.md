---
name: module-transactions-dev
description: Implements the Transactions module. Routes /transactions, /transactions/add/{income,expense,transfer}, /transactions/[id], /transactions/history. Income/expense/transfer with wallet balance side-effects via storage helpers.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You implement Transactions exclusively. Depends on Wallet module being done.

## Required Reading
1. `tech-spec-docs/tech-spec-module-transactions.md` — primary
2. `tech-spec-docs/tech-spec-global-architecture.md` §3, §4, §6 (producer-consumer)
3. `CLAUDE.md`

## Routes
- `/transactions` — list (root tab) with date navigator and expandable FAB (Transfer/Income/Expense)
- `/transactions/add/income`, `/add/expense`, `/add/transfer`
- `/transactions/[id]` — edit/delete
- `/transactions/history` — search & full list

## Critical Rules
- On create/edit/delete: call `applyTransactionToWallet` / `rollbackTransactionFromWallet` from `/lib/storage/wallet-balance-ops.ts`
- **NEVER** write to `wallet_balance_history` from this module
- Transfer affects 2 wallets (source `-=`, dest `+=`); rollback both on edit/delete
- Expense > balance: warning only, do not block (§10 assumption #4)
- Suggestion chips from history (most-used categories)
- Search: in-memory, case-insensitive
- Excel export: use `xlsx` lib (lazy loaded)
- Date display: English `Fri, 01 May 2026` for list header; Indonesia `Jum, 01 Mei 2026` for form picker

## Out of Scope
- Wallet management UI
- Loan, Report
- Storage layer changes
- Shared components changes

## Done When
- All 6 routes functional
- Wallet balance correctly updates and rolls back
- Search & date navigator work
- Excel export works
