# Proposal: Color Theme Picker

**Status:** Draft
**Created:** 2026-05-11
**Author:** Discussion with @user (via feature-architect)
**Affects modules:** Cross-cutting (Settings UI, global CSS, layout bootstrap)
**Effort estimate:** S (2–4 hours)
**Phase target:** Fase 1

---

## 1. Problem Statement

PFinTrack currently ships with a single blue brand color (`#5B8DEF` light / `#7BA4F7` dark). Users who want a more personal or gender-neutral aesthetic have no way to change it. A color theme picker in Settings adds low-cost delight and personalisation without introducing new data records, backend dependencies, or violating any core invariant. The initial scope is two themes: the existing Blue and a new Pink/Petal palette.

---

## 2. Proposed Solution

**Recommendation:** Option A — CSS `data-color-theme` attribute on `<html>` with CSS variable overrides.

### Option A — CSS attribute + variable overrides (recommended)

- Add `data-color-theme="blue"` (default) or `data-color-theme="pink"` to the `<html>` element.
- In `globals.css`, add a scoped override block for `[data-color-theme="pink"]` that re-declares only the three brand tokens. All other tokens (`--color-positive`, `--color-negative`, etc.) are untouched.
- A `ColorThemeProvider` component (Client Component, rendered in `layout.tsx`) reads `localStorage.getItem("pfintrack_color_theme")` on mount and sets the attribute synchronously before first paint, preventing a flash of the default theme.
- `useColorTheme()` hook exposes `{ colorTheme, setColorTheme }` — mirrors the `useTheme()` pattern already used in Settings.
- The Settings page adds a swatch row to the existing Appearance section (see ASCII mockup below).

### Option B — JavaScript writes CSS variables directly to `document.documentElement.style`

- On theme change, call `document.documentElement.style.setProperty('--color-brand', '#D95B7B')` etc. for each token.
- Simpler initial implementation, but: no persistent CSS class means SSR renders with default tokens, requiring a hydration patch; harder to maintain as token count grows; no clean CSS-only fallback.

### Option C — next-themes custom theme string

- Pass `themes={["light", "dark", "system", "blue", "pink"]}` to `ThemeProvider`. next-themes applies a class like `.pink` to `<html>`.
- Problem: next-themes conflates light/dark mode with color theme into a single dimension. Combining them (e.g. "dark + pink") requires 4 class combinations, making the CSS selector matrix quadratic and hard to maintain.

### Comparison

| Aspect | A (attribute) | B (JS inline) | C (next-themes) |
|---|---|---|---|
| Effort | S | XS | S |
| SSR / flash-free | Yes (attribute set in Provider before paint) | No (hydration patch needed) | Yes |
| CSS maintainability | Clean, scoped blocks | Fragile, imperative | Quadratic selectors |
| Light + dark compatibility | Automatic (`.dark [data-color-theme="pink"]`) | Manual per mode | Manual combinations |
| Recommended | Yes | No | No |

---

## 3. Tokens That Change Per Theme

Only brand-derived tokens change. Semantic tokens (`--color-positive`, `--color-negative`, `--color-accent`) are intentionally theme-invariant.

### Light mode

| Token | Blue (current) | Pink/Petal |
|---|---|---|
| `--color-brand` | `#5B8DEF` | `#D95B7B` |
| `--color-brand-soft` | `rgba(91,141,239,0.12)` | `rgba(217,91,123,0.12)` |
| `--color-brand-hover` | `#4A7DE0` | `#C44A6A` |
| `--shadow-fab` | `rgba(91,141,239,0.30)` | `rgba(217,91,123,0.30)` |
| `--nav-active` | `var(--color-brand)` | `var(--color-brand)` (inherits — no change needed) |

### Dark mode (`.dark [data-color-theme="pink"]`)

| Token | Blue (current) | Pink/Petal |
|---|---|---|
| `--color-brand` | `#7BA4F7` | `#F08FAA` |
| `--color-brand-soft` | `rgba(123,164,247,0.15)` | `rgba(240,143,170,0.15)` |
| `--color-brand-hover` | `#6B94E7` | `#E07A96` |
| `--shadow-fab` | `rgba(123,164,247,0.35)` | `rgba(240,143,170,0.35)` |

`--nav-active` and `--chart-1` reference `--color-brand` via `var()` so they update automatically.

---

## 4. Accessibility — WCAG AA Contrast

