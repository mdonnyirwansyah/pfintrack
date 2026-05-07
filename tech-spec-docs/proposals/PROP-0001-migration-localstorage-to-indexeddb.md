# Proposal: Migrate Storage Layer from localStorage to IndexedDB

**Status:** Accepted
**Created:** 2026-05-06
**Author:** Discussion with @user (via feature-architect)
**Affects modules:** Cross-cutting (Wallet, Transactions, Loan, Report)
**Effort estimate:** L (7–10 days across 8 discrete steps)
**Phase target:** Fase 1 (completes before Fase 2 backend migration)

---

## 1. Problem Statement

All PFinTrack data currently lives in localStorage under 7 fixed keys. localStorage has a hard ~5 MB quota per origin — enough for hundreds of records today, but a user with years of daily transactions (1,000+ records) plus loan history and custom reports can approach this limit. Beyond capacity, localStorage reads are synchronous and JSON-parse the entire array on every call, meaning a `getAll()` on a 2,000-row transactions array forces a full parse even for a single-record lookup. This degrades app responsiveness and blocks the main thread on low-end Android devices, which are PFinTrack's primary target.

IndexedDB gives the same-origin storage quota as ~50% of free disk space (typically 500 MB–10 GB on mobile), supports cursor-based reads so only needed records are parsed, and — critically — is async and non-blocking. Migrating the storage layer under the existing repository API surface is the lowest-risk path: UI components and Zustand stores touch repos through a stable interface and will require only async-unwrapping changes, not structural redesign.

---

## 2. Proposed Solution

**Recommendation:** Option A — Incremental store-by-store migration with a dual-write bridge period.

### Option A — Store-by-store, repo API promoted to async (Recommended)

- Replace `src/lib/storage/base.ts` `readKey`/`writeKey` with an `idb`-backed equivalent. Each repo method becomes `async` and returns a Promise.
- Migrate one localStorage key to one IndexedDB object store per step. Each step is independently deployable and testable.
- A one-time data migration function runs at first app load after the update: reads legacy localStorage data, writes it to IndexedDB, then removes the localStorage key.
- Zustand store actions — currently synchronous — become `async` actions. This is a supported pattern in Zustand v5 (present in the project) and requires no store-library change.
- A `storage_version` key in localStorage (not one of the 7 data keys — it is infrastructure metadata) tracks migration state and controls the one-time migration trigger.
- Feature flag: a `NEXT_PUBLIC_STORAGE_BACKEND` env var can force `localStorage` during Step 1–7 for rollback without a redeploy.

```
┌─────────────────────────────────────────────────────────────────┐
│  Zustand Store (async actions)                                   │
│  e.g. loadWallets(): Promise<void>                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ awaits
┌────────────────────────▼────────────────────────────────────────┐
│  Repository  (async API, same method names)                      │
│  e.g. walletsRepo.getAll(): Promise<Wallet[]>                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────────┐
│  src/lib/storage/idb-base.ts                                     │
│  getStore(name) → IDBObjectStore (via idb openDB singleton)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────▼──────────────────┐
        │  pfintrack_db  (IndexedDB)         │
        │  ├── wallets                       │
        │  ├── wallet_balance_history        │
        │  ├── transactions                  │
        │  ├── loan_counterparties           │
        │  ├── loan_entries                  │
        │  └── custom_reports                │
        └───────────────────────────────────┘
```

### Option B — Adapter pattern, keep repos sync (not recommended)

Wrap every async IndexedDB call inside a synchronous-looking facade using pre-loaded in-memory cache. Repos stay sync; cache is refreshed on every write. This avoids touching Zustand stores but introduces a dual-source-of-truth problem (in-memory cache vs. IndexedDB) and makes the system harder to reason about, especially around `wallet-balance-ops` multi-store writes.

### Comparison

| Aspect | A — Async repos (recommended) | B — Sync facade over IDB |
|---|---|---|
| Effort | L | XL |
| Zustand store changes | Yes — all load/action methods go async | No |
| Risk of stale data | Low — awaited writes are durable | Medium — cache invalidation edge cases |
| Migration path to Fase 2 (backend) | Clean — async already in place | Needs another rewrite |
| Main-thread blocking eliminated | Yes | No (cache load is still sync) |
| Rollback complexity | Low — feature flag | Medium |

Option A is the right choice. The async surface change is the honest cost of adopting IndexedDB; deferring it via Option B only pushes the pain to Fase 2.

---

## 3. IndexedDB Schema

**Database name:** `pfintrack_db`
**Current schema version:** `1` (incremented to `2` when transactions index is extended in Step 4)

| Object Store | Key Path | Indexes |
|---|---|---|
| `wallets` | `id` | `by_anon_id` (anon_id), `by_is_active` (is_active) |
| `wallet_balance_history` | `id` | `by_anon_id`, `by_wallet_id` (wallet_id), `by_is_active` |
| `transactions` | `id` | `by_anon_id`, `by_wallet_id` (wallet_id), `by_dest_wallet_id` (destination_wallet_id), `by_date` (transaction_date), `by_is_active` |
| `loan_counterparties` | `id` | `by_anon_id`, `by_is_active` |
| `loan_entries` | `id` | `by_anon_id`, `by_counterparty_id` (counterparty_id), `by_wallet_id` (wallet_id), `by_is_active` |
| `custom_reports` | `id` | `by_anon_id`, `by_is_active` |

All stores use `keyPath: "id"` (string UUID). No auto-increment.

Indexes rationale:
- `by_anon_id` — required for Fase 2 server-side sync partitioning
- `by_is_active` — fast active-only reads without full scan
- `by_wallet_id` / `by_counterparty_id` — support existing repo filtered queries (`getByWalletId`, `getByCounterpartyId`)
- `by_date` — supports `transactionsRepo.getByDate()` and Report date-range aggregation
- `by_dest_wallet_id` — supports `getByWalletId` cross-reference on transfer destination

