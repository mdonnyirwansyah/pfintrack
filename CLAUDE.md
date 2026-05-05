# Personal Finance Manager (pfintrack)

Mobile-first Next.js (App Router) personal finance app. **Frontend-only**, all data in `localStorage`. Anonymous via UUID v4 (`anon_id`). Migration-ready to Fase 2 (backend + auth).

## Source of Truth

All implementation MUST follow `tech-spec-docs/`:
- `tech-spec-global-architecture.md` — read first, defines shared layout, design tokens, cross-module contracts
- `tech-spec-module-wallet.md` — fondasi data
- `tech-spec-module-transactions.md` — income/expense/transfer
- `tech-spec-module-loan.md` — give/get utang-piutang
- `tech-spec-module-report.md` — agregat realtime/monthly/custom

## Critical Invariants

1. **7 localStorage keys only**: `anon_id`, `wallets`, `wallet_balance_history`, `transactions`, `loan_counterparties`, `loan_entries`, `custom_reports`
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
/lib/storage            Repository per localStorage key (data layer)
/lib/format             id-ID number/date formatters
/lib/types              TypeScript types (mirror Fase 2 DB schema)
/lib/bootstrap          anon_id init
```

## AI Workflow

This project uses specialized agents in `.claude/agents/`. Use slash commands:
- `/develop-module <wallet|transactions|loan|report>` — full pipeline for one module
- `/audit-spec` — compliance check vs tech-spec
- `/check-migration-ready` — Fase 2 schema validator
- `/preview-mobile <route>` — multi-viewport screenshots

## Conventions

- TypeScript strict mode
- Form validation: on-submit, not on-blur (§4.6)
- Tap targets: ≥44×44px
- Test viewports: 375 / 390 / 430 px
- Auto-trim text inputs, case-insensitive name matching