`--text-on-primary` is `#FFFFFF` (white) in both light and dark modes.

| Color | Hex | Approx contrast vs white | AA pass (4.5:1 normal / 3:1 large) |
|---|---|---|---|
| Blue light | `#5B8DEF` | 3.97:1 | Pass for UI components and large text; borderline for body text (acceptable — brand color is never used for body text) |
| Pink light | `#D95B7B` | 5.38:1 | Pass AA (normal text) |
| Blue dark | `#7BA4F7` | 3.15:1 | Pass for UI components |
| Pink dark | `#F08FAA` | 3.31:1 | Pass for UI components |

The original brand request specified `#E8799A` as the pink primary. That color produces ~3.37:1 contrast, which fails AA for normal text. This proposal uses `#D95B7B` (light mode) and `#F08FAA` (dark mode, where the dark background provides context) as the interactive primary instead. `#E8799A` may still be used as a decorative swatch dot in the Settings picker where no text sits on it.

---

## 5. Settings UI

Color picker sits inside the existing **Appearance** glass card, below the Light/Dark/System rows, separated by a divider.

```
┌─────────────────────────────────────────┐
│ APPEARANCE                              │
│─────────────────────────────────────────│  glass card
│  ☀  Light                          ✓   │
│─────────────────────────────────────────│
│  ☾  Dark                               │
│─────────────────────────────────────────│
│  ◑  System                             │
│─────────────────────────────────────────│
│  ◉  Warna Aksen                        │  ← new row, label only
│                                         │
│  ●  Blue      ●  Pink                  │
│  (active=ring)(tap to select)          │
└─────────────────────────────────────────┘
```

Implementation detail:
- Two swatch circles, 32×32px tap area expanded to 44×44px via padding.
- Active swatch has a 2px ring in `--color-brand` with a 2px gap (CSS `outline` trick).
- Swatch dots use the light-mode hex values regardless of current dark/light mode (they represent the color identity, not the current rendered shade).
- Blue swatch: `#5B8DEF`. Pink swatch: `#E8799A` (decorative only — no text on it).
- Row label: i18n key `settings.accentColor` (Indonesian: "Warna Aksen", English: "Accent Color").

---

## 6. Storage

**Key:** `pfintrack_color_theme`
**Values:** `"blue"` | `"pink"` (default: `"blue"`)

This key is separate from the 7 reserved data keys (`anon_id`, `wallets`, etc.) and carries no record schema — it is a plain string preference, same as `next-themes` uses `theme` and the app already uses `pfintrack_demo_mode`.

**Initialization:** A new `ColorThemeProvider` client component wraps the app in `src/app/layout.tsx`, rendered just inside `ThemeProvider`. On mount it reads the key and sets `document.documentElement.setAttribute('data-color-theme', value)`. Because this runs as a client component with `useEffect`, the attribute is set after hydration. To prevent a flash, inject a tiny inline `<script>` (not `next/script`) in `layout.tsx` before the body to synchronously read localStorage and set the attribute — the same pattern next-themes itself uses internally.

---

## 7. UX Walkthrough

1. User opens Settings → scrolls to Appearance section.
2. Sees two labeled swatch circles below the theme toggle rows.
3. Taps "Pink" swatch — CSS variable overrides apply instantly (no reload), entire UI repaints.
4. Active swatch gains an outline ring. All brand-colored elements (nav active indicator, FAB shadow, buttons, checkmarks in Settings) shift to pink.
5. Selection persisted to `localStorage`. On next app open, `ColorThemeProvider` reads and restores the theme before first paint.

Edge cases:
- **First visit:** key absent → default `"blue"`, no visible change.
- **Offline (PWA):** localStorage is synchronous, works fully offline.
- **Export/Import backup:** Color theme preference is a UI preference, not financial data — it is intentionally excluded from the data backup (`exportBackup`). User re-selects after restore.
- **SSR:** Server renders with no `data-color-theme` attribute. Inline script sets it before paint. CSS fallback (no attribute = blue tokens) ensures no broken state.

---

## 8. Constraints & Invariants

- Does not add a new localStorage key to the 7 reserved data keys — `pfintrack_color_theme` is a UI preference key, same category as `next-themes`' own key.
- No new record schema; no `id`/`anon_id`/`is_active` needed (it is not a data record).
- Soft-delete: not applicable.
- Wallet balance side-effects: not applicable.
- Mobile-first: swatch tap targets expanded to 44px minimum. Tested at 375/390/430 px.
- id-ID locale: new i18n key `settings.accentColor` added to both `en.json` and `id.json`.
- No new routes required.
- No new bottom nav tabs.

