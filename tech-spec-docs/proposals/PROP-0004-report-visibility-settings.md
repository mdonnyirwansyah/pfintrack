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

## 6. Open Questions — Resolved

Kedua open question berikut telah diputuskan berdasarkan pembacaan kode aktual `RealtimeTab.tsx` dan `PeriodSummaryRows.tsx`.

**OQ-1: `showDonutChart = false` → apakah juga menyembunyikan category breakdown dan `DailySummarySection`?**

**Keputusan: Ya — satu flag `showDonutChart` menyembunyikan donut toggle pill, `<DonutChart>`, `<DailySummarySection>`, dan category breakdown list sekaligus.**

Alasan: Setelah membaca `RealtimeTab.tsx` baris 262–346, struktur aktual adalah sebagai berikut — ketika `breakdown.length === 0` ditampilkan `<EmptyState>`, ketika `breakdown.length > 0` ditampilkan blok tunggal `<>` yang berisi `<DonutChart>`, `<DailySummarySection>` (hanya expense mode), dan transaction list. `DailySummarySection` dan category breakdown tidak memiliki render path independen — keduanya secara logis hanya bermakna dalam konteks donut. Menyembunyikan donut toggle pill + chart dan membiarkan breakdown tetap muncul akan menghasilkan UI yang rusak (breakdown tanpa chart induknya). Guard harus membungkus keseluruhan blok mulai dari donut mode toggle pill ke bawah.

Guard pattern di `RealtimeTab.tsx`:

```tsx
{reportVisibility.showDonutChart && (
  <>
    {/* C1 — Donut mode toggle pill */}
    <div className="flex items-center rounded-full p-1 gap-1" ...>
      ...
    </div>

    {breakdown.length === 0 ? (
      <EmptyState ... />
    ) : (
      <>
        <DonutChart ... />
        {!isIncomeMode && <DailySummarySection ... />}
        {/* Transaction list */}
        <div className="space-y-2">...</div>
      </>
    )}
  </>
)}
```

Subtitle hint yang perlu ditampilkan di bawah toggle "Category chart" di Settings: "Juga menyembunyikan ringkasan harian dan daftar transaksi per kategori." / "Also hides daily summary and category transaction list."

**OQ-2: Apakah `showSavingRateCard` juga mengontrol Saving Rate row di `PeriodSummaryRows`?**

**Keputusan: Tidak — keduanya tetap sebagai flag terpisah. `showSavingRateCard` hanya mengontrol `<SavingRateCard>` di Realtime tab. Saving Rate row di `PeriodSummaryRows` SELALU ditampilkan dan tidak dikendalikan oleh flag apapun.**

Alasan: Setelah membaca `PeriodSummaryRows.tsx` baris 90–115, Saving Rate row dirender via IIFE `(() => { ... })()` sebagai bagian permanen dari komponen — tidak conditional pada `summary.loan !== null` atau flag apapun. Saving Rate row di PeriodSummaryRows berbeda secara konteks: ia ada di dalam kartu ringkasan periode (Monthly/Custom tab) yang menampilkan ringkasan finansial komprehensif, bukan di Realtime tab yang memiliki `SavingRateCard` visual terpisah. Menggabungkan keduanya menjadi satu flag akan membingungkan user karena satu toggle memengaruhi dua tempat yang tidak terlihat berkaitan. `showLoanRow` dan `showBalanceCorrectionRow` sudah cukup untuk membersihkan PeriodSummaryRows bagi user yang tidak butuh data tersebut. Saving Rate row di PeriodSummaryRows dianggap data inti yang selalu relevan.

**OQ-3: Konvensi i18n namespace — Dikonfirmasi**

Keys mengikuti namespace `settings.report.*` (nested di dalam `"settings"` → `"report"`). Lihat §9.4 untuk exact snippet.

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

## 9. Implementation Detail

Section ini ditulis untuk dev agent agar dapat langsung coding tanpa perlu menebak-nebak. Semua nilai, nama komponen, dan pola diverifikasi dari codebase aktual per 2026-05-11.

---

### 9.1 File-by-File Checklist

#### `src/lib/stores/useAppStore.ts` — extend store

Berdasarkan pembacaan file aktual, struktur store saat ini:

```ts
interface AppState {
  anonId: string | null;
  isHydrated: boolean;
  showDecimals: boolean;
}

interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setShowDecimals: (v: boolean) => void;
}
```

Zustand persist config saat ini menggunakan `name: "app_state"`, `version: 1`, dan `partialize` yang hanya menyimpan `anonId` dan `showDecimals`.

Lihat §9.2 untuk exact TypeScript snippet perubahan yang diperlukan.

---

#### `src/app/settings/page.tsx` — tambah section Report

Berdasarkan pembacaan file aktual:
- `rowClass = "flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70"`
- `sectionClass = "glass rounded-[16px] overflow-hidden mb-4"`
- `dividerStyle = { height: 1, background: "var(--divider)", marginInline: 16 }`
- Toggle switch `showDecimals` menggunakan `div` nested dengan `backgroundColor` conditional dan `div` putih yang bergeser via `transform`.
- Section label menggunakan `<p className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4">`.

Tambahkan section "Report" di antara section "Display" (showDecimals) dan section "Demo Mode" (atau "Data & Storage" jika demo mode tidak aktif). Exact JSX untuk 6 toggle row:

```tsx
// Import yang perlu ditambahkan di atas file:
import { ChartPie, HandCoins, Lightbulb, PieChart, ArrowRightLeft, Pencil } from "lucide-react";

// Di dalam komponen, tambahkan setelah destructure showDecimals/setShowDecimals:
const reportVisibility = useAppStore((s) => s.reportVisibility);
const setReportVisibility = useAppStore((s) => s.setReportVisibility);

const tr = useTranslations("settings.report");

// JSX section baru (disisipkan setelah penutup </div> dari section Display):
<p
  className="text-[11px] font-semibold uppercase tracking-wider px-1 mb-2 mt-4"
  style={{ color: "var(--text-tertiary)" }}
>
  {tr("sectionTitle")}
</p>

<div className={sectionClass}>
  {(
    [
      { key: "showSavingRateCard", icon: ChartPie, label: tr("showSavingRateCard") },
      { key: "showLoanOutstanding", icon: HandCoins, label: tr("showLoanOutstanding") },
      { key: "showInsightCard", icon: Lightbulb, label: tr("showInsightCard") },
      { key: "showDonutChart", icon: PieChart, label: tr("showDonutChart"), hint: tr("showDonutChartHint") },
      { key: "showLoanRow", icon: ArrowRightLeft, label: tr("showLoanRow") },
      { key: "showBalanceCorrectionRow", icon: Pencil, label: tr("showBalanceCorrectionRow") },
    ] as { key: keyof typeof reportVisibility; icon: React.ElementType; label: string; hint?: string }[]
  ).map(({ key, icon: Icon, label, hint }, idx) => {
    const isOn = reportVisibility[key];
    return (
      <div key={key}>
        {idx > 0 && <div style={dividerStyle} />}
        <button
          className={rowClass + " w-full"}
          onClick={() => setReportVisibility(key, !isOn)}
          aria-pressed={isOn}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
              style={{ background: "var(--bg-icon)" }}
            >
              <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="text-left">
              <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                {label}
              </p>
              {hint && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {hint}
                </p>
              )}
            </div>
          </div>
          {/* Toggle switch — pola identik dengan showDecimals */}
          <div
            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
            style={{
              backgroundColor: isOn ? "var(--color-brand)" : "var(--border-default)",
            }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
              style={{
                backgroundColor: "white",
                transform: isOn ? "translateX(20px)" : "translateX(2px)",
              }}
            />
          </div>
        </button>
      </div>
    );
  })}
</div>
```

---

#### `src/components/report/RealtimeTab.tsx` — tambah guards

Berdasarkan pembacaan `RealtimeTab.tsx` aktual (baris 204–348), struktur JSX yang dikembalikan adalah:

```
<div className="space-y-4">
  {/* Period label */}
  {/* B1 — SavingRateCard  (baris 214) */}
  {/* D1 — LoanOutstandingSection (baris 217–221) */}
  {/* B2 — InsightCard (baris 223–225) */}
  {/* C1 — Donut mode toggle pill (baris 227–260) */}
  {/* breakdown.length === 0 ? EmptyState : DonutChart + DailySummarySection + TxList */}
</div>
```

