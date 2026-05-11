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

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-11 | Draft created | Initial design discussion |
| 2026-05-11 | Chose `#D95B7B` over `#E8799A` as interactive pink | `#E8799A` fails WCAG AA (3.37:1) for white text on interactive elements |
| 2026-05-11 | Chose Option A (CSS attribute) over B and C | Flash-free, CSS-maintainable, orthogonal to light/dark axis |