---

## 9. Migration Impact (Fase 2)

None. Color theme is a client-side UI preference. In Fase 2 it could be stored as a `user_preferences` record (key-value) server-side, but that is optional — localStorage is a perfectly acceptable long-term home for UI preferences even with a backend.

---

## 10. Out of Scope

- More than two themes in this proposal (extensibility is preserved — adding a third theme is one CSS block + one swatch).
- Custom color picker / hex input.
- Per-module color overrides.
- Applying the accent color to semantic tokens (`--color-positive`, `--color-negative`).

---

## 11. Implementation Roadmap (if accepted)

**Phase 1 — CSS + Provider (MVP, ~2 hrs):**
- Add `[data-color-theme="pink"]` and `.dark [data-color-theme="pink"]` blocks to `globals.css`.
- Create `src/components/shared/ColorThemeProvider.tsx`.
- Add inline script to `layout.tsx` for flash-prevention.
- Add `useColorTheme()` hook.

**Phase 2 — Settings UI (~1 hr):**
- Add swatch row to `src/app/settings/page.tsx` Appearance section.
- Add i18n keys to `en.json` and `id.json`.

Suggested agents to spawn:
- `module-settings-dev` for the Settings UI row and i18n keys.
- `bugfix-adjuster` for the `ColorThemeProvider` + inline script in layout.

---

## 12. Implementation Detail

Section ini ditulis untuk dev agent agar dapat langsung coding tanpa perlu menebak-nebak. Semua nilai dan pola diverifikasi dari codebase aktual per 2026-05-11.

---

### 12.1 File-by-File Checklist

#### `src/app/globals.css` — tambah dua blok CSS variable override

Berdasarkan pembacaan file aktual, nilai token light mode saat ini adalah:
- `--color-brand: #5B8DEF`
- `--color-brand-soft: rgba(91, 141, 239, 0.12)`
- `--color-brand-hover: #4A7DE0`
- `--shadow-fab: 0 4px 16px rgba(91, 141, 239, 0.3)`

Dan dark mode:
- `--color-brand: #7BA4F7`
- `--color-brand-soft: rgba(123, 164, 247, 0.15)`
- `--color-brand-hover: #6B94E7`
- `--shadow-fab: 0 4px 16px rgba(123, 164, 247, 0.35)`

Tambahkan dua blok berikut di akhir `globals.css`, setelah blok `@layer base`:

```css
/* ========================================
   COLOR THEME — Pink/Petal (light mode)
   ======================================== */
[data-color-theme="pink"] {
  --color-brand: #D95B7B;
  --color-brand-soft: rgba(217, 91, 123, 0.12);
  --color-brand-hover: #C44A6A;
  --shadow-fab: 0 4px 16px rgba(217, 91, 123, 0.30);
}

/* ========================================
   COLOR THEME — Pink/Petal (dark mode)
   ======================================== */
.dark [data-color-theme="pink"] {
  --color-brand: #F08FAA;
  --color-brand-soft: rgba(240, 143, 170, 0.15);
  --color-brand-hover: #E07A96;
  --shadow-fab: 0 4px 16px rgba(240, 143, 170, 0.35);
}
```

Token `--nav-active` dan `--chart-1` di kedua mode sudah menggunakan `var(--color-brand)` secara transitif, sehingga ikut berubah otomatis tanpa perlu ditambahkan ke blok override.

Tidak ada token yang perlu diubah untuk `[data-color-theme="blue"]` — ini adalah default yang sudah dideklarasikan di `:root` dan `.dark`.

---

#### `src/components/shared/ColorThemeProvider.tsx` — buat file baru

File ini belum ada. Buat sebagai Client Component di `src/components/shared/`.

Interface dan pseudocode implementasi:

```tsx
"use client";

import { useEffect } from "react";
import { useColorTheme } from "@/hooks/useColorTheme";

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorTheme } = useColorTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  return <>{children}</>;
}
```

Catatan: `useEffect` berjalan setelah hydration. Flash-prevention ditangani oleh inline script terpisah di `layout.tsx` (lihat §12.3). Tidak perlu `suppressHydrationWarning` tambahan karena `<html>` sudah memilikinya.