Guard yang diperlukan:

```tsx
// Tambahkan import di atas file:
import { useAppStore } from "@/lib/stores/useAppStore";

// Di dalam komponen RealtimeTab, sebelum return:
const reportVisibility = useAppStore((s) => s.reportVisibility);

// Guard B1 — SavingRateCard (saat ini: baris 214, tidak conditional):
{reportVisibility.showSavingRateCard && (
  <SavingRateCard income={income} expenses={expenses} />
)}

// Guard D1 — LoanOutstandingSection (saat ini: baris 217–221, tidak conditional):
{reportVisibility.showLoanOutstanding && (
  <LoanOutstandingSection
    loanCounterparties={loanCounterparties}
    loanEntries={loanEntries}
  />
)}

// Guard B2 — InsightCard (saat ini: baris 223–225, sudah conditional pada insight && !insightDismissed):
{reportVisibility.showInsightCard && insight && !insightDismissed && (
  <InsightCard insight={insight} onDismiss={handleDismissInsight} />
)}

// Guard C1 + seluruh donut block (saat ini: baris 227–346):
{reportVisibility.showDonutChart && (
  <>
    {/* C1 — Donut mode toggle pill */}
    <div className="flex items-center rounded-full p-1 gap-1" ...>
      ...
    </div>

    {breakdown.length === 0 ? (
      <EmptyState ... />
    ) : (
      <>
        <DonutChart ... />
        {!isIncomeMode && <DailySummarySection ... />}
        <div className="space-y-2">...</div>
      </>
    )}
  </>
)}
```

---

#### `src/components/report/PeriodSummaryRows.tsx` — tambah guards

Berdasarkan pembacaan `PeriodSummaryRows.tsx` aktual:
- Loan row (baris 76–81): sudah conditional `{summary.loan !== null && (<SummaryRow ... />)}`.
- Balance Correction row (baris 83–87): sudah conditional `{summary.balanceCorrection !== null && (<SummaryRow ... />)}`.
- Saving Rate row (baris 90–115): IIFE, tidak conditional — **tidak disentuh** (keputusan OQ-2).

Guard yang diperlukan untuk dua row:

```tsx
// Tambahkan import di atas file:
import { useAppStore } from "@/lib/stores/useAppStore";

// Di dalam komponen PeriodSummaryRows:
const reportVisibility = useAppStore((s) => s.reportVisibility);

// Guard Loan row (gantikan baris 76–81):
{reportVisibility.showLoanRow && summary.loan !== null && (
  <SummaryRow
    label={t("loan")}
    value={formatIDRSigned(summary.loan)}
    color={loanColor}
  />
)}

// Guard Balance Correction row (gantikan baris 83–87):
{reportVisibility.showBalanceCorrectionRow && summary.balanceCorrection !== null && (
  <SummaryRow
    label={t("balanceCorrection")}
    value={formatIDRSigned(summary.balanceCorrection)}
    color={correctionColor}
  />
)}
```

Saving Rate row (baris 90–115) tidak dimodifikasi — selalu ditampilkan.

---

### 9.2 useAppStore Diff — Exact TypeScript Snippet

Seluruh perubahan yang diperlukan pada `src/lib/stores/useAppStore.ts`:

```ts
// Tambahkan interface baru sebelum AppState:
interface ReportVisibility {
  showSavingRateCard: boolean;
  showLoanOutstanding: boolean;
  showInsightCard: boolean;
  showDonutChart: boolean;
  showLoanRow: boolean;
  showBalanceCorrectionRow: boolean;
}

const DEFAULT_REPORT_VISIBILITY: ReportVisibility = {
  showSavingRateCard: true,
  showLoanOutstanding: true,
  showInsightCard: true,
  showDonutChart: true,
  showLoanRow: true,
  showBalanceCorrectionRow: true,
};

// Tambahkan ke interface AppState:
interface AppState {
  anonId: string | null;
  isHydrated: boolean;
  showDecimals: boolean;
  reportVisibility: ReportVisibility;   // BARU
}

// Tambahkan ke interface AppActions:
interface AppActions {
  setAnonId: (id: string) => void;
  setHydrated: (hydrated: boolean) => void;
  setShowDecimals: (v: boolean) => void;
  setReportVisibility: (key: keyof ReportVisibility, value: boolean) => void;  // BARU
}

// Di dalam create(), tambahkan ke initial state:
reportVisibility: DEFAULT_REPORT_VISIBILITY,

// Di dalam create(), tambahkan action:
setReportVisibility: (key, value) =>
  set((state) => ({
    reportVisibility: { ...state.reportVisibility, [key]: value },
  })),

// Di dalam partialize, tambahkan reportVisibility:
partialize: (state) => ({
  anonId: state.anonId,
  showDecimals: state.showDecimals,
  reportVisibility: state.reportVisibility,   // BARU
}),
```