---

## 4. Async API Contract

Every repo method currently returns `T` or `T[]` synchronously. After migration each returns `Promise<T>` or `Promise<T[]>`. The method names and parameter shapes do not change.

Current (localStorage):
```ts
// synchronous
getAll(): Wallet[]
create(input: CreateWalletInput): Wallet
update(id, patch): Wallet
softDelete(id): void
```

Target (IndexedDB):
```ts
// async — same names, same params
getAll(): Promise<Wallet[]>
create(input: CreateWalletInput): Promise<Wallet>
update(id, patch): Promise<Wallet>
softDelete(id): Promise<void>
```

`wallet-balance-ops.ts` is special: `applyDelta` currently calls `readKey`/`writeKey` synchronously within a single call stack, making rollback+apply atomic. After migration both `rollbackTransactionFromWallet` and `applyTransactionToWallet` become async and must be `await`ed sequentially in the store actions. The existing store code already calls them in the correct order; only `await` keywords are added.

---

## 5. Constraints & Invariants

- The `storage_version` key used to track migration state is **not** one of the 7 data keys. It is operational metadata, the same category as `app_state` (already used by `useAppStore` via Zustand persist). This does not violate the 7-key contract.
- The `anon_id` key is kept in localStorage permanently (Step 7 rationale below). It is a 36-byte string — no capacity concern.
- All records retain `id`, `anon_id`, `is_active`, `created_at`, `updated_at`. No field changes.
- Soft-delete is preserved: `softDelete()` still sets `is_active=false` and `updated_at=now`.
- `wallet_balance_history` write rules (only on manual wallet add/edit) are unchanged.
- The Balance Correction pattern (create income/expense transaction on wallet balance change) is unchanged.
- Mobile-first: IndexedDB is available in all modern mobile browsers including Android WebView (PWA) and iOS Safari 15.4+.
- SSR guard: all IDB code must be wrapped in `typeof window !== "undefined"` checks, same pattern as current `base.ts`.
- The `idb` package (jakearchibald/idb) is a thin typed wrapper (~1 kB gzipped) with no runtime dependencies. It does not conflict with any existing dependency.

---

## 6. One-Time Data Migration Strategy

On first app load after the update, a migration runner checks `localStorage.getItem("storage_version")`. If absent (first-time user) or if the value is `"idb_v1"` (already migrated), no migration runs. If the value is `null` (old user with localStorage data), the runner:

1. Reads all 6 data arrays from localStorage
2. Opens `pfintrack_db` via the IDB singleton
3. Writes each record to the appropriate object store using `putAll` (IDB `put` is idempotent — safe to re-run)
4. Removes each localStorage data key after confirming the write
5. Sets `localStorage.setItem("storage_version", "idb_v1")`

The runner is idempotent: if interrupted mid-way (e.g., tab closed), re-running on next load will re-read any localStorage keys that were not yet removed and re-write them. Already-written IDB records are overwritten with identical data (harmless).

Migration order within the runner must respect the foreign-key relationship: `loan_counterparties` before `loan_entries`.

The migration runner lives at `src/lib/storage/migrate-from-localstorage.ts` and is called once from the root layout's `useEffect` (client-side only), after `getOrCreateAnonId()`.

---

## 7. Rollback Plan

Steps 1–7 each include a rollback path. The localStorage repos are not deleted until Step 8. A feature flag controls which implementation is active:

```ts
// src/lib/storage/config.ts (new file, Step 1)
export const STORAGE_BACKEND =
  process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb"; // "idb" | "localstorage"
```

Each repo file will import from either `idb-base.ts` or the existing `base.ts` depending on this flag. To rollback any single step: set `NEXT_PUBLIC_STORAGE_BACKEND=localstorage` in `.env.local` and redeploy. No data loss — localStorage data is preserved during Steps 1–7.

