# Technical Specification Document
## Feature: In-App FAQ (Frequently Asked Questions)

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.0.0
**Tanggal:** 2026-05-16
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

> **Catatan Scope:**
> Dokumen ini mencakup fitur **In-App FAQ** — halaman pasif berisi pertanyaan & jawaban yang membantu pengguna memahami konsep PFinTrack tanpa keluar dari aplikasi. Fitur ini bersifat **lintas-cutting**: konten menjelaskan terminologi dan perilaku yang melibatkan Wallet, Transactions, Loan, Report, dan Settings sekaligus.
>
> Dokumen ini mendefinisikan:
> 1. Tujuan, persona, dan ruang lingkup fitur
> 2. Arsitektur konten (lokasi data, struktur i18n)
> 3. Route, komponen, dan alur navigasi
> 4. Spesifikasi UI: subtitle, search input, accordion, empty state
> 5. Katalog pertanyaan v1 (14 Q di 3 kategori, bilingual ID/EN)
> 6. Akses dari Settings → section Help
> 7. Kriteria penerimaan per user story
> 8. Roadmap evolusi (v2: search, v3: konten remote)
>
> Implementasi fitur ini **tidak** memerlukan perubahan pada modul data (Wallet/Transactions/Loan/Report). Hanya menambah satu route Settings child + key i18n.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **1.0.0** | **2026-05-16** | **Baseline release. Dokumen baru yang mendokumentasikan fitur FAQ in-app (PROP-0005) yang sudah live di codebase. Mencakup: route `/settings/faq`, struktur konten di `messages/{id,en}.json` namespace `faq`, accordion native `<details>`/`<summary>` multi-open, search filter realtime case-insensitive (auto-expand match, empty state), entry "FAQ" di Settings → Help, 14 pertanyaan bilingual di 3 kategori (Privasi & Data 5 / Fitur & Cara Kerja 5 / Teknis & Operasional 4), dan kontrak i18n key.** |

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Konten FAQ disimpan inline di `messages/{id,en}.json` namespace `faq` — bundled ke client JS (bukan fetch eksternal). Trade-off ini diterima karena: (a) konten kecil (~14 Q ≈ 5–8 KB), (b) wajib offline-ready (PWA), (c) zero infra overhead. |
| 2 | Bilingual penuh: setiap pertanyaan & jawaban tersedia di `id.json` dan `en.json`. Locale switching menggunakan mekanisme `next-intl` yang sudah ada (tidak ada logika khusus FAQ). |
| 3 | Tidak ada "feedback / contact" form di v1. FAQ adalah **read-only** — tidak ada CTA yang membutuhkan backend. |
| 4 | Accordion multi-open: user boleh expand banyak Q sekaligus. Tidak ada state persistence (refresh = reset ke semua collapsed, kecuali saat search aktif). |
| 5 | Search adalah client-side filter sederhana (`.toLowerCase().includes(needle)` pada field `q` dan `a`). Tidak ada fuzzy matching, ranking, atau highlight (v1). |
| 6 | Saat search aktif, item yang match auto-expand via attribute `open` pada `<details>`. Saat query di-clear, kembali ke state collapsed. |
| 7 | Tidak ada paginasi, tag, atau filter kategori. 14 item cukup untuk single scroll. |
| 8 | Tidak ada analytics tracking khusus (mis. "Q paling dibuka") di v1 — privacy-first. |

---

## 1. Gambaran Umum & Tujuan

### 1.1 Tujuan Fitur

FAQ in-app mengisi celah orientasi yang tidak dijawab oleh Product Tour (yang sifatnya satu kali, episodic) dan oleh struktur navigasi (yang implisit). Tujuan spesifik:

1. **Menjawab pertanyaan konseptual** yang sering muncul tapi tidak terjawab di UI primer: lokasi penyimpanan data, perbedaan Give vs Get, arti Saving Rate, dsb.
2. **Mengurangi friksi privasi-data** untuk pengguna baru yang ragu memulai sebelum tahu data tersimpan di mana dan apakah aman.
3. **Menyediakan referensi pasif** yang bisa diakses kapan saja (berbeda dengan Product Tour yang one-shot).
4. **Bekerja sepenuhnya offline** — karena PWA. Tidak boleh ada link eksternal sebagai jawaban utama.