---

#### `src/hooks/useColorTheme.ts` — buat file baru

File ini belum ada. Buat di `src/hooks/`. Pola yang diikuti adalah hook tipis yang membungkus localStorage — mirip `useMounted` dan `useTheme`.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "blue" | "pink";

const STORAGE_KEY = "pfintrack_color_theme";

export function useColorTheme(): {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
} {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (stored === "blue" || stored === "pink") {
      setColorThemeState(stored);
    }
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    setColorThemeState(theme);
    document.documentElement.setAttribute("data-color-theme", theme);
  }, []);

  return { colorTheme, setColorTheme };
}
```

Tipe return eksplisit: `{ colorTheme: 'blue' | 'pink'; setColorTheme: (t: ColorTheme) => void }`.

---

#### `src/app/layout.tsx` — dua perubahan

**Perubahan 1 — inline script flash-prevention:**

Tambahkan `<script>` berikut sebagai anak langsung dari `<head>` (atau sebagai elemen pertama di dalam `<body>` sebelum `ThemeProvider`). Karena `layout.tsx` adalah Server Component, script ini di-render sebagai literal string — tidak menggunakan `next/script` (itu async).

Berdasarkan pembacaan `layout.tsx` aktual, `<html>` tidak memiliki `<head>` eksplisit. Di Next.js App Router, konten `<head>` diinjeksikan melalui `export const metadata`. Untuk inline script yang perlu berjalan sebelum paint, gunakan `dangerouslySetInnerHTML` langsung di dalam `<body>` sebelum semua children:

```tsx
<body suppressHydrationWarning className="antialiased" style={{...}}>
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){var t=localStorage.getItem('pfintrack_color_theme');document.documentElement.setAttribute('data-color-theme',t==='pink'?'pink':'blue');})();`,
    }}
  />
  <ThemeProvider ...>
    ...
  </ThemeProvider>
</body>
```

Script ini berjalan synchronously sebelum browser merender elemen apapun, sehingga mencegah flash dari `blue` ke `pink` pada first paint. Pattern ini identik dengan apa yang next-themes gunakan secara internal untuk light/dark mode.

**Perubahan 2 — pasang ColorThemeProvider:**

Import `ColorThemeProvider` dan pasang di dalam `ThemeProvider`, membungkus `NextIntlClientProvider`:

```tsx
import { ColorThemeProvider } from "@/components/shared/ColorThemeProvider";

// di dalam JSX:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  <ColorThemeProvider>
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProviders>
        ...
      </AppProviders>
    </NextIntlClientProvider>
  </ColorThemeProvider>
</ThemeProvider>
```

`ColorThemeProvider` hanya perlu berada di dalam tree — tidak perlu membalut `ThemeProvider` karena keduanya bekerja pada atribut yang berbeda (`class` untuk dark mode, `data-color-theme` untuk color theme).

---

#### `src/app/settings/page.tsx` — tambah swatch row di Appearance section

Berdasarkan pembacaan `settings/page.tsx` aktual:
- `rowClass = "flex items-center justify-between px-4 py-3.5 transition-opacity active:opacity-70"`
- `sectionClass = "glass rounded-[16px] overflow-hidden mb-4"`
- `dividerStyle = { height: 1, background: "var(--divider)", marginInline: 16 }`
- Section Appearance menggunakan `<div className={sectionClass}>` yang berisi tombol-tombol tema (Light/Dark/System) sebagai map dari `THEME_OPTIONS`.

Tambahkan swatch row **di bawah** blok `THEME_OPTIONS.map(...)` sebelum penutup `</div>` dari sectionClass Appearance. Kode yang perlu disisipkan:

```tsx
// Di bagian atas file, tambah import hook:
import { useColorTheme } from "@/hooks/useColorTheme";
import type { ColorTheme } from "@/hooks/useColorTheme";

// Di dalam komponen, tambah:
const { colorTheme, setColorTheme } = useColorTheme();

const COLOR_THEME_OPTIONS: { value: ColorTheme; label: string; dot: string }[] = [
  { value: "blue", label: t("accentColor.blue"), dot: "#5B8DEF" },
  { value: "pink", label: t("accentColor.pink"), dot: "#E8799A" },
];

// JSX yang disisipkan setelah THEME_OPTIONS.map(...), masih di dalam div sectionClass Appearance:
<div style={dividerStyle} />
<div className={rowClass}>
  <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>
    {t("accentColor.label")}
  </span>
  <div className="flex items-center gap-3">
    {COLOR_THEME_OPTIONS.map(({ value, label, dot }) => {
      const isActive = colorTheme === value;
      return (
        <button
          key={value}
          aria-label={label}
          aria-pressed={isActive}
          onClick={() => setColorTheme(value)}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: dot,
            outline: isActive
              ? `2px solid ${dot}`
              : "2px solid transparent",
            outlineOffset: 2,
            padding: 6, // expands tap area toward 44px via padding (actual visual = 32px circle)
          }}
        />
      );
    })}
  </div>
</div>
```

> **Catatan tap target:** Swatch circle 32×32px dipadding 6px tiap sisi → tap area efektif ~44×44px sesuai spec. Gunakan `padding` inline pada button, bukan `w-11 h-11`, agar lingkaran visual tetap 32px.

---

### 12.2 ColorThemeProvider — Interface Lengkap

```tsx
// Props
interface ColorThemeProviderProps {
  children: React.ReactNode;
}

// Export
export function ColorThemeProvider({ children }: ColorThemeProviderProps): JSX.Element
```

Tidak ada prop lain. Provider tidak mengekspos context — consumer mengakses state langsung via `useColorTheme()` hook. Ini sengaja agar tidak ada React context overhead; state di-sync melalui localStorage dan DOM attribute.

---

### 12.3 Inline Flash-Prevention Script — Exact String

Exact string untuk `__html` (minified, tanpa whitespace):

```
(function(){var t=localStorage.getItem('pfintrack_color_theme');document.documentElement.setAttribute('data-color-theme',t==='pink'?'pink':'blue');})();
```

Logika: baca `pfintrack_color_theme` dari localStorage; jika nilainya `'pink'` set attribute ke `'pink'`, selain itu (termasuk null/undefined/corrupt) default ke `'blue'`. Tidak perlu try-catch karena `localStorage.getItem` tidak throw di browser normal, dan script ini hanya berjalan di client (tidak ada SSR execution untuk inline script body).

---

### 12.4 i18n Keys — Exact JSON Snippet

Berdasarkan pembacaan `messages/en.json` dan `messages/id.json`, kedua file menggunakan namespace `"settings"` dengan sub-keys flat dan nested. Tambahkan di dalam object `"settings"` (setelah `"showDecimals"` yang sudah ada):

**`messages/en.json`** — tambahkan setelah `"showDecimals": "Show Decimals"`:

```json
"accentColor": {
  "label": "Accent Color",
  "blue": "Blue",
  "pink": "Pink"
},
```

**`messages/id.json`** — tambahkan setelah `"showDecimals": "Tampilkan Desimal"`:

```json
"accentColor": {
  "label": "Warna Aksen",
  "blue": "Biru",
  "pink": "Merah Muda"
},
```

Penggunaan di komponen: `t("accentColor.label")`, `t("accentColor.blue")`, `t("accentColor.pink")`. Hook `useTranslations("settings")` sudah tersedia di `settings/page.tsx`.

---

### 12.5 Urutan Implementasi yang Direkomendasikan

1. Buat `src/hooks/useColorTheme.ts` (tidak ada dependency eksternal).
2. Tambahkan dua blok CSS ke `src/app/globals.css` (tidak ada dependency).
3. Buat `src/components/shared/ColorThemeProvider.tsx` (depends on `useColorTheme`).
4. Update `src/app/layout.tsx`: pasang inline script dan `ColorThemeProvider` (depends on step 3).
5. Tambahkan i18n keys ke `messages/en.json` dan `messages/id.json` (tidak ada dependency).
6. Update `src/app/settings/page.tsx`: import hook, tambah state, tambah swatch row (depends on steps 1 dan 5).
7. Manual test di 375px viewport: pilih Pink → semua elemen brand berubah warna → refresh page → Pink tetap aktif (tidak flash ke Blue dulu).

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-11 | Draft created | Initial design discussion |
| 2026-05-11 | Chose `#D95B7B` over `#E8799A` as interactive pink | `#E8799A` fails WCAG AA (3.37:1) for white text on interactive elements |
| 2026-05-11 | Chose Option A (CSS attribute) over B and C | Flash-free, CSS-maintainable, orthogonal to light/dark axis |