Step 8 (cleanup) is irreversible after localStorage keys are removed. A data export (JSON backup, already available in the app's settings) should be recommended to users before Step 8 deploys.

---

## 8. Migration Steps

Each step is independently executable by an implementation agent. Dependencies are listed.

---

### Step 1: Install `idb`, create DB singleton, define schema

**Depends on:** nothing
**Files to create:**
- `src/lib/storage/idb-client.ts` — `openDB` singleton with all 6 store definitions and all indexes
- `src/lib/storage/config.ts` — `STORAGE_BACKEND` flag

**Files to modify:**
- `package.json` — add `"idb": "^8.0.2"` (or latest v8)

**What to implement:**
- Call `openDB("pfintrack_db", 1, { upgrade(db) { /* create all 6 stores + all indexes */ } })`
- Export `getDB(): Promise<IDBPDatabase>` (cached singleton, SSR-safe)
- Export typed helpers: `idbGetAll<T>(store)`, `idbGet<T>(store, id)`, `idbPut<T>(store, record)`, `idbGetAllByIndex<T>(store, indexName, value)`
- No data is read or written in this step

**Verification:** `getDB()` resolves without error in browser; object stores exist in DevTools > Application > IndexedDB.

---

### Step 2: Migrate `wallets` store

**Depends on:** Step 1
**Files to create:**
- `src/lib/storage/wallets-idb.ts` — async implementation of `walletsRepo` backed by IDB

**Files to modify:**
- `src/lib/storage/wallets.ts` — add export alias that delegates to `wallets-idb.ts` when `STORAGE_BACKEND === "idb"`
- `src/lib/stores/useWalletStore.ts` — promote all actions to `async`, add `await` before every repo call
- `src/lib/storage/migrate-from-localstorage.ts` — create file with migration runner stub; implement `wallets` migration block

**API diff on `walletsRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `Wallet[]` | `Promise<Wallet[]>` |
| `getAllIncludingInactive()` | `Wallet[]` | `Promise<Wallet[]>` |
| `getById(id)` | `Wallet \| null` | `Promise<Wallet \| null>` |
| `create(input)` | `Wallet` | `Promise<Wallet>` |
| `update(id, patch)` | `Wallet` | `Promise<Wallet>` |
| `softDelete(id)` | `void` | `Promise<void>` |

**Zustand store actions that change to async:**
- `loadWallets()` — was `() => void`, becomes `() => Promise<void>`
- `createWallet(input)` — was sync, becomes `async`
- `updateWallet(id, patch)` — becomes `async`
- `softDeleteWallet(id)` — becomes `async`

**Callers of `useWalletStore` that must add `await`:**
- `useWalletActions.ts` — `handleCreate`, `handleUpdate`, `handleDelete`
- `useTransactionStore.ts` — `useWalletStore.getState().loadWallets()` calls at end of each action
- `useLoanStore.ts` — `useWalletStore.getState().loadWallets()` calls

**One-time data migration (wallets block):**
```
if (localStorage.getItem("wallets") !== null) {
  const records = JSON.parse(localStorage.getItem("wallets"))
  for (const r of records) await db.put("wallets", r)
  localStorage.removeItem("wallets")
}
```

**Verification:** Create a wallet via UI — record appears in IDB, not localStorage `wallets` key.

---

### Step 3: Migrate `wallet_balance_history` store

**Depends on:** Step 2 (wallets must be in IDB first, since the migration runner should migrate wallets before their history)
**Files to create:**
- `src/lib/storage/wallet-balance-history-idb.ts`

**Files to modify:**
- `src/lib/storage/wallet-balance-history.ts` — delegate to IDB implementation
- `src/lib/storage/migrate-from-localstorage.ts` — add `wallet_balance_history` migration block

**API diff on `walletBalanceHistoryRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `getAllIncludingInactive()` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `getById(id)` | `WalletBalanceHistory \| null` | `Promise<WalletBalanceHistory \| null>` |
| `getByWalletId(walletId)` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `create(input)` | `WalletBalanceHistory` | `Promise<WalletBalanceHistory>` |
| `update(id, patch)` | `WalletBalanceHistory` | `Promise<WalletBalanceHistory>` |
| `softDelete(id)` | `void` | `Promise<void>` |

**Callers that must add `await`:**
- `useWalletActions.ts` — `walletBalanceHistoryRepo.create(...)` calls in `handleCreate` and `handleUpdate`

**Verification:** Create a wallet with initial balance > 0 — history record appears in IDB `wallet_balance_history` store.

---

### Step 4: Migrate `transactions` store

**Depends on:** Step 2 (wallet balance ops write to `wallets`, which must be IDB by this step)
**Files to create:**
- `src/lib/storage/transactions-idb.ts`

**Files to modify:**
- `src/lib/storage/transactions.ts` — delegate to IDB
- `src/lib/storage/wallet-balance-ops.ts` — `applyDelta` becomes async; all four exported functions (`applyTransactionToWallet`, `rollbackTransactionFromWallet`, `applyLoanEntryToWallet`, `rollbackLoanEntryFromWallet`) become async
- `src/lib/stores/useTransactionStore.ts` — promote all actions to `async`, add `await` before every repo and wallet-balance-ops call
- `src/lib/storage/migrate-from-localstorage.ts` — add `transactions` migration block
- **IDB schema version bump to `2`**: add `by_dest_wallet_id` index on `transactions` store (upgrade callback handles version 1→2)

**API diff on `transactionsRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `Transaction[]` | `Promise<Transaction[]>` |
| `getAllIncludingInactive()` | `Transaction[]` | `Promise<Transaction[]>` |
| `getById(id)` | `Transaction \| null` | `Promise<Transaction \| null>` |
| `getByDate(date)` | `Transaction[]` | `Promise<Transaction[]>` — uses `by_date` index |
| `getByWalletId(walletId)` | `Transaction[]` | `Promise<Transaction[]>` — cursor over `by_wallet_id` + `by_dest_wallet_id`, merge |
| `create(input)` | `Transaction` | `Promise<Transaction>` |
| `update(id, patch)` | `Transaction` | `Promise<Transaction>` |
| `softDelete(id)` | `void` | `Promise<void>` |

**Note on `getByWalletId` with IndexedDB:** The current implementation filters both `wallet_id` and `destination_wallet_id` in one pass. In IDB, these are two separate index queries; merge the result sets in application code (dedup by `id`). This is the correct pattern — do not introduce a compound index.

**`wallet-balance-ops.ts` changes:**
All four exported functions become `async` and `await` the internal `applyDelta`. The `applyDelta` function itself becomes `async`, using `idbGet` + `idbPut` instead of `readKey`/`writeKey`.

**Callers that must add `await`:**
- `useTransactionStore.ts` — all action methods
- `useLoanStore.ts` — `applyLoanEntryToWallet`, `rollbackLoanEntryFromWallet` calls (Step 5 will handle Loan store, but `wallet-balance-ops` is shared)

**Verification:** Create income/expense/transfer transactions — wallet balance updates correctly, history intact, IDB stores show correct records.

---

### Step 5: Migrate `loan_counterparties` and `loan_entries` stores

**Depends on:** Step 4 (wallet-balance-ops is already async)
**Reason for grouping:** `loanEntriesRepo.softDeleteByCounterpartyId` and `useLoanCounterpartyStore.deleteCounterparty` operate across both stores atomically. Migrating them together avoids a half-migrated state where counterparties are in IDB but entries are still in localStorage.

**Files to create:**
- `src/lib/storage/loan-counterparties-idb.ts`
- `src/lib/storage/loan-entries-idb.ts`

**Files to modify:**
- `src/lib/storage/loan-counterparties.ts` — delegate to IDB
- `src/lib/storage/loan-entries.ts` — delegate to IDB; `softDeleteByCounterpartyId` becomes async using IDB index cursor
- `src/lib/stores/useLoanStore.ts` — promote all actions to `async`
- `src/lib/storage/migrate-from-localstorage.ts` — add `loan_counterparties` then `loan_entries` migration blocks (in this order, preserving the FK relationship)

**API diff on `loanCounterpartiesRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `LoanCounterparty[]` | `Promise<LoanCounterparty[]>` |
| `getAllIncludingInactive()` | `LoanCounterparty[]` | `Promise<LoanCounterparty[]>` |
| `getById(id)` | `LoanCounterparty \| null` | `Promise<LoanCounterparty \| null>` |
| `findByName(name)` | `LoanCounterparty \| null` | `Promise<LoanCounterparty \| null>` — full scan via `getAll()`, filter in JS |
| `create(input)` | `LoanCounterparty` | `Promise<LoanCounterparty>` |
| `update(id, patch)` | `LoanCounterparty` | `Promise<LoanCounterparty>` |
| `softDelete(id)` | `void` | `Promise<void>` |

**API diff on `loanEntriesRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `LoanEntry[]` | `Promise<LoanEntry[]>` |
| `getAllIncludingInactive()` | `LoanEntry[]` | `Promise<LoanEntry[]>` |
| `getById(id)` | `LoanEntry \| null` | `Promise<LoanEntry \| null>` |
| `getByCounterpartyId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` — uses `by_counterparty_id` index |
| `getByWalletId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` — uses `by_wallet_id` index |
| `create(input)` | `LoanEntry` | `Promise<LoanEntry>` |
| `update(id, patch)` | `LoanEntry` | `Promise<LoanEntry>` |
| `softDelete(id)` | `void` | `Promise<void>` |
| `softDeleteByCounterpartyId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` |

**Zustand stores that must go async:**
- `useLoanCounterpartyStore`: `loadCounterparties`, `findOrCreateCounterparty`, `renameCounterparty`, `markAsPaid`, `deleteCounterparty`, `isNameTaken`
- `useLoanEntryStore`: `loadEntries`, `loadEntriesForCounterparty`, `createEntry`, `updateEntry`, `deleteEntry`

**Verification:** Create loan entry, edit it, delete counterparty (cascade) — all IDB stores reflect correct state, wallet balances correct.

---

### Step 6: Migrate `custom_reports` store

**Depends on:** Step 1
**Note:** `custom_reports` has no foreign key relationships. It can technically be migrated any time after Step 1. Placed here for logical ordering.

**Files to create:**
- `src/lib/storage/custom-reports-idb.ts`

**Files to modify:**
- `src/lib/storage/custom-reports.ts` — delegate to IDB
- `src/lib/stores/useReportStore.ts` — promote all actions to `async`
- `src/lib/storage/migrate-from-localstorage.ts` — add `custom_reports` migration block

**API diff on `customReportsRepo`:**

| Method | Before | After |
|---|---|---|
| `getAll()` | `CustomReport[]` | `Promise<CustomReport[]>` |
| `getAllIncludingInactive()` | `CustomReport[]` | `Promise<CustomReport[]>` |
| `getById(id)` | `CustomReport \| null` | `Promise<CustomReport \| null>` |
| `findByName(name)` | `CustomReport \| null` | `Promise<CustomReport \| null>` — full scan, filter in JS |
| `create(input)` | `CustomReport` | `Promise<CustomReport>` |
| `update(id, patch)` | `CustomReport` | `Promise<CustomReport>` |
| `softDelete(id)` | `void` | `Promise<void>` |

**Verification:** Create, rename, delete custom report — IDB `custom_reports` store reflects changes.

---

### Step 7: Handle `anon_id`

**Depends on:** nothing
**Decision: keep `anon_id` in localStorage.**

Rationale:
- `anon_id` is a 36-byte string — no capacity concern.
- Reading it synchronously before any async IDB access lets `getOrCreateAnonId()` remain synchronous, which simplifies call sites throughout the repos (every `create()` method calls `getOrCreateAnonId()`).
- In Fase 2, `anon_id` will be replaced by an auth-issued user ID. There is no benefit to moving this 36-byte value to IDB.
- `useAppStore` (Zustand persist) already stores `anonId` in localStorage under the `app_state` key — this is the Zustand-managed copy. The `src/lib/bootstrap/anon-id.ts` value under key `anon_id` is the source of truth for the storage layer. Both can coexist.

**Files to modify:** none
**What to verify:** `getOrCreateAnonId()` still returns the same UUID after all other keys are migrated. Confirm `anon_id` localStorage key persists and is not removed by the migration runner.

---

### Step 8: Cleanup — remove localStorage implementations

**Depends on:** Steps 2–7 all verified in production for at least one release cycle
**This step is irreversible. Recommend user exports data (JSON backup) before deploying.**

**Files to delete:**
- `src/lib/storage/base.ts` (the original `readKey`/`writeKey` helpers)
- `src/lib/storage/wallets.ts` — replace with direct re-export from `wallets-idb.ts`
- `src/lib/storage/wallet-balance-history.ts` — replace with direct re-export from `wallet-balance-history-idb.ts`
- `src/lib/storage/transactions.ts` — replace with direct re-export from `transactions-idb.ts`
- `src/lib/storage/loan-counterparties.ts` — replace with direct re-export
- `src/lib/storage/loan-entries.ts` — replace with direct re-export
- `src/lib/storage/custom-reports.ts` — replace with direct re-export

**Files to modify:**
- `src/lib/storage/config.ts` — remove feature flag; IDB is now the only backend
- `src/lib/storage/migrate-from-localstorage.ts` — finalize; still kept for any users who skipped intermediate versions and need the migration
- Update `src/app/layout.tsx` or wherever migration runner is called — ensure `storage_version` check still gates the runner

**Verification:** No references to `readKey`/`writeKey` remain. `grep -r "readKey\|writeKey" src/` returns zero results. All 6 IDB stores are populated correctly.

---

## 9. Async Impact on Zustand Stores

**Summary of changes by store:**

| Store | File | Actions that become async |
|---|---|---|
| `useWalletStore` | `src/lib/stores/useWalletStore.ts` | `loadWallets`, `createWallet`, `updateWallet`, `softDeleteWallet` |
| `useTransactionStore` | `src/lib/stores/useTransactionStore.ts` | `loadTransactions`, `createTransaction`, `updateTransaction`, `softDeleteTransaction`, `refreshTransactions` |
| `useLoanCounterpartyStore` | `src/lib/stores/useLoanStore.ts` | `loadCounterparties`, `findOrCreateCounterparty`, `renameCounterparty`, `markAsPaid`, `deleteCounterparty` |
| `useLoanEntryStore` | `src/lib/stores/useLoanStore.ts` | `loadEntries`, `loadEntriesForCounterparty`, `createEntry`, `updateEntry`, `deleteEntry` |
| `useReportStore` | `src/lib/stores/useReportStore.ts` | `loadCustomReports`, `createCustomReport`, `updateCustomReport`, `softDeleteCustomReport` |
| `useAppStore` | `src/lib/stores/useAppStore.ts` | No change (Zustand persist, stays localStorage) |

**Important: Zustand v5 and async actions.** Zustand actions that `return` a value (e.g., `createWallet` returns `Wallet`) currently return synchronously. When these become `async`, callers that use the return value must `await` the action. Key callers:

- `useWalletActions.ts: handleCreate()` — `await createWallet(...)` → returned `wallet` used to create balance history and Balance Correction transaction
- `useWalletActions.ts: handleUpdate()` — `await updateWallet(...)` → returned value not used (patch is applied)
- `useTransactionStore.ts: updateTransaction()` — sequential `await rollbackTransactionFromWallet(old)` then `await applyTransactionToWallet(updated)` — must not reorder
- `useLoanCounterpartyStore: deleteCounterparty()` — loop `await rollbackLoanEntryFromWallet(entry)` for each entry before `await softDeleteByCounterpartyId(id)`

**`isNameTaken` special case.** Currently these methods on `useWalletStore` and `useLoanCounterpartyStore` are sync lookups against in-memory Zustand state (`get().wallets`), not repo calls. They do not need to become async — the state is already loaded in memory. This is correct and should remain sync.

**Cross-store call pattern.** `useTransactionStore` and `useLoanStore` both call `useWalletStore.getState().loadWallets()` after mutating wallet state. After migration this becomes `await useWalletStore.getState().loadWallets()`.

---

## 10. Testing Strategy

For each step, the following test types apply:

**Unit tests (per step):**
- New IDB repo file: test each method (getAll, getById, create, update, softDelete) with an in-memory IDB mock (use `fake-indexeddb` npm package in test env).
- Verify soft-delete sets `is_active=false` and updates `updated_at`.
- Verify SSR guard: call repo methods with `window` undefined — must return empty/no-op.

**Data migration tests:**
- Populate localStorage with known fixture data for the store being migrated.
- Run migration runner function.
- Assert IDB contains all records with correct field values.
- Assert localStorage key is removed after migration.
- Re-run migration runner — assert idempotent (no duplicates, no errors).

**Integration tests (Playwright — existing test infra):**
- After each step, run the existing E2E suite for the affected module.
- For Steps 2 and 4 (wallet + transactions), run the wallet-balance-ops integration scenario: create wallet → add income → add expense → delete transaction → verify balance.
- For Step 5 (loan), run counterparty delete cascade scenario — verify wallet balance rolls back correctly.

**Regression scope per step:**

| Step | Primary regression risk | Tests to run |
|---|---|---|
| 2 (wallets) | Wallet CRUD, balance display | Wallet module E2E |
| 3 (balance history) | Balance Correction creation | Wallet add/edit with balance E2E |
| 4 (transactions) | wallet-balance-ops, Transfer | Transaction CRUD, Transfer E2E, Report aggregation |
| 5 (loan) | Cascade delete, wallet side-effects | Loan CRUD, counterparty delete E2E |
| 6 (custom reports) | Report CRUD | Report module E2E |
| 8 (cleanup) | Full regression | All modules E2E |

---

## 11. Migration Impact for Fase 2 (Backend)

The IndexedDB schema maps cleanly to SQL tables. Each object store becomes a table; each IDB index becomes a SQL index or foreign key.

```sql
-- Example: transactions table (Fase 2)
CREATE TABLE transactions (
  id             UUID PRIMARY KEY,
  anon_id        UUID NOT NULL,
  type           VARCHAR(10) NOT NULL,  -- 'income' | 'expense' | 'transfer'
  wallet_id      UUID NOT NULL REFERENCES wallets(id),
  destination_wallet_id UUID REFERENCES wallets(id),
  amount         NUMERIC(18,2) NOT NULL,
  title          TEXT,
  category       TEXT,
  description    TEXT,
  transaction_date DATE NOT NULL,
  transaction_time TIME NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_transactions_anon_id ON transactions(anon_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

The async repo API is already the right shape for Fase 2: swapping the IDB calls for `fetch()` or a DB client call (e.g., Drizzle, Prisma) requires changing only `idb-client.ts` and the IDB repo implementations — the Zustand stores and UI components remain untouched.

The one non-obvious migration consideration: IDB stores `amount` and `balance` as JavaScript `Number`. For Fase 2, these must be stored as `NUMERIC(18,2)` to avoid floating-point precision loss. The existing `parseIDR` / `formatIDR` number handling should already sanitize display values, but the agent implementing the Fase 2 data export should confirm that no fractional cent values exist in IDB before migration.

---

## 12. UX Walkthrough

**First launch after update (existing user with localStorage data):**
1. App loads, root layout `useEffect` fires
2. `runStorageMigration()` detects `storage_version` is not `"idb_v1"`
3. Migration runs in background — no UI shown (data is small, typically < 200ms)
4. `storage_version` set to `"idb_v1"` in localStorage
5. Stores call `loadX()` as normal — now reading from IDB
6. User sees no difference

**First launch (new user):**
1. App loads, `storage_version` absent → migration runner finds empty localStorage arrays → no-op → sets `storage_version = "idb_v1"`
2. Normal first-run experience

**Error during migration:**
- If `openDB` fails (e.g., private browsing with strict IDB block), catch the error, log to console, and fall back to localStorage via the feature flag. The app degrades gracefully rather than showing a blank screen.
- Show a non-blocking toast: "Storage initialization failed. Using fallback mode." (via `sonner`, which is already in the dependency list)

**Edge cases:**
- **iOS Safari private mode:** IndexedDB is available in private mode on iOS 14+ but with a quota that resets on session end. PFinTrack's PWA install flow should warn users not to use private mode.
- **Storage quota exceeded:** IDB `put` will throw a `QuotaExceededError`. Catch in each repo write and surface via the existing toast system.
- **Concurrent tabs:** IDB `versionchange` event fires when a second tab opens with a newer DB version. Handle with `db.close()` in the `blocked` callback of `openDB`. This prevents the upgrade from being blocked by an older tab.

---

## 13. Open Questions

- [ ] Should the migration runner block app render (show a splash screen) or run silently in the background? Current recommendation is silent (migration is fast for typical data sizes), but if a user has 5,000+ transactions the 200ms estimate may be longer on low-end devices. An implementation agent should benchmark with 2,000 and 10,000 records before deciding.
- [ ] The `useAppStore` uses Zustand `persist` which writes to localStorage under key `app_state`. This key is outside the 7 data keys and is fine to keep. Confirm with the team whether `app_state` should eventually move to IDB (it contains `showDecimals` preference — not data, just UI state). Recommendation: keep in localStorage.
- [ ] `fake-indexeddb` is needed for unit tests. Is the project's test runner configured (no `jest.config.ts` or `vitest.config.ts` was found in the codebase scan)? The implementation agent for Step 1 must set up the test infrastructure before Steps 2–8 can be tested.
- [ ] The Playwright test suite exists (`@playwright/test` is in devDependencies) but no `tests/` directory was found in the codebase scan. Implementation agent should locate or scaffold E2E test files for the affected modules.

---

## 14. Out of Scope

- Encrypted storage (at-rest encryption of IDB data) — Fase 2 concern
- Multi-tab real-time sync (BroadcastChannel / SharedWorker) — separate proposal if needed
- Cloud backup to IDB snapshots — separate proposal
- Any change to the 7 data key contract's semantic meaning — this proposal only changes the physical storage medium
- Changing field names, types, or adding new fields to existing record types
- The `wallet-balance-ops.ts` concurrency model — still sequential single-call, no transactional IDB transactions introduced here (IDB transactions are scoped to the `openDB` callback; the current architecture does read+write in sequence and that is sufficient)

---

## 15. Implementation Roadmap

### Step execution order (mandatory sequence)

```
Step 1 (DB setup) → Step 2 (wallets) → Step 3 (balance history)
                                      ↘
                     Step 4 (transactions) ← depends on Step 2
                                      ↘
                     Step 5 (loan, both stores) ← depends on Step 4
                                      ↘
                     Step 6 (custom_reports) ← can run after Step 1
                                      ↘
                     Step 7 (anon_id — decision: keep in LS)
                                      ↘
                     Step 8 (cleanup — after production validation)
```

Steps 1 → 2 → 3 must run in order. Steps 4 and 5 must run in order. Step 6 can run after Step 1 (no dependency on 2–5), but for simplicity of testing, execute after Step 4. Step 7 is a no-code decision, document only.

### Agents to spawn (one per step)

Spawn `storage-layer-engineer` for Steps 1–8. Each spawn gets the agent prompt from Section 16.

After Step 8: spawn `/audit-spec` and `data-consistency-auditor` for full compliance check.

---

## 16. Agent Execution Prompts

Paste each prompt verbatim when spawning the implementation agent for that step.

---

### Step 1 Agent Prompt

```
You are implementing Step 1 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Goal: Install the `idb` npm package and create the IndexedDB database singleton with all 6 object stores and their indexes. No data is read or written yet.

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/idb-client.ts
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/config.ts

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/package.json — add "idb": "^8.0.2"

Spec for idb-client.ts:
- Import `openDB` from "idb"
- Database name: "pfintrack_db", initial version: 1
- Create these 6 object stores in the upgrade callback (keyPath: "id" on all):
  1. "wallets" — indexes: by_anon_id (anon_id), by_is_active (is_active)
  2. "wallet_balance_history" — indexes: by_anon_id, by_wallet_id (wallet_id), by_is_active
  3. "transactions" — indexes: by_anon_id, by_wallet_id (wallet_id), by_dest_wallet_id (destination_wallet_id), by_date (transaction_date), by_is_active
  4. "loan_counterparties" — indexes: by_anon_id, by_is_active
  5. "loan_entries" — indexes: by_anon_id, by_counterparty_id (counterparty_id), by_wallet_id (wallet_id), by_is_active
  6. "custom_reports" — indexes: by_anon_id, by_is_active
- Export `getDB(): Promise<IDBPDatabase<PFinTrackDB>>` with a module-level cache variable (singleton pattern)
- SSR guard: if typeof window === "undefined", throw an Error("IDB not available in SSR")
- Export typed helper functions:
  - `idbGetAll<T>(storeName: StoreName): Promise<T[]>`
  - `idbGetAllByIndex<T>(storeName: StoreName, indexName: string, value: IDBValidKey): Promise<T[]>`
  - `idbGet<T>(storeName: StoreName, id: string): Promise<T | undefined>`
  - `idbPut<T>(storeName: StoreName, record: T): Promise<void>`
  - `idbDelete(storeName: StoreName, id: string): Promise<void>` (not used in current repos, but useful for future)
  - `idbPutAll<T>(storeName: StoreName, records: T[]): Promise<void>` (bulk insert for migration runner)
- Use TypeScript strict mode. Import types from @/lib/types/* for the DB type parameter.

Spec for config.ts:
- Export: `export const STORAGE_BACKEND = process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb";`
- Export type: `export type StorageBackend = "idb" | "localstorage";`

Verification: Run `pnpm build` (or `npm run build`). Confirm TypeScript compiles with no errors. Do not run the app yet.

Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 2 Agent Prompt

```
You are implementing Step 2 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Prerequisite: Step 1 must be complete. Confirm src/lib/storage/idb-client.ts exists before proceeding.

Goal: Migrate the `wallets` localStorage key to IndexedDB. The `walletsRepo` API surface stays identical but all methods become async (return Promise).

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/wallets-idb.ts
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/migrate-from-localstorage.ts (stub with wallets block)

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/wallets.ts — delegate to wallets-idb.ts when STORAGE_BACKEND === "idb"
- /Users/dy/Projects/javascript/pfintrack/src/lib/stores/useWalletStore.ts — all actions become async
- /Users/dy/Projects/javascript/pfintrack/src/features/wallet/hooks/useWalletActions.ts — add await before store calls

For wallets-idb.ts: implement walletsRepo using idb-client.ts helpers. getAll() uses idbGetAllByIndex("wallets", "by_is_active", true). getAllIncludingInactive() uses idbGetAll("wallets"). getById() uses idbGet(). create() builds the full Wallet record with crypto.randomUUID(), calls getOrCreateAnonId(), then idbPut(). update() reads existing via idbGet(), merges patch, updates updated_at, calls idbPut(). softDelete() reads existing, sets is_active=false, updated_at=now, calls idbPut().

For migrate-from-localstorage.ts: export async function runStorageMigration(): Promise<void>. Check localStorage.getItem("storage_version"). If "idb_v1", return early. Else: migrate wallets (read JSON array, putAll to IDB, removeItem from localStorage). At end of all migrations (Step 6 will add more blocks): set localStorage.setItem("storage_version", "idb_v1").

Wire the migration runner: in /Users/dy/Projects/javascript/pfintrack/src/app/layout.tsx, add a client-side useEffect that calls runStorageMigration() on mount.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full schema and async impact details.
```

---

### Step 3 Agent Prompt

```
You are implementing Step 3 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Prerequisite: Steps 1 and 2 must be complete.

Goal: Migrate the `wallet_balance_history` localStorage key to IndexedDB.

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/wallet-balance-history-idb.ts

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/wallet-balance-history.ts — delegate to IDB implementation
- /Users/dy/Projects/javascript/pfintrack/src/features/wallet/hooks/useWalletActions.ts — add await before walletBalanceHistoryRepo.create() calls
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/migrate-from-localstorage.ts — add wallet_balance_history migration block before the "storage_version" set call

All walletBalanceHistoryRepo methods become async. getByWalletId() uses idbGetAllByIndex("wallet_balance_history", "by_wallet_id", walletId) then filters is_active in JS. getAll() uses idbGetAllByIndex with "by_is_active"/true.

The migration block: read localStorage.getItem("wallet_balance_history"), parse, putAll to IDB, removeItem.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 4 Agent Prompt

```
You are implementing Step 4 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Prerequisite: Steps 1, 2, and 3 must be complete.

Goal: Migrate the `transactions` localStorage key to IndexedDB. Also make wallet-balance-ops.ts async, since it writes to the wallets IDB store.

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/transactions-idb.ts

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/transactions.ts — delegate to IDB
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/wallet-balance-ops.ts — applyDelta becomes async; all 4 exported functions become async
- /Users/dy/Projects/javascript/pfintrack/src/lib/stores/useTransactionStore.ts — all actions become async, add await before repo and wallet-balance-ops calls
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/migrate-from-localstorage.ts — add transactions migration block

For transactions-idb.ts: getByDate() uses idbGetAllByIndex("transactions", "by_date", date) then filters is_active. getByWalletId() runs two index queries (by_wallet_id and by_dest_wallet_id), merges by deduplicating on id, filters is_active.

For wallet-balance-ops.ts: applyDelta must await idbGet("wallets", walletId), compute new balance, await idbPut("wallets", updatedWallet). All 4 exported functions (applyTransactionToWallet, rollbackTransactionFromWallet, applyLoanEntryToWallet, rollbackLoanEntryFromWallet) become async and await applyDelta.

In useTransactionStore.ts: updateTransaction must await rollback before update, await apply after. The cross-store call useWalletStore.getState().loadWallets() becomes await useWalletStore.getState().loadWallets(). Same for createTransaction and softDeleteTransaction.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 5 Agent Prompt

```
You are implementing Step 5 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Prerequisite: Steps 1–4 must be complete (wallet-balance-ops.ts is already async).

Goal: Migrate `loan_counterparties` and `loan_entries` localStorage keys to IndexedDB in a single step (they share a foreign key relationship via counterparty_id).

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/loan-counterparties-idb.ts
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/loan-entries-idb.ts

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/loan-counterparties.ts — delegate to IDB
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/loan-entries.ts — delegate to IDB
- /Users/dy/Projects/javascript/pfintrack/src/lib/stores/useLoanStore.ts — all actions in both useLoanCounterpartyStore and useLoanEntryStore become async
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/migrate-from-localstorage.ts — add loan_counterparties block then loan_entries block (in this order)

For softDeleteByCounterpartyId in loan-entries-idb.ts: use idbGetAllByIndex("loan_entries", "by_counterparty_id", counterpartyId), filter is_active, update each to is_active=false + updated_at=now, idbPut each, return affected entries.

In useLoanCounterpartyStore.deleteCounterparty: the loop over entries must await each rollbackLoanEntryFromWallet call. await softDeleteByCounterpartyId. await softDelete counterparty.

In useLoanEntryStore.createEntry: await applyLoanEntryToWallet(entry). await loanCounterpartiesRepo.update (bump updated_at). await useWalletStore.getState().loadWallets().

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 6 Agent Prompt

```
You are implementing Step 6 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Prerequisite: Step 1 must be complete. Steps 2–5 recommended but not technically required for this store.

Goal: Migrate the `custom_reports` localStorage key to IndexedDB.

Files to create:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/custom-reports-idb.ts

Files to modify:
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/custom-reports.ts — delegate to IDB
- /Users/dy/Projects/javascript/pfintrack/src/lib/stores/useReportStore.ts — all actions become async
- /Users/dy/Projects/javascript/pfintrack/src/lib/storage/migrate-from-localstorage.ts — add custom_reports migration block

findByName() in custom-reports-idb.ts: use idbGetAll("custom_reports"), filter is_active and name match in JS (same logic as current localStorage version).

After this step, migrate-from-localstorage.ts should have migration blocks for all 6 stores and should set localStorage.setItem("storage_version", "idb_v1") at the end.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 7 Agent Prompt

```
You are implementing Step 7 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

Decision: anon_id stays in localStorage. No code changes required.

Action: Verify that the migration runner in migrate-from-localstorage.ts does NOT remove the "anon_id" localStorage key. Confirm getOrCreateAnonId() in src/lib/bootstrap/anon-id.ts still reads from localStorage.getItem("anon_id"). No edits should be needed — this step is documentation and verification only.

Also verify: useAppStore (src/lib/stores/useAppStore.ts) persists "app_state" to localStorage via Zustand persist. Confirm this key is not touched by the migration runner.

Document this decision as a comment at the top of src/lib/storage/migrate-from-localstorage.ts:
"anon_id: intentionally kept in localStorage. See PROP-0001 §Step 7."

Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### Step 8 Agent Prompt

```
You are implementing Step 8 of PROP-0001 (localStorage → IndexedDB migration) for PFinTrack.

WARNING: This step is IRREVERSIBLE. Only execute after Steps 1–7 have been in production for at least one release cycle and verified with no regressions.

Goal: Remove all localStorage-backed repo code and the STORAGE_BACKEND feature flag.

Actions:
1. Delete src/lib/storage/base.ts (readKey/writeKey helpers — no longer used)
2. Simplify each of these files to be a direct re-export from their -idb counterpart:
   - src/lib/storage/wallets.ts → re-export from ./wallets-idb
   - src/lib/storage/wallet-balance-history.ts → re-export from ./wallet-balance-history-idb
   - src/lib/storage/transactions.ts → re-export from ./transactions-idb
   - src/lib/storage/loan-counterparties.ts → re-export from ./loan-counterparties-idb
   - src/lib/storage/loan-entries.ts → re-export from ./loan-entries-idb
   - src/lib/storage/custom-reports.ts → re-export from ./custom-reports-idb
3. Remove STORAGE_BACKEND env check from all repo files and from src/lib/storage/config.ts (or delete config.ts entirely)
4. Run: grep -r "readKey\|writeKey\|STORAGE_BACKEND\|localstorage" src/lib/storage/ — expect zero results
5. Run pnpm build — must compile with zero TypeScript errors
6. Run full Playwright E2E suite — must pass with zero regressions

After verification, update the status of PROP-0001 in tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md from "Draft" to "Implemented". Add the implementation date and commit hash to the Decision Log.

Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-06 | Draft created | Initial design discussion — full codebase read completed before writing |
| 2026-05-06 | `idb` package chosen over raw IndexedDB API | Typed, Promise-based, ~1 kB gzipped, jakearchibald/idb is the industry standard thin wrapper |
| 2026-05-06 | Option A (async repos) chosen over Option B (sync facade) | Sync facade trades short-term convenience for long-term stale-cache risk and a second rewrite at Fase 2 |
| 2026-05-06 | `anon_id` kept in localStorage | 36-byte string, no capacity concern; keeping it sync simplifies every repo `create()` call; replaced by auth ID in Fase 2 anyway |
| 2026-05-06 | `app_state` (Zustand persist) kept in localStorage | UI preference state, not data; outside the 7-key contract; not a migration concern |
| 2026-05-06 | `storage_version` migration flag in localStorage | Operational metadata (not data records); same category as `app_state`; does not violate the 7-key data contract |
| 2026-05-06 | Steps 5 (loan counterparties + entries) grouped | FK relationship between counterparties and entries makes half-migration unsafe; atomic grouping avoids orphaned entries in a mixed-storage state |