### 1.2 Ruang Lingkup

**In-scope (v1, sudah live):**
- 14 pertanyaan kurasi di 3 kategori
- Konten bilingual ID/EN via `next-intl`
- Accordion multi-open (native `<details>`/`<summary>`)
- Search realtime client-side
- Empty state "no results" saat search tidak menemukan
- Entry point dari Settings → Help → "FAQ"

**Out-of-scope (v1):**
- Konten remote / CMS
- Contact / feedback form
- "Apakah jawaban ini membantu?" tracking
- Bookmark / favorite Q
- Tag, kategori filter, sorting
- Cross-link ke fitur (mis. "buka modul Loan" dari Q B1)

**Future (v2+):**
- Highlight kata kunci hasil search
- Section-jump TOC di bagian atas (kalau jumlah Q tumbuh > 20)
- Konten remote untuk update cepat tanpa rilis app baru (Fase 2)

---

## 2. Arsitektur

### 2.1 Lokasi Konten

Konten FAQ disimpan di file translation `next-intl`:
- `messages/id.json` — namespace `faq` (Bahasa Indonesia)
- `messages/en.json` — namespace `faq` (English)

Struktur key:
```
faq.title              → "FAQ" / "FAQ"
faq.subtitle           → intro pendek (1 paragraf)
faq.searchPlaceholder  → placeholder input search
faq.searchClear        → aria-label tombol clear
faq.noResults          → empty state, mengandung placeholder {query}
faq.categories         → array<{ title, items: array<{ q, a }> }>
```

Array `categories` dibaca via `t.raw("categories")` dan di-type-cast ke `readonly FaqCategory[]` di komponen page.

### 2.2 Route & Komponen

Route tunggal: **`/settings/faq`** (`src/app/settings/faq/page.tsx`).

| Bagian | Komponen | Catatan |
|--------|----------|---------|
| Header | `AppHeader` dengan `showBack` + title `faq.title` | Reuse shared component |
| Subtitle | `<p>` plain — render `faq.subtitle` | Style `text-secondary`, font-size 13px |
| Search input | `<input type="text">` dengan ikon `Search` (lucide) di kiri + tombol `<button>` `X` (lucide) di kanan saat query non-empty | Min tap height 44px, aria-label dari `faq.searchPlaceholder` & `faq.searchClear` |
| Kategori | `<section>` per kategori — heading `<h2>` + list `<details>` | Title di-render dari `cat.title` |
| Q&A item | `<details>` dengan `<summary>` (pertanyaan) + body (jawaban) | Native multi-open accordion, zero-JS. Chevron rotate via `group-open:rotate-180` |
| Empty state | `<p>` ramah di tengah halaman | Render `faq.noResults` dengan interpolasi `{query}` |

### 2.3 State

Komponen sepenuhnya client (`"use client"`) karena butuh `useState` (search query) dan `useMemo` (filtered categories). Tidak ada Zustand store dedicated — state lokal cukup.

```ts
const [query, setQuery] = useState("");
const trimmedQuery = query.trim();
const hasQuery = trimmedQuery.length > 0;

const filteredCategories = useMemo(() => {
  if (!hasQuery) return categories;
  const needle = trimmedQuery.toLowerCase();
  return categories
    .map((cat) => ({
      title: cat.title,
      items: cat.items.filter(
        (item) =>
          item.q.toLowerCase().includes(needle) ||
          item.a.toLowerCase().includes(needle),
      ),
    }))
    .filter((cat) => cat.items.length > 0);
}, [categories, hasQuery, trimmedQuery]);
```

### 2.4 Integrasi di Settings

Halaman Settings (`/settings`) memiliki section **Help** yang berisi 2 row:
1. **View Tutorial** — trigger ulang Product Tour
2. **FAQ** — navigasi ke `/settings/faq` (ikon `HelpCircle`, lucide)

Implementasi row mengikuti pattern `SettingsRow` shared component yang sudah ada.

---

## 3. Spesifikasi UI

### 3.1 Layout Halaman

