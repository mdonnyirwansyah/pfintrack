# Personal Finance Manager (pfintrack)

Mobile-first Next.js (App Router) personal finance app. **Frontend-only**, all data in **IndexedDB** (`pfintrack_db`). Anonymous via UUID v4 (`anon_id`). Migration-ready to Fase 2 (backend + auth).

## Source of Truth

All implementation MUST follow `tech-spec-docs/`:
- `tech-spec-global-architecture.md` — read first, defines shared layout, design tokens, cross-module contracts
- `tech-spec-module-wallet.md` — fondasi data
- `tech-spec-module-transactions.md` — income/expense/transfer
- `tech-spec-module-loan.md` — give/get utang-piutang
- `tech-spec-module-report.md` — agregat realtime/monthly/custom
- `tech-spec-migration-indexeddb.md` — storage migration: localStorage → IndexedDB (PROP-0001)
- `tech-spec-feature-product-tour.md` — onboarding tour

## ⚠️ Spec Sync Wajib

**Setiap kali kamu melakukan perubahan pada kode, kamu WAJIB untuk langsung memperbarui dokumen tech spec yang relevan agar selalu sinkron.**

Berlaku untuk semua perubahan: penambahan fitur, perbaikan bug, refactor, perubahan tipe data, perubahan UI, perubahan route, perubahan terminologi, dll. Lakukan dalam turn yang sama dengan perubahan kode — jangan tunda.

Aturan praktis:
1. **Setelah edit kode**, identifikasi dokumen tech spec mana yang terkait (per modul atau global)
2. **Update bagian yang relevan**: tabel komponen, route map, schema data, asumsi teknis, Known Issues, dll
3. **Kalau bug** yang difix terdokumentasi di "Known Implementation Issues", ubah statusnya jadi ✅ FIXED dengan tanggal hari ini
4. **Kalau ada fitur/file/komponen baru yang belum ada di spec**, tambahkan section/baris baru
5. **Kalau ada gap yang tidak bisa diselesaikan saat itu juga**, dokumentasikan sebagai Known Issue agar traceable
6. **Sumber kebenaran tetap codebase** — kalau spec dan kode konflik, ikuti kode dan koreksi spec

## Critical Invariants

1. **Storage: IndexedDB** (`pfintrack_db`) untuk 6 object stores: `wallets`, `wallet_balance_history`, `transactions`, `loan_counterparties`, `loan_entries`, `custom_reports`. **localStorage** hanya untuk flags: `pfintrack_anon_id`, `pfintrack_welcomed`, `tour_completed`
2. **Every record has**: `id` (UUID v4), `anon_id`, `is_active` (soft delete), `created_at`, `updated_at`
3. **Numbers**: stored as plain JS Number, displayed via `Intl.NumberFormat('id-ID')` with 2 decimals
4. **Dates**: stored ISO 8601, displayed per spec §4.2 (English read-only, Indonesia in form inputs)
5. **`wallet_balance_history`** only logged on **manual edit**, NEVER on transaction/loan side-effects (§6.3)
6. **Computed-on-the-fly**: never cache aggregates (totals, summaries, reports)
7. **Producer-Consumer** rules in §6.2 are mandatory — wallet.balance updated by Transactions & Loan with rollback on edit/delete
8. **Soft delete** only — set `is_active=false`, never remove from storage
9. **Color tokens**: `#2196F3` primary blue, `#A6D5F2` light blue, `#4CAF50` positive, `#F44336` negative, `#FF9800` accent
10. **5 bottom nav tabs**: Transactions · Wallet · Loan · Report · Settings (urutan di nav)

## Architecture

```
/app                    Next.js routes (18 total per spec §2.2)
/components/shared      Header, BottomNav, FAB, BottomSheet, Dialog, EmptyState
/components/<module>    Module-specific components
/lib/storage            Repository per IndexedDB store (data layer, default backend: idb)
/lib/format             id-ID number/date formatters
/lib/types              TypeScript types (mirror Fase 2 DB schema)
/lib/bootstrap          anon_id init
```

## AI Workflow

This project uses specialized agents in `.claude/agents/`. Use slash commands:
- `/develop-module <wallet|transactions|loan|report>` — full pipeline for one module
- `/audit-spec` — compliance check vs tech-spec
- `/check-migration-ready` — Fase 2 schema validator
- `/preview-mobile [module]` — run Playwright E2E tests (56 tests @ mobile 390px)

## Conventions

- TypeScript strict mode
- Form validation: on-submit, not on-blur (§4.6)
- Tap targets: ≥44×44px
- Test viewports: 375 / 390 / 430 px
- Auto-trim text inputs, case-insensitive name matching

## Code Style: No Comments

**Dilarang menulis comment di codingan.** Code harus self-documenting lewat nama fungsi/variable yang ekspresif. Berlaku untuk semua agent dan semua perubahan kode.

Aturan:
1. **Jangan tulis** `//`, `/* */`, atau JSDoc block apapun di file `.ts`/`.tsx`/`.js`/`.jsx`. Pengecualian sempit: pragma wajib compiler (`"use client"`, `"use server"`, `@ts-expect-error` dengan alasan teknis singkat) dan file config yang butuh comment dari tooling (eslint disable inline kalau benar-benar tidak ada cara lain).
2. **Ganti comment dengan nama**: kalau merasa perlu jelasin "apa yang dilakukan code ini", refactor jadi fungsi/variable dengan nama yang jelas. Contoh: alih-alih `// hitung total expense bulan ini` → `const currentMonthExpenseTotal = sumExpensesInMonth(transactions, now)`.
3. **Jangan tulis** comment tipe "what" (`// loop transactions`), "tag" (`// TODO`, `// FIXME`, `// NOTE`), "section divider" (`// ===== Helpers =====`), atau "changelog inline" (`// fixed bug X`). Semua dilarang.
4. **Hapus comment lama** saat menyentuh file: kalau lagi edit sebuah file dan ketemu comment existing, hapus sekalian (kecuali pragma compiler di poin 1).
5. **Dokumentasi panjang** tempatnya di `tech-spec-docs/`, bukan di kode. Kalau ada nuansa bisnis yang non-obvious, tulis di spec dan rujuk lewat penamaan, bukan comment.
6. **JSX**: tidak ada `{/* comment */}` di markup. Pecah jadi komponen kecil dengan nama deskriptif kalau struktur perlu "label".

Reviewer (manual & agent) berhak reject PR yang masih ada comment di luar pengecualian di poin 1.