Zustand `version` tidak perlu dinaikkan karena `reportVisibility` adalah field baru dengan default values — Zustand merge akan mengisi field ini dengan default jika tidak ada di stored state. Namun jika tim ingin defensive migration, naikkan ke `version: 2` dengan `migrate` function yang mengembalikan stored state + `reportVisibility: DEFAULT_REPORT_VISIBILITY`.

Export `ReportVisibility` interface agar dapat digunakan di Settings page:

```ts
export type { ReportVisibility };
```

---

### 9.3 Urutan Implementasi yang Direkomendasikan

1. Update `src/lib/stores/useAppStore.ts`: tambah `ReportVisibility` interface, `DEFAULT_REPORT_VISIBILITY`, extend `AppState`, extend `AppActions`, tambah `setReportVisibility` action, update `partialize`. Export `ReportVisibility` type.
2. Tambahkan i18n keys ke `messages/en.json` dan `messages/id.json` (lihat §9.4).
3. Update `src/components/report/PeriodSummaryRows.tsx`: import `useAppStore`, tambah `reportVisibility`, guard dua row.
4. Update `src/components/report/RealtimeTab.tsx`: import `useAppStore`, tambah `reportVisibility`, guard empat blok.
5. Update `src/app/settings/page.tsx`: import ikon baru, import `useTranslations("settings.report")`, tambah `reportVisibility`/`setReportVisibility` dari store, sisipkan section Report dengan 6 toggle rows.
6. Manual test: matikan setiap toggle satu per satu, verifikasi elemen hilang di Report. Hidupkan kembali, verifikasi muncul kembali. Refresh halaman — state harus persisten.

---

### 9.4 i18n Keys — Exact JSON Snippet

Berdasarkan pembacaan `messages/en.json` dan `messages/id.json`, kedua file menggunakan struktur nested di bawah `"settings"`. Tambahkan object `"report"` baru di dalam `"settings"`, setelah object `"demo"`:

**`messages/en.json`** — tambahkan di dalam `"settings"` setelah `"demo": { ... }`:

```json
"report": {
  "sectionTitle": "Report",
  "showSavingRateCard": "Saving Rate card",
  "showLoanOutstanding": "Loan section",
  "showInsightCard": "Spending insight",
  "showDonutChart": "Category chart",
  "showDonutChartHint": "Also hides daily summary and category list",
  "showLoanRow": "Loan row (summary)",
  "showBalanceCorrectionRow": "Balance correction row"
}
```

**`messages/id.json`** — tambahkan di dalam `"settings"` setelah `"demo": { ... }`:

```json
"report": {
  "sectionTitle": "Laporan",
  "showSavingRateCard": "Kartu Tingkat Menabung",
  "showLoanOutstanding": "Seksi pinjaman",
  "showInsightCard": "Insight pengeluaran",
  "showDonutChart": "Grafik kategori",
  "showDonutChartHint": "Juga menyembunyikan ringkasan harian dan daftar kategori",
  "showLoanRow": "Baris pinjaman (ringkasan)",
  "showBalanceCorrectionRow": "Baris koreksi saldo"
}
```

Penggunaan di `settings/page.tsx`: `const tr = useTranslations("settings.report")` kemudian `tr("sectionTitle")`, `tr("showSavingRateCard")`, dst.

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-11 | Draft created | Initial design discussion via feature-architect |
| 2026-05-11 | Option A selected (extend useAppStore) | Avoids new localStorage key; consistent with showDecimals precedent |
| 2026-05-11 | 6 toggleable sections defined | Balances user control with UX safety (core charts excluded) |