```
┌────────────────────────────────────┐
│  ← FAQ                             │  ← AppHeader (sticky)
├────────────────────────────────────┤
│ Intro: short subtitle paragraph    │  ← faq.subtitle
│                                    │
│  🔍 Cari pertanyaan...     [X]    │  ← Search input (44px tap)
│                                    │
│  Privasi & Data                    │  ← <h2> kategori
│  ▸ Data saya tersimpan di mana?    │  ← <details><summary>
│  ▸ Apa yang terjadi kalau...       │
│  ...                               │
│                                    │
│  Fitur & Cara Kerja                │
│  ▸ Apa perbedaan Give dan Get?     │
│  ...                               │
└────────────────────────────────────┘
```

### 3.2 Search Behavior

| Skenario | Perilaku |
|----------|----------|
| Query kosong | Tampilkan semua kategori + semua item collapsed |
| Query non-empty, ada match | Filter kategori (hanya yang punya match). Semua matched item **auto-expand** via `open` attribute |
| Query non-empty, zero match | Render empty state `<p>` dengan teks `faq.noResults` (interpolasi `{query}`) |
| Tombol Clear (X) | Set `query = ""` → kembali ke state default |

Filter algoritma: `.toLowerCase().includes(needle)` pada field `q` dan `a`. Case-insensitive, substring, tanpa stemming.

### 3.3 Accordion

- Element: native `<details>` + `<summary>` (zero-JS, accessible by default)
- Multi-open: tidak ada pengelompokan eksklusif — beberapa Q boleh open bersamaan
- Indikator: chevron `<ChevronDown>` (lucide) yang rotate 180° via `group-open:rotate-180` Tailwind class
- Tap target summary ≥ 44px

### 3.4 Aksesibilitas

- Heading hierarchy: `<h1>` (page title via AppHeader) → `<h2>` (kategori) → `<summary>` (Q sebagai interactive heading)
- Search input punya `aria-label` dari `faq.searchPlaceholder`
- Clear button punya `aria-label` dari `faq.searchClear`
- Empty state adalah `<p>` (bukan `<div>`) sehingga di-announce screen reader

---

## 4. Katalog Pertanyaan v1

Total: **14 pertanyaan** di **3 kategori**. Bilingual ID + EN.

### 4.1 Kategori A: Privasi & Data (5 Q)

| # | Pertanyaan |
|---|------------|
| A1 | Data saya tersimpan di mana? |
| A2 | Apa yang terjadi kalau saya ganti atau kehilangan HP? |
| A3 | Apakah PFinTrack bisa melihat data keuangan saya? |
| A4 | Bagaimana cara backup dan restore data? |
| A5 | Bagaimana cara hapus semua data saya? |

### 4.2 Kategori B: Fitur & Cara Kerja (5 Q)

| # | Pertanyaan |
|---|------------|
| B1 | Apa perbedaan Give dan Get di modul Loan? |
| B2 | Kenapa Transfer tidak masuk sebagai pengeluaran? |
| B3 | Apa itu "Balance Correction" di daftar transaksi? |
| B4 | Apa itu Saving Rate dan bagaimana cara menghitungnya? |
| B5 | Mengapa saldo dompet bisa bernilai negatif? |

### 4.3 Kategori C: Teknis & Operasional (4 Q)

| # | Pertanyaan |
|---|------------|
| C1 | Apakah PFinTrack bisa digunakan tanpa koneksi internet? |
| C2 | Apa itu "Data Sampel / Demo Mode"? |
| C3 | Bagaimana cara memulai ulang tur panduan? |
| C4 | Apakah aplikasi ini gratis selamanya? |

Source of truth: `messages/{id,en}.json` namespace `faq.categories`. Konten lengkap (Q + A) tidak diduplikasi di sini untuk menghindari drift — kalau perlu edit, lakukan di file translation.

---

## 5. User Stories & Kriteria Penerimaan

