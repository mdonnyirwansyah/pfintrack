# Technical Specification Document
## Migrasi Storage Layer: localStorage → IndexedDB

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.0.0
**Tanggal:** 2026-05-14
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Scope:** Cross-cutting — Wallet, Transactions, Loan, Report
**Proposal Asal:** `tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md`

---

> **Catatan Scope:**
> Dokumen ini mendefinisikan spesifikasi teknis untuk migrasi lapisan penyimpanan data PFinTrack dari `localStorage` ke IndexedDB. Cakupan:
> 1. Latar belakang dan rasional migrasi
> 2. Skema IndexedDB (nama database, object store, indexes)
> 3. Kontrak API repository (semua metode menjadi async)
> 4. 8 langkah migrasi: file yang terdampak, kriteria verifikasi, dan prompt agen siap-pakai
> 5. Protokol migrasi data satu-kali (detect → copy → delete)
> 6. Feature flag dan mekanisme rollback
> 7. Kontrak key `storage_version`
> 8. Invariant lintas-cutting yang harus dipertahankan selama migrasi

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **1.0.0** | **2026-05-14** | **Baseline release. Konsolidasi seluruh revisi sebelumnya (v1.0–v1.1) menjadi versi rilis pertama. Mencakup: rasional migrasi localStorage→IndexedDB (PROP-0001), skema IDB `pfintrack_db` dengan 6 object store, kontrak API async per repo, 8 langkah migrasi berurutan, protokol migrasi data satu-kali (idempotent), feature flag `NEXT_PUBLIC_STORAGE_BACKEND`, mekanisme rollback, kontrak key `storage_version`, dan status implementasi (sudah diimplementasikan di codebase).** |
| **1.1.0** | **2026-05-14** | **Field `currency` dan `sort_order` yang dihapus dari tipe `Wallet` bersifat dead data di IDB lama — tidak menyebabkan error dan didokumentasikan sebagai known behavior (§8.9).** |
| **1.3.0** | **2026-05-15** | **Bug fix: E2E test helper `tests/e2e/helpers/storage.ts` (`clearIDB`) sebelumnya membuat object store tanpa index saat DB belum pernah dibuka oleh aplikasi. Konsekuensinya, `loanEntriesIdbRepo.getByWalletId` (dan repo lain yang memakai index) melempar `NotFoundError: Failed to execute 'index' on 'IDBObjectStore'` karena schema upgrade aplikasi tidak pernah berjalan (versi sudah cocok). Fix: helper sekarang punya tabel `STORE_INDEXES` yang mirror schema di `src/lib/storage/idb-client.ts` dan membuat index pada `onupgradeneeded`. Aturan: setiap penambahan/perubahan index di `idb-client.ts` WAJIB direplikasi ke helper test agar query repo via index tetap valid di lingkungan E2E. ✅ FIXED 2026-05-15.** |
| **1.2.0** | **2026-05-14** | **Optimasi performa & atomicity query IndexedDB. (1) Tambah helper `idbUpdate` (atomic read-modify-write dalam 1 readwrite transaction) dan `idbUpdateMany` (multi-id RMW dalam 1 transaction) di `idb-client.ts` — eliminate race window antara `idbGet` + `idbPut` terpisah. (2) Semua `update()` / `softDelete()` di repo IDB (`wallets`, `transactions`, `loan_entries`, `loan_counterparties`, `custom_reports`, `wallet_balance_history`) refactor pakai `idbUpdate`. (3) `softDeleteByCounterpartyId` pakai `idbUpdateMany` — cascade soft-delete jadi atomic. (4) `applyTransactionToWallet` & `rollbackTransactionFromWallet` untuk type `transfer` pakai `applyTransferDeltas` yang menulis ke source & destination wallet dalam 1 readwrite transaction (tidak ada lagi half-applied transfer jika tab ditutup mid-operation). (5) Tambah method `transactionsRepo.getByDateRange(start, end)` pakai `IDBKeyRange.bound` pada index `by_date` — IndexedDB skip out-of-range rows di level index, jauh lebih murah daripada `getAll()` + filter JS. Dipakai di `app/report/detail/page.tsx`. Lihat §3.3 dan §11.** |

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Package `idb` (jakearchibald/idb) versi `^8.0.2` digunakan sebagai thin wrapper typed atas IndexedDB API. Ukuran ~1 kB gzipped, tanpa runtime dependency. |
| 2 | IndexedDB tersedia di semua target browser: Android WebView (PWA) dan iOS Safari 15.4+. |
| 3 | Semua kode IDB harus di-guard dengan `typeof window !== "undefined"` — pola yang sama dengan `base.ts` saat ini — karena Next.js merender di server. |
| 4 | Zustand v5 (sudah ada di project) mendukung async actions secara native tanpa perubahan library. |
| 5 | Key `storage_version` di localStorage adalah metadata operasional (bukan data finansial), setara dengan `app_state` — tidak melanggar kontrak 7-key data. |
| 6 | Key `anon_id` dipertahankan di localStorage secara permanen. Lihat §7 (Step 7). |
| 7 | `app_state` (Zustand persist) dipertahankan di localStorage. Ini adalah state preferensi UI, bukan data finansial. |
| 8 | Schema version IDB dimulai dari `1` dan akan di-bump ke `2` saat Step 4 menambahkan index `by_dest_wallet_id` pada store `transactions`. |

---

## 1. Latar Belakang & Rasional

### 1.1 Masalah dengan localStorage

Data PFinTrack saat ini tersimpan di `localStorage` di bawah 7 key tetap. Keterbatasan yang mendorong migrasi:

| Keterbatasan | Dampak |
|---|---|
| Quota keras ~5 MB per origin | Pengguna dengan riwayat transaksi bertahun-tahun (1.000+ record) dapat mendekati batas ini |
| Baca sinkron + parse JSON seluruh array | `getAll()` pada 2.000 baris transaksi memaksa full parse meski hanya 1 record yang dibutuhkan |
| Memblokir main thread | Mengurangi responsivitas pada perangkat Android kelas bawah — target utama PFinTrack |

### 1.2 Keunggulan IndexedDB

| Aspek | IndexedDB |
|---|---|
| Quota | ~50% free disk space (umumnya 500 MB–10 GB di mobile) |
| Baca parsial | Cursor-based: hanya record yang dibutuhkan yang di-parse |
| Blocking | Async, non-blocking main thread |
| Indexed queries | Query berdasarkan index tanpa full scan |

### 1.3 Strategi yang Dipilih

**Option A — Incremental store-by-store, repo API dipromosikan ke async.**

Alasan pilihan Option A atas Option B (sync facade):

