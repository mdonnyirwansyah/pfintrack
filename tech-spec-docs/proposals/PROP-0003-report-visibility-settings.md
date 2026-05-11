# Proposal: Report Visibility Settings

**Status:** Draft
**Created:** 2026-05-11
**Author:** Discussion with @user (via feature-architect)
**Affects modules:** Report (primary), Settings (secondary), Cross-cutting (Zustand store)
**Effort estimate:** S (2–4 hours)
**Phase target:** Fase 1

---

## 1. Problem Statement

The Report page surfaces a growing number of sections — Saving Rate card, Loan Outstanding, Insight card, donut chart, category breakdown, daily summary, Monthly Overview chart, Net Worth chart, monthly per-row metrics (Loan, Balance Correction, Saving Rate). For most users these are valuable, but power users or privacy-conscious users may find certain sections noisy or irrelevant (e.g., no loans → the Loan row adds visual clutter; a user who does no wallet corrections never wants to see Balance Correction). There is currently no way to hide any section without code changes. The Settings page already supports per-preference toggles (showDecimals is the existing pattern) and has clear room to add a "Report" section.

---

## 2. Proposed Solution

**Recommendation:** Option A — extend `useAppStore` with a `reportVisibility` object persisted under the existing `app_state` Zustand key.

### Option A — Extend `useAppStore` (recommended)

**Approach:**
- Add a `reportVisibility` field to `useAppStore`'s persisted slice. No new localStorage key; piggybacks on the existing `app_state` key (Zustand's `persist` middleware).
- Expose a `setReportVisibility(key, value)` action (or a `toggleReportVisibility(key)` convenience).
- Report page components and tab components read the flag from the store with `useAppStore(s => s.reportVisibility)` and conditionally render.
- Settings page gets a new "Report" section below "Display" with toggle rows matching the existing pattern (icon + label + switch, same `rowClass`/`sectionClass` idiom).

**Toggleable sections (6 proposed):**

| Key | Label (en) | Affects | Default |
|---|---|---|---|
| `showSavingRateCard` | Saving Rate card | RealtimeTab — `<SavingRateCard>` block | `true` |
| `showLoanOutstanding` | Loan section | RealtimeTab — `<LoanOutstandingSection>` block | `true` |
| `showInsightCard` | Spending insight | RealtimeTab — `<InsightCard>` block | `true` |
| `showDonutChart` | Category chart | RealtimeTab & detail views — `<DonutChart>` block | `true` |
| `showLoanRow` | Loan row in summary | `PeriodSummaryRows` — `{summary.loan !== null && ...}` | `true` |
| `showBalanceCorrectionRow` | Balance correction row | `PeriodSummaryRows` — `{summary.balanceCorrection !== null && ...}` | `true` |

Rationale for this set:
- `showSavingRateCard` and `showInsightCard` are the most opinionated/analytical — some users just want raw numbers.
- `showLoanOutstanding` is only useful if the user actively uses the Loan module.
- `showDonutChart` is the heaviest visual element — hiding it dramatically speeds up perceived load on low-end devices.
- `showLoanRow` and `showBalanceCorrectionRow` clean up the monthly summary rows for users who rarely use those features.

Excluded from toggles (intentionally):
- Monthly Overview chart, Net Worth chart — these are the primary value of the Monthly tab; hiding them would degrade the core experience.
- Category breakdown list — inseparable from the donut chart UX (use `showDonutChart` to hide both).
- Custom tab — it is a CRUD tool, not a display section.

**Zustand state shape:**
```ts
reportVisibility: {
  showSavingRateCard: boolean;       // default: true
  showLoanOutstanding: boolean;      // default: true
  showInsightCard: boolean;          // default: true
  showDonutChart: boolean;           // default: true
  showLoanRow: boolean;              // default: true
  showBalanceCorrectionRow: boolean; // default: true
}
```

**New routes:** none.
**New localStorage keys:** none (persisted inside existing `app_state` Zustand key).
**New components:** none; additions are toggle rows inlined in Settings page following the existing `showDecimals` pattern.

---

### Option B — Separate `preferences` localStorage key

**Approach:**
- Write a thin `preferencesRepo` that reads/writes a dedicated `preferences` key in localStorage (outside the 7 reserved keys — this is explicitly allowed since the task brief calls it out, and `app_state` is itself already an 8th key managed by Zustand persist).
- `usePreferencesStore` (new Zustand store) loads from that key on mount.
- Same Settings toggle UI.

**Why not recommended:**
- Adds a new storage key and a new store file — unnecessary indirection when `useAppStore` already uses Zustand persist and already holds display preferences (`showDecimals`).
- Splits "display preferences" across two keys for no benefit.
- Harder to export/import via the existing backup mechanism (which snapshots the 7 reserved keys, not `app_state`).

---

### Comparison

| Aspect | A (extend useAppStore) | B (new preferences key) |
|---|---|---|
| Effort | S — 2–3 hours | S-M — 3–5 hours |
| New localStorage key | No | Yes (1 new key) |
| Migration risk | Low — Zustand versioning handles schema evolution | Low — but one more key to track |
| Design consistency | High — same pattern as showDecimals | Medium — new abstraction |
| Backup coverage | Partial (app_state not in backup today) | Same as A |

---

## 3. Constraints & Invariants