| US | Story | Acceptance |
|----|-------|------------|
| **US-01** | Sebagai pengguna baru, saya ingin tahu di mana data saya disimpan agar saya bisa percaya pada aplikasi sebelum mulai pakai. | Q "Data saya tersimpan di mana?" (A1) accessible via `/settings/faq` tanpa scroll terlalu panjang. Jawaban menjelaskan IndexedDB lokal + tidak ada server. |
| **US-02** | Sebagai pengguna yang kembali, saya ingin nyari cepat jawaban spesifik tanpa scroll semua Q. | Search input filter realtime. Mengetik "balance" memunculkan Q B3 (Balance Correction) dan B5 (saldo negatif). |
| **US-03** | Sebagai pengguna casual, saya ingin paham terminologi "Give vs Get" sebelum pakai modul Loan. | Q B1 ada di kategori "Fitur & Cara Kerja" dan auto-expand saat search "give". |
| **US-04** | Sebagai pengguna privacy-conscious, saya ingin tahu siapa yang bisa lihat data saya. | Q A3 ("Apakah PFinTrack bisa melihat data keuangan saya?") menjawab dengan tegas: tidak — frontend-only, no telemetry isi data. |
| **US-05** | Sebagai pengguna offline, saya ingin FAQ tetap accessible saat tidak ada koneksi. | FAQ konten dibundle ke initial JS via `next-intl`. Halaman ter-precache oleh Serwist service worker. Verifikasi via airplane mode test. |
| **US-06** | Sebagai pengguna yang lupa cara mulai tur lagi, saya ingin nemu jawabannya. | Q C3 ada di kategori "Teknis & Operasional" dan menjelaskan tombol "View Tutorial" di Settings → Help. |
| **US-07** | Sebagai pengguna bilingual, saya ingin baca FAQ dalam bahasa pilihan saya. | Switching locale di Settings (id↔en) langsung mengubah konten FAQ tanpa reload manual. |

---

## 6. Kontrak i18n Keys

```
faq.title                          string
faq.subtitle                       string
faq.searchPlaceholder              string
faq.searchClear                    string  // aria-label
faq.noResults                      string  // mengandung placeholder {query}
faq.categories                     Array<Category>

Category:
  title                            string
  items                            Array<Item>

Item:
  q                                string
  a                                string  // boleh mengandung markdown ringan jika diparse, tapi v1: plain text
```

**Aturan tambah/edit konten:**
1. Edit `messages/id.json` dan `messages/en.json` bersamaan — keduanya harus punya jumlah item yang sama.
2. Jangan menambah field baru di `Item` tanpa update spec ini dan type di `page.tsx`.
3. Q dan A sebaiknya plain text (boleh multi-paragraf via `\n`); markdown belum di-parse di v1.

---

## 7. Hubungan dengan Fitur Lain

| Fitur | Relasi |
|-------|--------|
| **Product Tour** | Komplementer. Tour = aktif/one-shot orientasi; FAQ = pasif/on-demand referensi. Q C3 menjelaskan cara restart tour. |
| **Settings** | FAQ adalah child route Settings. Entry di section Help. |
| **Service Worker (Serwist)** | FAQ halaman ter-precache di `APP_ROUTES` (di `sw.ts`) sehingga accessible offline setelah first install. |
| **Migration (PROP-0001)** | Tidak ada dependency. FAQ tidak menyentuh data user. |

---

## 8. Roadmap Evolusi

### v2 (kandidat)
- Search highlight: bold kata kunci match di Q & A
- Section-jump TOC kalau Q > 20
- "Apakah ini membantu?" thumbs up/down (anonymous count di localStorage)

### v3 (kandidat, butuh Fase 2)
- Konten remote (CMS / signed JSON) untuk update tanpa rilis app
- "Submit pertanyaan baru" → ke email/issue tracker (opt-in)
- Analytics: Q paling dibuka (anonymized, aggregated)

---

## 9. Catatan Implementasi

1. **Type cast pada `t.raw()`**: `next-intl` mengembalikan `unknown` dari `t.raw("categories")`. Cast ke `readonly FaqCategory[]` di komponen — tidak ada validation runtime (sumber konten adalah translation file yang dikontrol developer).
2. **`useMemo` dependency**: hanya `[categories, hasQuery, trimmedQuery]`. Re-render saat user mengetik di-debounce secara natural oleh React batching (tidak perlu manual debounce — 14 item ringan).
3. **Empty state**: gunakan `<p>` semantik, bukan `<div>`, agar screen reader announce.
4. **Spec sync wajib**: kalau menambah/menghapus pertanyaan, update juga §4 di dokumen ini dan, jika menggeser ringkasan di Riwayat Revisi, bump versi minor di dokumen ini.

---

*— End of Spec —*