| Aspek | Option A (Dipilih) | Option B (Ditolak) |
|---|---|---|
| Repo API | Async (menggambarkan realita) | Sync facade dengan in-memory cache |
| Risiko stale data | Rendah — await write bersifat durable | Sedang — cache invalidation berpotensi edge case |
| Persiapan Fase 2 | Bersih — async sudah terpasang | Perlu rewrite ulang saat Fase 2 |
| Main-thread blocking | Dihilangkan | Tidak (cache load tetap sync) |

Biaya async surface change adalah biaya jujur dari adopsi IndexedDB. Menunda via Option B hanya memindahkan masalah ke Fase 2.

### 1.4 Arsitektur Lapisan (Setelah Migrasi)

```
┌─────────────────────────────────────────────────────────────────┐
│  Zustand Store (async actions)                                   │
│  e.g. loadWallets(): Promise<void>                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ awaits
┌────────────────────────▼────────────────────────────────────────┐
│  Repository  (async API, nama metode tidak berubah)              │
│  e.g. walletsRepo.getAll(): Promise<Wallet[]>                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────────┐
│  src/lib/storage/idb-client.ts                                   │
│  getDB() → IDBPDatabase (singleton, SSR-safe)                    │
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

---

## 2. Skema IndexedDB

**Nama database:** `pfintrack_db`
**Schema version awal:** `1` (di-bump ke `2` pada Step 4 — lihat §4.4)

### 2.1 Definisi Object Store dan Indexes

| Object Store | Key Path | Indexes |
|---|---|---|
| `wallets` | `id` | `by_anon_id` (field: `anon_id`), `by_is_active` (field: `is_active`) |
| `wallet_balance_history` | `id` | `by_anon_id`, `by_wallet_id` (field: `wallet_id`), `by_is_active` |
| `transactions` | `id` | `by_anon_id`, `by_wallet_id` (field: `wallet_id`), `by_dest_wallet_id` (field: `destination_wallet_id`), `by_date` (field: `transaction_date`), `by_is_active` |
| `loan_counterparties` | `id` | `by_anon_id`, `by_is_active` |
| `loan_entries` | `id` | `by_anon_id`, `by_counterparty_id` (field: `counterparty_id`), `by_wallet_id` (field: `wallet_id`), `by_is_active` |
| `custom_reports` | `id` | `by_anon_id`, `by_is_active` |

Semua store menggunakan `keyPath: "id"` (string UUID). Tidak ada auto-increment.

### 2.2 Rasional Index

| Index | Kegunaan |
|---|---|
| `by_anon_id` | Wajib untuk partisi data saat sinkronisasi server Fase 2 |
| `by_is_active` | Baca active-only records tanpa full scan |
| `by_wallet_id` | Mendukung `getByWalletId()` yang ada di beberapa repo |
| `by_counterparty_id` | Mendukung `getByCounterpartyId()` dan `softDeleteByCounterpartyId()` |
| `by_date` | Mendukung `transactionsRepo.getByDate()` dan agregasi range tanggal di Report |
| `by_dest_wallet_id` | Mendukung cross-reference `getByWalletId()` pada transfer destination |

### 2.3 Catatan `getByWalletId` pada Transactions

Store `transactions` memiliki dua field wallet: `wallet_id` (source) dan `destination_wallet_id` (transfer destination). Keduanya memiliki index terpisah. Query `getByWalletId` harus menjalankan dua index query dan menggabungkan hasilnya di application code (dedup berdasarkan `id`). Compound index tidak digunakan — pola ini benar dan tidak perlu diubah.

---

## 3. Kontrak API Repository (Async)

Semua metode repo yang saat ini mengembalikan `T` atau `T[]` secara sinkron, setelah migrasi mengembalikan `Promise<T>` atau `Promise<T[]>`. **Nama metode dan bentuk parameter tidak berubah.**

### 3.1 `walletsRepo`

| Metode | Sebelum (localStorage) | Sesudah (IndexedDB) |
|---|---|---|
| `getAll()` | `Wallet[]` | `Promise<Wallet[]>` |
| `getAllIncludingInactive()` | `Wallet[]` | `Promise<Wallet[]>` |
| `getById(id)` | `Wallet \| null` | `Promise<Wallet \| null>` |
| `create(input)` | `Wallet` | `Promise<Wallet>` |
| `update(id, patch)` | `Wallet` | `Promise<Wallet>` |
| `softDelete(id)` | `void` | `Promise<void>` |

### 3.2 `walletBalanceHistoryRepo`

| Metode | Sebelum | Sesudah |
|---|---|---|
| `getAll()` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `getAllIncludingInactive()` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `getById(id)` | `WalletBalanceHistory \| null` | `Promise<WalletBalanceHistory \| null>` |
| `getByWalletId(walletId)` | `WalletBalanceHistory[]` | `Promise<WalletBalanceHistory[]>` |
| `create(input)` | `WalletBalanceHistory` | `Promise<WalletBalanceHistory>` |
| `update(id, patch)` | `WalletBalanceHistory` | `Promise<WalletBalanceHistory>` |
| `softDelete(id)` | `void` | `Promise<void>` |

### 3.3 `transactionsRepo`

| Metode | Sebelum | Sesudah | Catatan IDB |
|---|---|---|---|
| `getAll()` | `Transaction[]` | `Promise<Transaction[]>` | |
| `getAllIncludingInactive()` | `Transaction[]` | `Promise<Transaction[]>` | |
| `getById(id)` | `Transaction \| null` | `Promise<Transaction \| null>` | |
| `getByDate(date)` | `Transaction[]` | `Promise<Transaction[]>` | Gunakan index `by_date` |
| `getByDateRange(start, end)` | n/a (baru di v1.2.0) | `Promise<Transaction[]>` | `IDBKeyRange.bound(start, end)` pada index `by_date` — engine skip out-of-range rows tanpa deserialize. Inklusif kedua ujung. |
| `getByWalletId(walletId)` | `Transaction[]` | `Promise<Transaction[]>` | Dua index query → merge → dedup by `id` |
| `create(input)` | `Transaction` | `Promise<Transaction>` | |
| `update(id, patch)` | `Transaction` | `Promise<Transaction>` | |
| `softDelete(id)` | `void` | `Promise<void>` | |

### 3.4 `loanCounterpartiesRepo`

| Metode | Sebelum | Sesudah | Catatan IDB |
|---|---|---|---|
| `getAll()` | `LoanCounterparty[]` | `Promise<LoanCounterparty[]>` | |
| `getAllIncludingInactive()` | `LoanCounterparty[]` | `Promise<LoanCounterparty[]>` | |
| `getById(id)` | `LoanCounterparty \| null` | `Promise<LoanCounterparty \| null>` | |
| `findByName(name)` | `LoanCounterparty \| null` | `Promise<LoanCounterparty \| null>` | Full scan via `getAll()`, filter di JS |
| `create(input)` | `LoanCounterparty` | `Promise<LoanCounterparty>` | |
| `update(id, patch)` | `LoanCounterparty` | `Promise<LoanCounterparty>` | |
| `softDelete(id)` | `void` | `Promise<void>` | |

### 3.5 `loanEntriesRepo`

| Metode | Sebelum | Sesudah | Catatan IDB |
|---|---|---|---|
| `getAll()` | `LoanEntry[]` | `Promise<LoanEntry[]>` | |
| `getAllIncludingInactive()` | `LoanEntry[]` | `Promise<LoanEntry[]>` | |
| `getById(id)` | `LoanEntry \| null` | `Promise<LoanEntry \| null>` | |
| `getByCounterpartyId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` | Gunakan index `by_counterparty_id` |
| `getByWalletId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` | Gunakan index `by_wallet_id` |
| `create(input)` | `LoanEntry` | `Promise<LoanEntry>` | |
| `update(id, patch)` | `LoanEntry` | `Promise<LoanEntry>` | |
| `softDelete(id)` | `void` | `Promise<void>` | |
| `softDeleteByCounterpartyId(id)` | `LoanEntry[]` | `Promise<LoanEntry[]>` | Cursor via `by_counterparty_id`, update setiap record |

### 3.6 `customReportsRepo`

| Metode | Sebelum | Sesudah | Catatan IDB |
|---|---|---|---|
| `getAll()` | `CustomReport[]` | `Promise<CustomReport[]>` | |
| `getAllIncludingInactive()` | `CustomReport[]` | `Promise<CustomReport[]>` | |
| `getById(id)` | `CustomReport \| null` | `Promise<CustomReport \| null>` | |
| `findByName(name)` | `CustomReport \| null` | `Promise<CustomReport \| null>` | Full scan via `getAll()`, filter di JS |
| `create(input)` | `CustomReport` | `Promise<CustomReport>` | |
| `update(id, patch)` | `CustomReport` | `Promise<CustomReport>` | |
| `softDelete(id)` | `void` | `Promise<void>` | |

### 3.7 Dampak Async terhadap Zustand Stores

| Store | File | Actions yang Menjadi Async |
|---|---|---|
| `useWalletStore` | `src/lib/stores/useWalletStore.ts` | `loadWallets`, `createWallet`, `updateWallet`, `softDeleteWallet` |
| `useTransactionStore` | `src/lib/stores/useTransactionStore.ts` | `loadTransactions`, `createTransaction`, `updateTransaction`, `softDeleteTransaction`, `refreshTransactions` |
| `useLoanCounterpartyStore` | `src/lib/stores/useLoanStore.ts` | `loadCounterparties`, `findOrCreateCounterparty`, `renameCounterparty`, `markAsPaid`, `deleteCounterparty` |
| `useLoanEntryStore` | `src/lib/stores/useLoanStore.ts` | `loadEntries`, `loadEntriesForCounterparty`, `createEntry`, `updateEntry`, `deleteEntry` |
| `useReportStore` | `src/lib/stores/useReportStore.ts` | `loadCustomReports`, `createCustomReport`, `updateCustomReport`, `softDeleteCustomReport` |
| `useAppStore` | `src/lib/stores/useAppStore.ts` | Tidak berubah (Zustand persist, tetap di localStorage) |

> ⚠️ **Perhatian:** `isNameTaken` pada `useWalletStore` dan `useLoanCounterpartyStore` adalah sync lookup terhadap state Zustand in-memory (`get().wallets`), bukan repo call. Metode ini **tidak perlu** menjadi async — tetap sync.

**Pola cross-store yang berubah:**

`useTransactionStore` dan `useLoanStore` memanggil `useWalletStore.getState().loadWallets()` setelah mutasi wallet. Setelah migrasi, panggilan ini menjadi:
```
await useWalletStore.getState().loadWallets()
```

**Urutan await kritis di `updateTransaction`:**
```
await rollbackTransactionFromWallet(oldTransaction)
// jangan dibalik — rollback harus selesai sebelum apply
await applyTransactionToWallet(updatedTransaction)
```

---

## 4. Delapan Langkah Migrasi

### 4.1 Urutan Eksekusi (Wajib)

```
Step 1 (DB setup)
      ↓