- Fits within 7 reserved localStorage keys: yes — `app_state` is Zustand's own persist key, not one of the 7 data keys. No new key added.
- All records have id/anon_id/is_active/created_at/updated_at: n/a — this feature stores UI preferences, not domain records.
- Soft-delete preserved: n/a.
- Wallet balance side-effect rules respected: n/a.
- Mobile-first (tap targets >= 44px, viewports 375/390/430): yes — toggle rows use existing `rowClass` which sets `py-3.5` and meets tap target height.
- id-ID locale formatting: n/a for boolean toggles.
- Diverges from spec at: none — the spec does not enumerate what may be stored in `app_state`. `showDecimals` is precedent for UI preferences here.

---

## 4. Migration Impact (Fase 2)

`reportVisibility` is a UI preference, not domain data. It should NOT migrate to the Fase 2 database. In Fase 2 it remains a client-side Zustand persist slice, scoped to the device. If Fase 2 adds cross-device sync of preferences, a dedicated `user_preferences` table would be added at that point, but this is out of scope for Fase 1 and does not create any anti-pattern now.

---

## 5. UX Walkthrough

**Settings page — new "Report" section (inserted between "Display" and "Data & Storage"):**

```
┌─────────────────────────────────────────────┐
│  REPORT                                     │  ← section label (11px uppercase)
├─────────────────────────────────────────────┤
│  [ChartPie icon]  Saving Rate card    [●  ] │
├─────────────────────────────────────────────┤
│  [HandCoins icon] Loan section        [●  ] │
├─────────────────────────────────────────────┤
│  [Lightbulb icon] Spending insight    [●  ] │
├─────────────────────────────────────────────┤
│  [PieChart icon]  Category chart      [●  ] │
├─────────────────────────────────────────────┤
│  [ArrowRightLeft] Loan row (summary)  [●  ] │
├─────────────────────────────────────────────┤
│  [Pencil icon]    Balance correction  [●  ] │
└─────────────────────────────────────────────┘
```

(All toggles ON by default. Toggle is the same 44×24 switch used by showDecimals.)

**Effect on Report page:**

1. User disables "Saving Rate card" in Settings.
2. Navigates to Report → Realtime tab.
3. `<SavingRateCard>` is not rendered (guarded by `if (!reportVisibility.showSavingRateCard) return null`).
4. The space collapses; the next section (Loan Outstanding or Donut mode toggle) moves up naturally.

**Edge cases:**

- All toggles OFF: the Realtime tab renders only the period label, the donut mode toggle pill, and (if data exists) the transaction list. The empty state still shows if there are no transactions. No broken layout.
- `showDonutChart` OFF: the donut toggle pill, the `<DonutChart>`, and the `<DailySummarySection>` are all hidden (they are meaningless without the chart context). The category breakdown list is also hidden — there is nothing to filter by without the donut. This collapse must be intentional and documented in the toggle's subtitle hint.
- Hydration: Zustand `persist` middleware rehydrates on the client. The server render uses default values (all `true`), so no content flicker for the typical case where preferences are ON.
- Offline (PWA): Zustand persist writes to localStorage synchronously on toggle — works fully offline.

---

## 6. Open Questions

- [ ] Should `showDonutChart = false` also hide the category breakdown list and `DailySummarySection`? The proposal assumes yes. Confirm this is acceptable UX.
- [ ] Should the Settings toggle for "Saving Rate card" also suppress the Saving Rate row inside `PeriodSummaryRows` (Monthly tab)? Currently proposed as two separate toggles (`showSavingRateCard` for the Realtime card only; the row in PeriodSummaryRows is always shown). We could merge them into one `showSavingRate` flag for consistency — but then one toggle affects two visually distinct places, which may surprise the user.
- [ ] i18n strings needed for Settings toggle labels and subtitle hints — confirm translation keys follow `settings.report.*` namespace convention.

---

## 7. Out of Scope

- Per-tab visibility (e.g., "hide donut in Realtime but keep it in Monthly detail"). All toggles are global.
- Hiding the Monthly Overview chart or Net Worth chart — these are the Monthly tab's primary value.
- Hiding the Custom tab entirely.
- Reordering sections (drag-to-reorder is a separate, higher-effort feature).
- Saving Rate row in PeriodSummaryRows (monthly summary card) — considered separately in Open Question above.

---

## 8. Implementation Roadmap (if accepted)

**Phase 1 (MVP):**
1. Extend `useAppStore` state and actions with `reportVisibility` defaults and `setReportVisibility(key, value)`.
2. Add `reportVisibility` to the `partialize` slice so it is persisted.
3. Guard `<SavingRateCard>`, `<LoanOutstandingSection>`, `<InsightCard>`, and `<DonutChart>` blocks in `RealtimeTab` with visibility flags.
4. Guard `{summary.loan !== null && ...}` and `{summary.balanceCorrection !== null && ...}` in `PeriodSummaryRows` with visibility flags.
5. Add "Report" section to `src/app/settings/page.tsx` with 6 toggle rows.
6. Add i18n keys under `settings.report.*`.

**Phase 2 (polish, optional):**
- Add subtitle hint below "Category chart" toggle: "Hides chart, daily summary, and category list."
- Consider merging Saving Rate toggles (open question above) based on user feedback.

**Suggested agents:**
- `module-report-dev` for guard changes in `RealtimeTab` and `PeriodSummaryRows`.
- `bugfix-adjuster` for `useAppStore` extension and Settings toggle rows (small, cross-cutting).
- Post-implementation: `/audit-spec`, `mobile-ui-tester` (verify tap targets and layout collapse at 375px).

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-11 | Draft created | Initial design discussion via feature-architect |
| 2026-05-11 | Option A selected (extend useAppStore) | Avoids new localStorage key; consistent with showDecimals precedent |
| 2026-05-11 | 6 toggleable sections defined | Balances user control with UX safety (core charts excluded) |