Step 2 (wallets)
      ↓
Step 3 (wallet_balance_history)  ←── depends on Step 2
      ↓
Step 4 (transactions)            ←── depends on Step 2
      ↓
Step 5 (loan: counterparties + entries) ←── depends on Step 4
      ↓
Step 6 (custom_reports)          ←── depends on Step 1 (dapat dieksekusi lebih awal, tapi disederhanakan setelah Step 4)
      ↓
Step 7 (anon_id — decision: tetap di localStorage, verifikasi saja)
      ↓
Step 8 (cleanup — setelah validasi di production minimal 1 release cycle)
```

Steps 1→2→3 harus berurutan. Steps 4 dan 5 harus berurutan. Step 6 hanya bergantung pada Step 1, tapi untuk kemudahan testing dieksekusi setelah Step 4. Step 7 adalah keputusan tanpa perubahan kode.

### 4.2 Step 1 — Instalasi `idb`, Singleton DB, Definisi Schema

**Bergantung pada:** tidak ada
**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/idb-client.ts` | Singleton `openDB` dengan semua 6 object store dan semua indexes. Export `getDB()` dan helper functions. |
| `src/lib/storage/config.ts` | Feature flag `STORAGE_BACKEND`. |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `package.json` | Tambah `"idb": "^8.0.2"` (atau latest v8) |

**Spesifikasi `idb-client.ts`:**

- `openDB("pfintrack_db", 1, { upgrade(db) { /* buat 6 store + semua index */ } })`
- Export `getDB(): Promise<IDBPDatabase<PFinTrackDB>>` dengan cache module-level (singleton pattern)
- SSR guard: jika `typeof window === "undefined"`, throw `Error("IDB not available in SSR")`
- Export typed helper functions:

| Helper | Signature |
|---|---|
| `idbGetAll<T>` | `(storeName: StoreName): Promise<T[]>` |
| `idbGetAllByIndex<T>` | `(storeName: StoreName, indexName: string, value: IDBValidKey): Promise<T[]>` |
| `idbGet<T>` | `(storeName: StoreName, id: string): Promise<T \| undefined>` |
| `idbPut<T>` | `(storeName: StoreName, record: T): Promise<void>` |
| `idbPutAll<T>` | `(storeName: StoreName, records: T[]): Promise<void>` (bulk insert untuk migration runner) |
| `idbDelete` | `(storeName: StoreName, id: string): Promise<void>` (untuk kebutuhan masa depan) |

**Spesifikasi `config.ts`:**
```
export const STORAGE_BACKEND = process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb";
export type StorageBackend = "idb" | "localstorage";
```

**Kriteria verifikasi:** `pnpm build` berhasil tanpa error TypeScript. DevTools > Application > IndexedDB menampilkan `pfintrack_db` dengan 6 store. Tidak ada data yang dibaca atau ditulis di step ini.

**Prompt agen siap-pakai:**
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
  - `idbDelete(storeName: StoreName, id: string): Promise<void>`
  - `idbPutAll<T>(storeName: StoreName, records: T[]): Promise<void>`
- Use TypeScript strict mode. Import types from @/lib/types/* for the DB type parameter.

Spec for config.ts:
- Export: `export const STORAGE_BACKEND = process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb";`
- Export type: `export type StorageBackend = "idb" | "localstorage";`

Verification: Run `pnpm build`. Confirm TypeScript compiles with no errors. Do not run the app yet.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### 4.3 Step 2 — Migrasi Store `wallets`

**Bergantung pada:** Step 1
**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/wallets-idb.ts` | Implementasi async `walletsRepo` berbasis IDB |
| `src/lib/storage/migrate-from-localstorage.ts` | Stub migration runner + blok migrasi `wallets` |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/wallets.ts` | Delegasi ke `wallets-idb.ts` saat `STORAGE_BACKEND === "idb"` |
| `src/lib/stores/useWalletStore.ts` | Semua actions menjadi async |
| `src/features/wallet/hooks/useWalletActions.ts` | Tambah `await` sebelum setiap store call |

**Spesifikasi `wallets-idb.ts`:**
- `getAll()`: `idbGetAllByIndex("wallets", "by_is_active", true)`
- `getAllIncludingInactive()`: `idbGetAll("wallets")`
- `getById()`: `idbGet("wallets", id)`
- `create()`: bangun record `Wallet` lengkap dengan `crypto.randomUUID()`, panggil `getOrCreateAnonId()`, lalu `idbPut()`
- `update()`: baca record via `idbGet()`, merge patch, update `updated_at`, panggil `idbPut()`
- `softDelete()`: baca record, set `is_active=false` dan `updated_at=now`, panggil `idbPut()`

**Spesifikasi `migrate-from-localstorage.ts`:**

```
export async function runStorageMigration(): Promise<void> {
  if (localStorage.getItem("storage_version") === "idb_v1") return;
  // blok wallets (Step 2):
  //   baca JSON array dari localStorage, putAll ke IDB, removeItem
  // [blok lain ditambahkan di Steps 3–6]
  // di akhir semua blok:
  localStorage.setItem("storage_version", "idb_v1");
}
```

**Wiring migration runner:** Tambahkan `useEffect` client-side di `src/app/layout.tsx` yang memanggil `runStorageMigration()` pada mount, setelah `getOrCreateAnonId()`.

**API yang berubah (lihat §3.1).**

**Callers yang harus menambahkan `await`:**
- `useWalletActions.ts` — `handleCreate`, `handleUpdate`, `handleDelete`
- `useTransactionStore.ts` — panggilan `useWalletStore.getState().loadWallets()` di akhir setiap action
- `useLoanStore.ts` — panggilan `useWalletStore.getState().loadWallets()`

**Kriteria verifikasi:** Buat wallet via UI — record muncul di IDB store `wallets`, bukan di localStorage key `wallets`.

**Prompt agen siap-pakai:**
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

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### 4.4 Step 3 — Migrasi Store `wallet_balance_history`

**Bergantung pada:** Step 2 (wallets harus sudah di IDB sebelum history-nya)
**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/wallet-balance-history-idb.ts` | Implementasi async `walletBalanceHistoryRepo` berbasis IDB |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/wallet-balance-history.ts` | Delegasi ke implementasi IDB |
| `src/features/wallet/hooks/useWalletActions.ts` | Tambah `await` sebelum `walletBalanceHistoryRepo.create()` |
| `src/lib/storage/migrate-from-localstorage.ts` | Tambahkan blok migrasi `wallet_balance_history` sebelum pemanggilan `setItem("storage_version")` |

**Spesifikasi `wallet-balance-history-idb.ts`:**
- `getAll()`: `idbGetAllByIndex("wallet_balance_history", "by_is_active", true)`
- `getByWalletId(walletId)`: `idbGetAllByIndex("wallet_balance_history", "by_wallet_id", walletId)`, filter `is_active` di JS

**API yang berubah (lihat §3.2).**

**Kriteria verifikasi:** Buat wallet dengan initial balance > 0 — record history muncul di IDB store `wallet_balance_history`.

**Prompt agen siap-pakai:**
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

### 4.5 Step 4 — Migrasi Store `transactions` + `wallet-balance-ops` Async

**Bergantung pada:** Steps 1, 2, dan 3
**Schema version IDB di-bump ke `2`** pada step ini: upgrade callback menangani versi 1→2 dengan menambahkan index `by_dest_wallet_id` pada store `transactions`.

**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/transactions-idb.ts` | Implementasi async `transactionsRepo` berbasis IDB |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/transactions.ts` | Delegasi ke implementasi IDB |
| `src/lib/storage/wallet-balance-ops.ts` | `applyDelta` menjadi async; keempat fungsi export menjadi async |
| `src/lib/stores/useTransactionStore.ts` | Semua actions menjadi async, tambah `await` |
| `src/lib/storage/migrate-from-localstorage.ts` | Tambahkan blok migrasi `transactions` |

**Spesifikasi `wallet-balance-ops.ts` setelah migrasi:**

Fungsi `applyDelta` menjadi async menggunakan `idbGet` + `idbPut` menggantikan `readKey`/`writeKey`. Keempat fungsi export berikut menjadi async dan `await` `applyDelta` di dalamnya:

| Fungsi | Status |
|---|---|
| `applyTransactionToWallet` | Menjadi `async` |
| `rollbackTransactionFromWallet` | Menjadi `async` |
| `applyLoanEntryToWallet` | Menjadi `async` |
| `rollbackLoanEntryFromWallet` | Menjadi `async` |

**Spesifikasi `transactions-idb.ts`:**
- `getByDate(date)`: `idbGetAllByIndex("transactions", "by_date", date)`, filter `is_active` di JS
- `getByWalletId(walletId)`: dua query index (`by_wallet_id` dan `by_dest_wallet_id`), merge hasil, dedup berdasarkan `id`, filter `is_active` di JS

**API yang berubah (lihat §3.3).**

**Kriteria verifikasi:** Buat income/expense/transfer — wallet balance terupdate dengan benar, history tetap, semua IDB stores menampilkan record yang benar.

**Prompt agen siap-pakai:**
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

IDB schema version bump to 2: the upgrade callback must handle version 1→2 by adding the by_dest_wallet_id index on the transactions store.

For transactions-idb.ts: getByDate() uses idbGetAllByIndex("transactions", "by_date", date) then filters is_active. getByWalletId() runs two index queries (by_wallet_id and by_dest_wallet_id), merges by deduplicating on id, filters is_active.

For wallet-balance-ops.ts: applyDelta must await idbGet("wallets", walletId), compute new balance, await idbPut("wallets", updatedWallet). All 4 exported functions (applyTransactionToWallet, rollbackTransactionFromWallet, applyLoanEntryToWallet, rollbackLoanEntryFromWallet) become async and await applyDelta.

In useTransactionStore.ts: updateTransaction must await rollback before update, await apply after. The cross-store call useWalletStore.getState().loadWallets() becomes await useWalletStore.getState().loadWallets().

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### 4.6 Step 5 — Migrasi Store `loan_counterparties` dan `loan_entries`

**Bergantung pada:** Step 4 (`wallet-balance-ops` sudah async)
**Alasan dikelompokkan:** `loanEntriesRepo.softDeleteByCounterpartyId` dan `useLoanCounterpartyStore.deleteCounterparty` beroperasi lintas kedua store secara atomik. Migrasi terpisah akan menciptakan half-migrated state di mana counterparties ada di IDB tapi entries masih di localStorage.

**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/loan-counterparties-idb.ts` | Implementasi async `loanCounterpartiesRepo` berbasis IDB |
| `src/lib/storage/loan-entries-idb.ts` | Implementasi async `loanEntriesRepo` berbasis IDB |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/loan-counterparties.ts` | Delegasi ke IDB |
| `src/lib/storage/loan-entries.ts` | Delegasi ke IDB; `softDeleteByCounterpartyId` menjadi async menggunakan cursor index IDB |
| `src/lib/stores/useLoanStore.ts` | Semua actions di `useLoanCounterpartyStore` dan `useLoanEntryStore` menjadi async |
| `src/lib/storage/migrate-from-localstorage.ts` | Tambahkan blok `loan_counterparties` lalu `loan_entries` (urutan ini wajib — FK relationship) |

**Spesifikasi `softDeleteByCounterpartyId` di `loan-entries-idb.ts`:**
- `idbGetAllByIndex("loan_entries", "by_counterparty_id", counterpartyId)`
- Filter `is_active`, update setiap record ke `is_active=false` + `updated_at=now`
- `idbPut` setiap record, return affected entries

**Pattern delete cascade di `useLoanCounterpartyStore.deleteCounterparty`:**
```
// Urutan wajib:
for (const entry of entries) {
  await rollbackLoanEntryFromWallet(entry)
}
await softDeleteByCounterpartyId(counterpartyId)
await softDelete(counterpartyId)  // counterparty
```

**API yang berubah (lihat §3.4 dan §3.5).**

**Kriteria verifikasi:** Buat loan entry, edit, hapus counterparty (cascade) — semua IDB store mencerminkan state yang benar, wallet balance tepat.

**Prompt agen siap-pakai:**
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

### 4.7 Step 6 — Migrasi Store `custom_reports`

**Bergantung pada:** Step 1 (dapat dieksekusi lebih awal secara teknis, tapi diletakkan setelah Step 4 untuk kesederhanaan testing)
**Catatan:** `custom_reports` tidak memiliki foreign key relationship. Setelah step ini, `migrate-from-localstorage.ts` akan memiliki blok migrasi untuk semua 6 store.

**Files yang dibuat:**

| File | Keterangan |
|---|---|
| `src/lib/storage/custom-reports-idb.ts` | Implementasi async `customReportsRepo` berbasis IDB |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/custom-reports.ts` | Delegasi ke IDB |
| `src/lib/stores/useReportStore.ts` | Semua actions menjadi async |
| `src/lib/storage/migrate-from-localstorage.ts` | Tambahkan blok migrasi `custom_reports` — setelah step ini `setItem("storage_version", "idb_v1")` dipanggil di akhir fungsi |

**Spesifikasi `findByName()` di `custom-reports-idb.ts`:**
- `idbGetAll("custom_reports")`, filter `is_active` dan name match di JS (logika yang sama dengan versi localStorage saat ini)

**API yang berubah (lihat §3.6).**

**Kriteria verifikasi:** Buat, rename, hapus custom report — IDB store `custom_reports` mencerminkan perubahan.

**Prompt agen siap-pakai:**
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

findByName() in custom-reports-idb.ts: use idbGetAll("custom_reports"), filter is_active and name match in JS.

After this step, migrate-from-localstorage.ts should have migration blocks for all 6 stores and should set localStorage.setItem("storage_version", "idb_v1") at the end.

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

### 4.8 Step 7 — Keputusan `anon_id`: Tetap di localStorage

**Bergantung pada:** tidak ada
**Perubahan kode:** tidak ada

**Keputusan:** `anon_id` dipertahankan di `localStorage` secara permanen.

| Alasan | Detail |
|---|---|
| Kapasitas | 36-byte string — tidak ada masalah kapasitas |
| Sinkronisasi | Membaca secara sinkron sebelum IDB access memungkinkan `getOrCreateAnonId()` tetap sync, menyederhanakan call site di seluruh repo (setiap `create()` memanggil `getOrCreateAnonId()`) |
| Fase 2 | `anon_id` akan digantikan auth-issued user ID di Fase 2. Tidak ada manfaat memindahkan string 36-byte ini ke IDB |

**Tindakan verifikasi:**
- Konfirmasi migration runner di `migrate-from-localstorage.ts` **tidak** menghapus key `anon_id`
- Konfirmasi `getOrCreateAnonId()` di `src/lib/bootstrap/anon-id.ts` masih membaca dari `localStorage.getItem("anon_id")`
- Konfirmasi `useAppStore` mempersist `app_state` ke localStorage via Zustand persist dan tidak disentuh migration runner
- Dokumentasikan keputusan sebagai komentar di atas fungsi di `migrate-from-localstorage.ts`: `// anon_id: intentionally kept in localStorage. See PROP-0001 §Step 7.`

**Prompt agen siap-pakai:**
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

### 4.9 Step 8 — Cleanup: Hapus Implementasi localStorage

**Bergantung pada:** Steps 2–7 sudah diverifikasi di production minimal 1 release cycle

> ⚠️ **Peringatan: Step ini IRREVERSIBLE.** Rekomendasikan kepada user untuk melakukan export data (JSON backup) sebelum step ini di-deploy.

**Files yang dihapus:**

| File | Keterangan |
|---|---|
| `src/lib/storage/base.ts` | Helper `readKey`/`writeKey` lama — tidak lagi digunakan |

**Files yang disederhanakan (menjadi direct re-export):**

| File | Menjadi |
|---|---|
| `src/lib/storage/wallets.ts` | Re-export dari `./wallets-idb` |
| `src/lib/storage/wallet-balance-history.ts` | Re-export dari `./wallet-balance-history-idb` |
| `src/lib/storage/transactions.ts` | Re-export dari `./transactions-idb` |
| `src/lib/storage/loan-counterparties.ts` | Re-export dari `./loan-counterparties-idb` |
| `src/lib/storage/loan-entries.ts` | Re-export dari `./loan-entries-idb` |
| `src/lib/storage/custom-reports.ts` | Re-export dari `./custom-reports-idb` |

**Files yang dimodifikasi:**

| File | Perubahan |
|---|---|
| `src/lib/storage/config.ts` | Hapus feature flag; IDB adalah satu-satunya backend. Atau hapus file jika tidak ada export lain. |
| `src/lib/storage/migrate-from-localstorage.ts` | Finalisasi: tetap dipertahankan untuk user yang melewati versi intermediate dan memerlukan migrasi |

**Kriteria verifikasi:**
- `grep -r "readKey\|writeKey\|STORAGE_BACKEND" src/lib/storage/` → zero results
- `pnpm build` → zero TypeScript errors
- Full Playwright E2E suite → zero regressions

**Prompt agen siap-pakai:**
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
4. Run: grep -r "readKey\|writeKey\|STORAGE_BACKEND" src/lib/storage/ — expect zero results
5. Run pnpm build — must compile with zero TypeScript errors
6. Run full Playwright E2E suite — must pass with zero regressions

Read the actual current file contents before editing. Read PROP-0001 at tech-spec-docs/proposals/PROP-0001-migration-localstorage-to-indexeddb.md for full context.
```

---

## 5. Protokol Migrasi Data Satu-Kali

### 5.1 Gambaran Umum

Saat app load pertama kali setelah update, migration runner memeriksa localStorage key `storage_version`. Logika:

```
App load → runStorageMigration() dipanggil dari useEffect di layout.tsx
              ↓
   Cek localStorage.getItem("storage_version")
       ↓ "idb_v1"                ↓ null atau tidak ada
   Return early (sudah          Jalankan migrasi data
   selesai atau user baru)
              ↓
   Baca 6 data array dari localStorage
              ↓
   Buka pfintrack_db via IDB singleton
              ↓
   put() setiap record ke object store yang sesuai
   (idbPut bersifat idempotent — aman dijalankan ulang)
              ↓
   removeItem() setiap localStorage data key setelah write dikonfirmasi
              ↓
   localStorage.setItem("storage_version", "idb_v1")
```

### 5.2 Idempotency

Migration runner bersifat idempotent. Jika terganggu (tab tertutup di tengah proses), pemanggilan ulang pada load berikutnya akan:
- Re-baca localStorage key yang belum dihapus
- Re-tulis record ke IDB (IDB `put` overwrite record identik — tidak berbahaya)
- Lanjutkan dari titik terakhir

### 5.3 Urutan Migrasi dalam Runner

Urutan blok migrasi dalam `runStorageMigration()` harus memperhatikan relasi foreign key:

| Urutan | Store | Alasan |
|---|---|---|
| 1 | `wallets` | Tidak ada dependency |
| 2 | `wallet_balance_history` | Merujuk ke `wallet_id` |
| 3 | `transactions` | Merujuk ke `wallet_id` |
| 4 | `loan_counterparties` | Tidak ada dependency eksternal |
| 5 | `loan_entries` | Merujuk ke `counterparty_id` dan `wallet_id` |
| 6 | `custom_reports` | Tidak ada dependency |

### 5.4 Penanganan Error

| Skenario | Penanganan |
|---|---|
| `openDB` gagal (mis. private browsing dengan IDB diblokir) | Catch error, log ke console, fallback ke localStorage via feature flag |
| `QuotaExceededError` pada IDB `put` | Catch di setiap repo write, surface melalui toast system yang sudah ada |
| Tab tertutup di tengah migrasi | Runner idempotent — jalankan ulang pada load berikutnya |
| Tab kedua membuka DB versi lebih baru | Handle `versionchange` event: panggil `db.close()` di callback `blocked` pada `openDB` |

### 5.5 UX Migrasi

**Pengguna lama (ada data di localStorage):**
1. App load, `runStorageMigration()` berjalan di background — tidak ada UI yang ditampilkan
2. Data berukuran kecil, umumnya < 200ms
3. `storage_version` di-set ke `"idb_v1"`
4. Stores memanggil `loadX()` seperti biasa — sekarang membaca dari IDB
5. User tidak melihat perbedaan

**Pengguna baru:**
1. `storage_version` tidak ada → runner menemukan localStorage array kosong → no-op → set `storage_version = "idb_v1"`
2. Pengalaman first-run normal

> ⚠️ **Open Question:** Apakah migration runner harus memblokir render (tampilkan splash screen) atau berjalan senyap di background? Rekomendasi saat ini: senyap. Tapi jika user memiliki 5.000+ transaksi, estimasi 200ms bisa lebih lama di perangkat kelas bawah. Implementation agent harus melakukan benchmark dengan 2.000 dan 10.000 record sebelum memutuskan.

---

## 6. Feature Flag & Mekanisme Rollback

### 6.1 Feature Flag

```
// src/lib/storage/config.ts (dibuat di Step 1)
export const STORAGE_BACKEND =
  process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb"; // "idb" | "localstorage"
```

Setiap file repo mengimpor dari `idb-base.ts` atau `base.ts` yang ada berdasarkan flag ini.

### 6.2 Rollback Per Step

Steps 1–7 masing-masing memiliki jalur rollback. Implementasi localStorage **tidak dihapus** hingga Step 8.

**Cara rollback step mana pun:**
1. Set `NEXT_PUBLIC_STORAGE_BACKEND=localstorage` di `.env.local`
2. Redeploy
3. Tidak ada kehilangan data — localStorage data dipertahankan selama Steps 1–7

### 6.3 Irreversibility Step 8

Step 8 bersifat irreversible setelah localStorage keys dihapus. **Sebelum Step 8 di-deploy**, rekomendasikan kepada user untuk melakukan export data (JSON backup, sudah tersedia di Settings app).

---

## 7. Kontrak Key `storage_version`

| Aspek | Detail |
|---|---|
| Key name | `storage_version` |
| Storage | `localStorage` |
| Kategori | Metadata operasional (bukan data finansial) — setara dengan `app_state` |
| Melanggar 7-key contract? | Tidak — 7-key contract hanya berlaku untuk key data finansial |
| Nilai saat belum migrasi | `null` (key tidak ada) |
| Nilai setelah migrasi selesai | `"idb_v1"` |
| Cara dibaca | `localStorage.getItem("storage_version")` |
| Cara di-set | `localStorage.setItem("storage_version", "idb_v1")` — hanya di akhir `runStorageMigration()` setelah semua 6 store selesai |
| Diubah oleh siapa? | Hanya `src/lib/storage/migrate-from-localstorage.ts` |
| Dibaca oleh siapa? | Hanya `src/lib/storage/migrate-from-localstorage.ts` |

---

## 8. Invariant Lintas-Cutting Selama Migrasi

Seluruh invariant berikut harus dipertahankan di semua 8 steps.

### 8.1 Field Wajib Record

Setiap record di setiap store tetap wajib memiliki field:

| Field | Tipe | Constraint |
|---|---|---|
| `id` | String (UUID v4) | Wajib, unik, digunakan sebagai IDB keyPath |
| `anon_id` | String (UUID v4) | Wajib, merujuk ke `localStorage['anon_id']` |
| `is_active` | Boolean | Wajib — soft delete flag |
| `created_at` | String (ISO 8601 UTC) | Wajib |
| `updated_at` | String (ISO 8601 UTC) | Wajib, diupdate setiap perubahan |

Tidak ada field yang ditambahkan atau dihapus selama migrasi storage layer ini.

### 8.2 Soft Delete

Pola soft delete tidak berubah:
- `softDelete()` tetap set `is_active=false` dan `updated_at=now`
- Record tidak dihapus secara fisik dari IDB
- Query `getAll()` dan semua filtered query hanya mengembalikan record dengan `is_active=true`

### 8.3 Aturan `wallet_balance_history`

Aturan penulisan `wallet_balance_history` (hanya pada add wallet dengan balance > 0, atau edit balance manual) **tidak berubah**. Migrasi storage layer tidak mengubah business logic sama sekali.

### 8.4 Balance Correction Pattern

Pattern Balance Correction (buat transaksi income/expense saat edit balance wallet) tidak berubah. Lihat global spec §6.3.

### 8.5 Producer-Consumer Contract

Kontrak producer-consumer antar modul (lihat global spec §6.2) tidak berubah. Yang berubah hanya sifat panggilan: dari sync menjadi async.

### 8.6 Penyimpanan Angka dan Tanggal

- Angka disimpan sebagai plain JavaScript `Number` (bukan formatted string) — tidak berubah
- Tanggal disimpan dalam format ISO 8601 — tidak berubah

### 8.7 SSR Safety

Semua kode IDB harus di-wrap dengan guard `typeof window !== "undefined"`. Pola yang sama dengan `base.ts` saat ini. Migration runner dipanggil hanya dari `useEffect` (client-side).

### 8.8 Kompatibilitas Browser

IndexedDB tersedia di:
- Android WebView (PWA): semua versi modern
- iOS Safari: 15.4+
- Chrome/Firefox desktop: semua versi modern

PWA install flow sebaiknya memperingatkan user agar tidak menggunakan private mode (iOS Safari private mode memiliki quota IDB yang reset pada akhir sesi).

### 8.9 Atomicity Read-Modify-Write (v1.2.0)

Semua mutasi yang membaca record lalu menulis kembali (`update`, `softDelete`, dan side-effect wallet balance) **wajib** memakai helper atomic `idbUpdate` atau `idbUpdateMany` dari `idb-client.ts`. Pattern lama `idbGet` + (mutate) + `idbPut` membuka race window kecil di mana proses lain (tab kedua, service worker, atau even handler bersamaan) bisa menulis di antara `get` dan `put` — yang mengakibatkan lost update pada record finansial.

Aturan:
- ✅ `idbUpdate<T>(store, id, (existing) => next)` — RMW satu record dalam 1 transaction
- ✅ `idbUpdateMany<T>(store, ids, (existing, id) => next | null)` — RMW banyak record dalam 1 transaction (commit semua atau tidak sama sekali). Pakai untuk transfer wallet dan cascade soft-delete.
- ❌ `idbGet` + `idbPut` berurutan untuk mutasi record yang sama — dilarang di kode baru
- `idbGet` masih boleh dipakai untuk **read-only** lookup (mis. `getById`)

Wallet transfer secara khusus: `applyTransactionToWallet` dan `rollbackTransactionFromWallet` untuk `type === "transfer"` memanggil `applyTransferDeltas(sourceId, sourceDelta, destId, destDelta)` yang menulis kedua wallet dalam 1 IDB readwrite transaction. Jika tab ditutup atau mati listrik di tengah operasi, **kedua write commit atau tidak sama sekali** — tidak akan ada lagi state "source sudah didebet tapi destination belum dikredit" yang dulu mungkin terjadi.

### 8.10 Backward-Compatibility: Field Dihapus dari Skema

#### Field `currency` dan `sort_order` (dihapus dari tipe `Wallet`)

Field `currency` dan `sort_order` dihapus dari interface `Wallet` di TypeScript. Data lama di IDB yang masih memiliki field ini tidak menyebabkan error — IndexedDB menyimpan object JS as-is, dan field extra diabaikan oleh aplikasi. Field-field ini akan tetap tersimpan sebagai dead data sampai user mengedit wallet tersebut (saat itu `put()` akan menulis object baru tanpa field lama). Ini adalah behavior yang acceptable dan tidak memerlukan cleanup aktif.

---

## 9. Pemetaan ke Fase 2 (SQL Migration)

Setiap IDB object store memetakan langsung ke tabel SQL. Setiap IDB index menjadi SQL index atau foreign key.

| IDB Object Store | Tabel SQL Fase 2 | Catatan |
|---|---|---|
| `wallets` | `wallets` | Langsung, 1:1 |
| `wallet_balance_history` | `wallet_balance_history` | Langsung, 1:1 |
| `transactions` | `transactions` | Langsung, 1:1 |
| `loan_counterparties` | `loan_counterparties` | Langsung, 1:1 |
| `loan_entries` | `loan_entries` | Langsung, 1:1 |
| `custom_reports` | `custom_reports` | Langsung, 1:1 |

**Async repo API adalah bentuk yang tepat untuk Fase 2:** mengganti IDB calls dengan `fetch()` atau database client (Drizzle, Prisma) hanya memerlukan perubahan pada `idb-client.ts` dan implementasi repo IDB — Zustand stores dan komponen UI tidak perlu disentuh.

**Catatan floating-point:** IDB menyimpan `amount` dan `balance` sebagai JavaScript `Number`. Untuk Fase 2, nilai ini harus disimpan sebagai `NUMERIC(18,2)` untuk menghindari precision loss. Implementation agent Fase 2 harus mengonfirmasi tidak ada fractional cent values di IDB sebelum migrasi.

---

## 10. Strategi Testing

| Jenis Test | Scope | Tool |
|---|---|---|
| Unit test per repo IDB | Setiap metode (getAll, getById, create, update, softDelete), SSR guard, soft delete semantics | `fake-indexeddb` npm package |
| Unit test migration runner | Populate localStorage → run runner → assert IDB contains all records → assert localStorage key removed → re-run → assert idempotent | `fake-indexeddb` + jsdom |
| Integration test | Skenario wallet-balance-ops (Step 2+4), cascade delete loan (Step 5) | Playwright |
| Regression per step | Lihat tabel di bawah | Playwright |

**Scope regresi per step:**

| Step | Risiko Regresi Utama | Test yang Dijalankan |
|---|---|---|
| 2 (wallets) | Wallet CRUD, balance display | Wallet module E2E |
| 3 (balance history) | Balance Correction creation | Wallet add/edit with balance E2E |
| 4 (transactions) | wallet-balance-ops, Transfer | Transaction CRUD, Transfer E2E, Report aggregation |
| 5 (loan) | Cascade delete, wallet side-effects | Loan CRUD, counterparty delete E2E |
| 6 (custom reports) | Report CRUD | Report module E2E |
| 8 (cleanup) | Full regression | All modules E2E |

> ⚠️ **Open Question:** Package `fake-indexeddb` diperlukan untuk unit tests. Verifikasi apakah project test runner sudah dikonfigurasi (tidak ada `jest.config.ts` atau `vitest.config.ts` ditemukan saat proposal dibuat). Implementation agent untuk Step 1 harus menyiapkan test infrastructure sebelum Steps 2–8 dapat di-test.

---

## 11. Struktur File Baru (Ringkasan)

| File | Dibuat di Step | Keterangan |
|---|---|---|
| `src/lib/storage/idb-client.ts` | 1 | Singleton DB + typed helpers |
| `src/lib/storage/config.ts` | 1 | Feature flag `STORAGE_BACKEND` |
| `src/lib/storage/wallets-idb.ts` | 2 | Wallet repo async |
| `src/lib/storage/migrate-from-localstorage.ts` | 2 | Migration runner (diperbarui di Steps 3–6) |
| `src/lib/storage/wallet-balance-history-idb.ts` | 3 | Balance history repo async |
| `src/lib/storage/transactions-idb.ts` | 4 | Transactions repo async |
| `src/lib/storage/loan-counterparties-idb.ts` | 5 | Loan counterparties repo async |
| `src/lib/storage/loan-entries-idb.ts` | 5 | Loan entries repo async |
| `src/lib/storage/custom-reports-idb.ts` | 6 | Custom reports repo async |

**File yang dihapus di Step 8:** `src/lib/storage/base.ts`

---

## 12. Catatan untuk Tim Developer

1. **Baca PROP-0001 sebelum memulai implementasi.** Proposal memuat context lengkap, keputusan desain, dan open questions yang belum dijawab.

2. **Urutan step adalah wajib.** Jangan melewati langkah atau mengeksekusi dalam urutan berbeda — dependency antar step bersifat hard.

3. **Feature flag adalah safety net, bukan pengganti testing.** Setiap step harus diverifikasi di browser sebelum melanjutkan ke step berikutnya.

4. **Step 8 adalah keputusan product, bukan hanya teknis.** Harus ada persetujuan eksplisit bahwa semua user sudah melalui migration runner sebelum localStorage fallback dihapus.

5. **`wallet-balance-ops.ts` adalah shared file lintas modul.** Perubahan di Step 4 berdampak ke Transactions dan Loan — kedua store harus diverifikasi setelah Step 4 selesai.

6. **Demo mode data (`injectDemoData()`/`clearDemoData()`)** menulis dan menghapus dari 6 localStorage key data. Setelah migrasi, fungsi-fungsi ini harus diperbarui untuk menulis dan menghapus dari IDB — ini bukan bagian dari Steps 1–8 dan harus ditangani sebagai task terpisah.

---

---

## 13. Optimasi Query Performance (v1.2.0)

### 13.1 Atomic Read-Modify-Write Helpers

`src/lib/storage/idb-client.ts` mengekspor dua helper baru untuk eliminate race window pada mutasi yang membaca-mengubah-menulis:

| Helper | Signature | Use Case |
|---|---|---|
| `idbUpdate<T>` | `(store, id, updater) => Promise<T \| null>` | RMW satu record dalam 1 readwrite transaction. Return `null` jika record tidak ada. |
| `idbUpdateMany<T>` | `(store, ids, updater) => Promise<void>` | RMW banyak record dalam 1 readwrite transaction. Updater dipanggil per-id; return `null` untuk skip. Atomic — semua commit atau tidak sama sekali. |

**Implementasi (ringkas):**
```ts
export async function idbUpdate<T>(store, id, updater) {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  const existing = await tx.store.get(id);
  if (!existing) { await tx.done; return null; }
  const next = updater(existing);
  await tx.store.put(next);
  await tx.done;
  return next;
}
```

### 13.2 Range Query via `IDBKeyRange`

`transactionsRepo.getByDateRange(startDate, endDate)` menggunakan `IDBKeyRange.bound(startDate, endDate)` pada index `by_date`:

```ts
const range = IDBKeyRange.bound(startDate, endDate);
const records = await db.getAllFromIndex("transactions", "by_date", range);
```

IndexedDB skip semua row di luar range pada level index, jadi cost-nya `O(matching rows)` bukan `O(total rows)`. Dipakai di `app/report/detail/page.tsx` untuk monthly/custom report detail — page sebelumnya memanggil `getAll()` lalu filter di JS, sekarang langsung range query.

Helper baru `idbGetAllByRange<T>(store, indexName, range)` di `idb-client.ts` mengeksposnya secara generic — repo lain bisa pakai pattern yang sama (mis. `loan_entries` per periode).

### 13.3 Atomic Wallet Transfer

`wallet-balance-ops.ts` punya helper internal `applyTransferDeltas(sourceId, sourceDelta, destId, destDelta)` yang menulis kedua wallet dalam 1 readwrite transaction via `idbUpdateMany`. Digunakan oleh `applyTransactionToWallet` dan `rollbackTransactionFromWallet` untuk type `transfer`. Memastikan tidak ada state "source sudah didebet tapi destination belum dikredit" jika tab crash atau ditutup mid-operation.

### 13.4 Refactor Repo IDB

Semua method `update()` dan `softDelete()` di IDB repo (`wallets`, `transactions`, `loan_entries`, `loan_counterparties`, `custom_reports`, `wallet_balance_history`) sudah refactor pakai `idbUpdate`. `loanEntriesIdbRepo.softDeleteByCounterpartyId` pakai `idbUpdateMany` untuk cascade atomic.

### 13.5 Hal yang Belum Dioptimasi (Backlog)

- **Compound index `[is_active, transaction_date]`** untuk skip soft-deleted di level index. Saat ini masih filter `t.is_active` di JS setelah getAll/range query. Worthwhile saat dataset transaction >5k atau ratio deleted >10%.
- **`getByWalletId` dua-index query + dedup** masih digunakan. Sudah `Promise.all`, micro-optimasi (skip kalau dataset <5k).
- **`wallet_balance_history` append-only**, tidak ada cleanup. Tumbuh proporsional ke jumlah manual balance edit (jarang).

---

*— End of Technical Specification: Migrasi Storage Layer localStorage → IndexedDB (v1.2.0) —*
