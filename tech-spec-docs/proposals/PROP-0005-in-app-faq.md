# Proposal: In-App FAQ (Frequently Asked Questions)

**Status:** Draft
**Created:** 2026-05-15
**Author:** Discussion with @user (via feature-architect)
**Affects modules:** Settings (primary), Cross-cutting (i18n, PWA offline)
**Effort estimate:** S (2–4 jam)
**Phase target:** Fase 1 (konten statik); Fase 2 (konten remote opsional)

---

## 1. Problem Statement

PFinTrack adalah aplikasi anonymous-first tanpa onboarding berbasis akun. Satu-satunya mekanisme orientasi saat ini adalah Product Tour (13–22 step overlay) yang hanya muncul sekali dan tidak bisa dijadikan referensi pasif. Ketika pengguna menemui pertanyaan konseptual — "data saya tersimpan di mana?", "apa bedanya Give dan Get?", "kenapa saldo bisa minus?" — tidak ada tempat untuk menjawab selain mencoba sendiri atau keluar dari app.

Celah ini paling terasa pada tiga persona:
1. **Pengguna baru privacy-conscious** yang ragu memulai tanpa tahu keamanan datanya.
2. **Pengguna yang kembali** setelah lama tidak pakai — lupa cara kerja fitur tertentu.
3. **Pengguna casual** yang bingung dengan terminologi keuangan spesifik PFinTrack (Saving Rate, Balance Correction, Give vs Get).

Frekuensi: tidak setiap hari, tapi titik friksi tertinggi ada di momen pertama pakai dan setelah fitur baru rilis. FAQ yang ada di app (bukan link eksternal) mengurangi drop-off di momen kritis ini.

---

## 2. Analisis Kompetitor

| Aplikasi | Pola FAQ | Observasi |
|---|---|---|
| **Monefy** | Static FAQ per kategori di website, bukan in-app. Kategori: Getting Started / Features / Data Backup / Privacy / Subscription / Troubleshooting. ~25 pertanyaan. | Kategori Privacy & Data Backup sangat relevan untuk PFinTrack. Tidak ada search. Format: expanded full-text per kategori. |
| **Jenius** | Web-based help center dengan kategori kartu + breadcrumb. Full-page per topik (bukan accordion). "Get Help" CTA untuk kontak langsung. | Terlalu kompleks untuk app personal finance skala PFinTrack. Tapi pola "topik card → detail page" bisa diadaptasi secara ringan. |
| **BudgetBakers Wallet** | Help center eksternal (Zendesk). Kategori: Getting Started / Account / FAQ / Safety. Link dari dalam app. | Eksternal help center = friction tinggi, tidak bisa offline. Anti-pattern untuk PWA offline-first. |
| **YNAB** | Dedicated help center eksternal + in-app tooltips kontekstual per fitur. | Tooltips kontekstual bagus tapi mahal effort (butuh placement di tiap fitur). Tidak realistis untuk Fase 1. |
| **Sribuu** | FAQ minimal di website, tidak ada in-app help. | Paling mirip ukuran PFinTrack. Celah yang sama. |

**Sintesis:** Untuk app personal finance skala kecil-menengah yang offline-first, pola terbaik adalah **static FAQ in-app** dengan konten berbasis kategori, tanpa search (di v1), format accordion collapse-expand. Bukan link eksternal (tidak bisa offline), bukan full-page per pertanyaan (terlalu mahal navigasinya untuk 12–15 item), bukan tooltips kontekstual (terlalu mahal effort).

---

## 3. Daftar Pertanyaan Kandidat v1 (14 pertanyaan)

Dikelompokkan ke 3 kategori. Target: setiap kategori maksimal 5–6 pertanyaan agar accordion tidak overwhelming.

### Kategori A: Privasi & Data (5 pertanyaan)

| # | Pertanyaan |
|---|---|
| A1 | Data saya tersimpan di mana? |
| A2 | Apa yang terjadi kalau saya ganti atau kehilangan HP? |
| A3 | Apakah PFinTrack bisa melihat data keuangan saya? |
| A4 | Bagaimana cara backup dan restore data? |
| A5 | Bagaimana cara hapus semua data saya? |

### Kategori B: Fitur & Cara Kerja (5 pertanyaan)

| # | Pertanyaan |
|---|---|
| B1 | Apa perbedaan Give dan Get di modul Loan? |
| B2 | Kenapa Transfer tidak masuk sebagai pengeluaran? |
| B3 | Apa itu "Balance Correction" di daftar transaksi? |
| B4 | Apa itu Saving Rate dan bagaimana cara menghitungnya? |
| B5 | Mengapa saldo dompet bisa bernilai negatif? |

### Kategori C: Teknis & Operasional (4 pertanyaan)

| # | Pertanyaan |
|---|---|
| C1 | Apakah PFinTrack bisa digunakan tanpa koneksi internet? |
| C2 | Apa itu "Data Sampel / Demo Mode"? |
| C3 | Bagaimana cara memulai ulang tur panduan? |
| C4 | Apakah aplikasi ini gratis selamanya? |

**Total: 14 pertanyaan, 3 kategori.** Bilingual (id + en) via next-intl.

---

## 4. Rekomendasi Arsitektur

### Rekomendasi: Option A — Static FAQ di messages/{id,en}.json, route `/settings/faq`, accordion per kategori

Ini adalah satu-satunya pilihan yang masuk akal untuk Fase 1. Di bawah ini dua variasi implementasi disajikan untuk memilih detail storage konten.

---

### Option A1 — Konten langsung di messages.json (direkomendasikan)

**Pendekatan:**
- Route baru: `/settings/faq` — halaman list FAQ
- Konten disimpan di `messages/id.json` dan `messages/en.json` dalam namespace `faq`
- Struktur: array kategori, setiap kategori punya `title` + array `items` (pertanyaan + jawaban)
- Komponen: `AccordionItem` per pertanyaan — expand/collapse dengan animasi CSS sederhana
- State accordion: local React state (`useState<string | null>`) — ID pertanyaan yang sedang terbuka. Hanya satu accordion terbuka pada satu waktu (single-open pattern)
- Entry point: button row baru di Settings → section Help, di bawah "View Tutorial"

**Keunggulan:**
- Zero infrastructure baru — hanya file JSON + 1 route + 1 komponen
- Offline-first by default (bundle ke JS build oleh next-intl)
- Konsisten dengan pola `whats-new` yang sudah ada (konten dari `t.raw()`)
- Bilingual otomatis via locale switching yang sudah ada
- Mudah di-extend: tambah pertanyaan = edit JSON

**Trade-off:**
- Konten "stuck" di build time — kalau ada koreksi konten, harus deploy ulang
- Ukuran bundle sedikit naik (tapi teks FAQ ~3–5KB compressed, negligible)
- Tidak ada search (acceptable di v1 dengan ≤15 pertanyaan)

**Struktur JSON (sketch):**
```json
// messages/en.json — namespace "faq"
"faq": {
  "title": "FAQ",
  "subtitle": "Frequently asked questions about PFinTrack.",
  "categories": [
    {
      "id": "privacy",
      "title": "Privacy & Data",
      "items": [
        {
          "q": "Where is my data stored?",
          "a": "All your financial data is stored locally on your device using IndexedDB — a browser storage mechanism. PFinTrack does not have a server and never sends your data anywhere. Your data is yours alone."
        }
        // ...
      ]
    }
    // ...
  ]
}
```

---

### Option A2 — Konten di file JSON terpisah (`src/data/faq.{id,en}.json`)

**Pendekatan:**
- Sama dengan A1, tapi konten FAQ dipisah ke file statis di `src/data/` dan di-import langsung ke halaman
- Tidak melalui next-intl — locale switching manual via `useLocale()`

**Keunggulan:**
- Konten FAQ tidak campur dengan string UI di messages.json (separation of concerns)
- Lebih mudah di-migrate ke CMS/remote di Fase 2

**Trade-off:**
- Duplikasi mekanisme i18n (ada 2 sistem locale sekarang)
- Tidak bisa memanfaatkan namespace switching otomatis next-intl
- Lebih banyak boilerplate untuk sesuatu yang sederhana

**Kesimpulan: A1 lebih baik.** PFinTrack sudah all-in di next-intl; konten FAQ setara level detail dengan `changelog.entries` di `whats-new` yang sudah ada. Precedent sudah ada.

---

### Perbandingan Option

| Aspek | A1 (messages.json) | A2 (file terpisah) |
|---|---|---|
| Effort | S (2–3 jam) | S (2–3 jam, sedikit lebih) |
| Konsistensi pola | Tinggi (ikuti changelog) | Rendah (sistem baru) |
| Offline | Ya | Ya |
| Migration Fase 2 | Mudah (swap sumber data) | Mudah |
| Bundle size | Minimal | Minimal |
| Rekomendasi | **Ya** | Tidak |

---

## 5. Constraints & Invariants

- Storage: FAQ adalah pure UI content, tidak menyentuh IndexedDB sama sekali. Tidak ada perubahan pada 6 object store.
- Records: Tidak ada record baru. FAQ tidak punya `id`, `anon_id`, `is_active`. Ini bukan data finansial, ini konten statis UI.
- Soft-delete: Tidak relevan.
- Wallet balance rules: Tidak relevan.
- Mobile-first: Accordion header minimal 44px height. Tap area seluruh baris (full-width button). Jawaban menggunakan `text-[13px]` leading-relaxed, sesuai konvensi Settings.
- Locale: Seluruh konten via next-intl namespace `faq`. Bilingual id/en otomatis.
- Bottom nav: Tidak ada tab baru. FAQ adalah sub-halaman Settings (tab ke-5).
- Divergensi dari spec: Tidak ada. Menambah route `/settings/faq` ke route map §2.2 (saat ini 23 route → 24 route).

---

## 6. Migration Impact (Fase 2)

FAQ Fase 1 adalah static content — tidak ada data di server. Fase 2 membuka dua jalur opsional:

**Jalur 1 (simple, direkomendasikan untuk Fase 2 awal):** Pertahankan konten di messages.json. Tidak ada perubahan backend. CMS tidak diperlukan.

**Jalur 2 (opsional, jika content ops dibutuhkan):** Fetch konten dari remote JSON endpoint (mis. CDN atau CMS seperti Contentful/Sanity). Halaman FAQ melakukan `fetch()` ke URL remote, fallback ke messages.json jika offline. Perubahan ini murni di lapisan UI — tidak butuh SQL table baru, tidak mempengaruhi skema data finansial.

Tidak ada risiko migrasi. FAQ tidak menyentuh skema data apapun.

---

## 7. UX Walkthrough

### Akses ke FAQ

```
Settings (tab ke-5)
  ↓ scroll ke section "Help"
  ┌─────────────────────────────────────┐
  │ [BookOpen] View Tutorial    ›       │
  │─────────────────────────────────────│
  │ [HelpCircle] FAQ            ›       │  ← BARU
  └─────────────────────────────────────┘
```

User tap baris FAQ → push ke `/settings/faq`.

### Halaman FAQ (`/settings/faq`)

```
┌────────────────────────────────────┐
│ ‹  FAQ                             │  ← AppHeader, showBack
└────────────────────────────────────┘

  Pertanyaan yang sering ditanyakan
  tentang PFinTrack.                  ← subtitle, text-secondary

  ┌──────────────────────────────┐
  │ PRIVASI & DATA               │  ← section header h2, uppercase
  │──────────────────────────────│
  │ Data saya tersimpan di mana?  │  ← accordion header (button)
  │──────────────────────────────│
  │ Apa yang terjadi kalau...  ▼ │  ← accordion header TERBUKA
  │  Semua data kamu tersimpan   │
  │  di browser via IndexedDB.   │  ← answer, text-secondary 13px
  │  PFinTrack tidak punya       │
  │  server...                   │
  │──────────────────────────────│
  │ Apakah PFinTrack bisa...      │
  │──────────────────────────────│
  │ ...                           │
  └──────────────────────────────┘

  ┌──────────────────────────────┐
  │ FITUR & CARA KERJA           │
  │──────────────────────────────│
  │ ...                           │
  └──────────────────────────────┘

  ┌──────────────────────────────┐
  │ TEKNIS & OPERASIONAL         │
  │──────────────────────────────│
  │ ...                           │
  └──────────────────────────────┘
```

**Perilaku accordion:**
- Hanya satu accordion terbuka pada satu waktu (single-open). Tap item yang sudah terbuka → tutup. Tap item lain → buka yang baru, tutup yang lama.
- Ikon indikator: `ChevronDown` (tertutup) → `ChevronUp` (terbuka), warna `var(--text-tertiary)`. Animasi `transition-transform duration-200`.
- Teks pertanyaan: `text-[14px]` font-medium, `var(--text-primary)`.
- Teks jawaban: `text-[13px]` leading-relaxed, `var(--text-secondary)`. Padding horizontal sejajar dengan teks pertanyaan.
- Card wrapper tiap kategori: `glass rounded-[16px] overflow-hidden` — identik dengan pola Settings.
- Section label kategori: `text-[11px] font-semibold uppercase tracking-wider`, `var(--text-tertiary)` — identik dengan section label di Settings.

### Edge Cases

| Kondisi | Perilaku |
|---|---|
| Offline (PWA) | FAQ tetap tampil — konten ada di bundle JS, tidak ada network call |
| Bahasa berganti di Settings | FAQ lang ikut berganti otomatis (next-intl) |
| Semua accordion tertutup saat pertama buka | Ya — empty accordion state, user scan semua pertanyaan dulu |
| Konten jawaban sangat panjang | Scroll vertikal biasa di dalam konten yang expand — tidak ada max-height limit |
| Deep-link ke FAQ dari empty state | V2 — tidak di-scope v1 |

---

## 8. Hubungan dengan Fitur Lain

### FAQ vs Product Tour

**Komplementer, bukan pengganti.** Product Tour adalah *guided hands-on experience* — interactive, kontekstual, step-by-step. FAQ adalah *passive reference* — untuk pertanyaan yang muncul belakangan, setelah tour selesai.

Posisi di Settings:
```
Help
  View Tutorial  →  memulai tour interaktif
  FAQ            →  buka halaman FAQ statik
```

Kedua entry bisa hidup berdampingan di section yang sama. Tidak ada konflik.

### FAQ vs What's New

**Berbeda tujuan:**
- What's New (`/settings/whats-new`) = changelog per rilis, oriented ke *perubahan terbaru*
- FAQ (`/settings/faq`) = pertanyaan yang bertahan lama, oriented ke *cara kerja dasar*

Keduanya berada di Settings tapi di section berbeda:
- What's New → section **About** (konteks: "tentang app ini")
- FAQ → section **Help** (konteks: "butuh bantuan pakai app")

Tidak ada duplikasi konten.

### Cross-link dari Empty State / Error State (v2)

V1 tidak meng-implementasi ini, tapi arsitekturnya memungkinkan. Contoh use case:
- Empty state Wallet → link ke FAQ B5 ("Mengapa saldo bisa negatif?")
- Empty state Loan → link ke FAQ B1 ("Apa beda Give dan Get?")

Implementasi v2: props `faqLink?: string` di komponen `EmptyState`, render tombol teks kecil "Pelajari lebih lanjut" yang navigate ke `/settings/faq#<item-id>`.

---

## 9. Mockup ASCII Detail

```
─────────────────────────────────────────
 ‹           FAQ
─────────────────────────────────────────
 Pertanyaan yang sering ditanyakan
 tentang PFinTrack.

 PRIVASI & DATA
 ╔═══════════════════════════════════════╗
 ║ Data saya tersimpan di mana?    ⌄    ║  44px tap target
 ║───────────────────────────────────────║
 ║ Apa yang terjadi kalau saya     ⌃    ║  OPEN
 ║ ganti atau kehilangan HP?             ║
 ║                                       ║
 ║  Semua data keuanganmu disimpan       ║
 ║  langsung di perangkatmu              ║
 ║  menggunakan IndexedDB. Jika kamu     ║
 ║  mengganti HP tanpa backup, data      ║
 ║  tidak bisa dipulihkan. Gunakan       ║
 ║  fitur Backup di Data & Storage.      ║
 ║───────────────────────────────────────║
 ║ Apakah PFinTrack bisa melihat   ⌄    ║
 ║ data keuangan saya?                   ║
 ║───────────────────────────────────────║
 ║ Bagaimana cara backup dan       ⌄    ║
 ║ restore data?                         ║
 ║───────────────────────────────────────║
 ║ Bagaimana cara hapus semua      ⌄    ║
 ║ data saya?                            ║
 ╚═══════════════════════════════════════╝

 FITUR & CARA KERJA
 ╔═══════════════════════════════════════╗
 ║ Apa perbedaan Give dan Get      ⌄    ║
 ║ di modul Loan?                        ║
 ║───────────────────────────────────────║
 ║ Kenapa Transfer tidak masuk     ⌄    ║
 ║ sebagai pengeluaran?                  ║
 ║───────────────────────────────────────║
 ║ Apa itu "Balance Correction"?   ⌄    ║
 ║───────────────────────────────────────║
 ║ Apa itu Saving Rate?            ⌄    ║
 ║───────────────────────────────────────║
 ║ Mengapa saldo dompet bisa       ⌄    ║
 ║ bernilai negatif?                     ║
 ╚═══════════════════════════════════════╝

 TEKNIS & OPERASIONAL
 ╔═══════════════════════════════════════╗
 ║ Apakah bisa digunakan offline?  ⌄    ║
 ║───────────────────────────────────────║
 ║ Apa itu Demo Mode?              ⌄    ║
 ║───────────────────────────────────────║
 ║ Cara memulai ulang tur panduan? ⌄    ║
 ║───────────────────────────────────────║
 ║ Apakah PFinTrack gratis?        ⌄    ║
 ╚═══════════════════════════════════════╝

─────────────────────────────────────────
 [Transactions] [Wallet] [Loan] [Report] [Settings]
─────────────────────────────────────────
```

---

## 10. Analisis 5 Dimensi

| Dimensi | Penilaian |
|---|---|
| **User value** | 4/5 — menghapus friksi terbesar untuk pengguna baru dan returning users, khususnya pertanyaan privacy (A1–A3) yang mencegah drop-off |
| **Technical feasibility (Fase 1)** | Sangat tinggi — zero storage changes, hanya route + JSON + 1 komponen. Precedent ada di `whats-new`. |
| **Migration impact (Fase 2)** | Nol risiko — konten statis, tidak ada schema change. Fase 2 bisa swap sumber data ke remote jika mau. |
| **Design consistency** | Tinggi — pola card+section label dari Settings, pola konten JSON dari whats-new, pola AppHeader+showBack dari semua sub-halaman. |
| **Effort estimate** | S (2–3 jam): 1 route, 1 halaman, 1 AccordionItem component, JSON content bilingual, tambah row di Settings |

---

## 11. Open Questions

- [x] **Konten jawaban**: Draft 14 jawaban bilingual (id + en) tersedia di `PROP-0005-faq-content.md` — menunggu review sebelum diintegrasikan ke `messages/{id,en}.json`. *(Diselesaikan 2026-05-15)*
- [ ] **Single-open vs multi-open accordion**: Proposal rekomendasikan single-open (satu terbuka sekaligus). Apakah user ingin bisa membandingkan 2 jawaban sekaligus? Kalau ya, switch ke multi-open.
- [ ] **Urutan pertanyaan di tiap kategori**: Apakah urutan di Section 3 sudah oke, atau ada pertanyaan yang lebih penting untuk diletakkan paling atas?
- [ ] **Kata "FAQ" vs "Bantuan" vs "Help"**: Di Settings row, label yang pas? "FAQ", "Pertanyaan Umum" (id) / "FAQ" (en), atau "Bantuan"?
- [ ] **Section Help di Settings**: Saat ini hanya punya 1 item (View Tutorial). Setelah FAQ ditambah jadi 2 item. Apakah perlu rename section menjadi "Bantuan & Tutorial" untuk lebih deskriptif?
- [ ] **Cross-link dari empty state**: Apakah ini diinginkan di v1 juga, atau cukup v2?

---

## 12. Out of Scope

Proposal ini secara eksplisit tidak mencakup:

- ~~Search/filter pertanyaan~~ ✅ DELIVERED 2026-05-15 (dipromosikan ke v1)
- Feedback "Apakah jawaban ini membantu?" per item (v2)
- Deep-link ke item FAQ spesifik dari halaman lain (v2)
- External help center / live chat / contact support
- FAQ berbasis konten dari CMS remote (Fase 2 opsional)
- Video tutorial embedded
- Tooltip kontekstual per-fitur (scope berbeda, effort jauh lebih besar)
- Notifikasi "FAQ diperbarui"

---

## 13. Implementation Roadmap (jika diterima)

### v1 — MVP (rilis ini)

1. Tambah namespace `faq` ke `messages/id.json` dan `messages/en.json` — 14 pertanyaan, 3 kategori, bilingual
2. Buat route `/settings/faq` dengan halaman FAQ baru
3. Buat `AccordionItem` component (atau inline, cukup sederhana) — single-open, chevron indicator, smooth expand
4. Tambah row "FAQ" di Settings → section Help, di bawah "View Tutorial", ikon `HelpCircle` dari lucide-react
5. Update route map di `tech-spec-global-architecture.md` §2.2 (route ke-24)
6. Update `messages/{id,en}.json` dengan key settings baru untuk label row FAQ
7. ✅ **DELIVERED 2026-05-15** — Search bar di atas halaman FAQ (filter real-time case-insensitive, match `q` + `a`, tombol clear `X`, auto-expand match, hide kategori kosong, empty state friendly). Dipromosikan dari v2. Key i18n baru: `faq.searchPlaceholder`, `faq.searchClear`, `faq.noResults`.

### v2 — Enhancement (rilis berikutnya)

1. Deep-link dari empty state komponen ke item FAQ spesifik via `#anchor` atau query param
2. Feedback "Helpful / Not helpful" per item (state lokal, tidak perlu backend)
3. Tambah pertanyaan baru berdasarkan feedback pengguna

### Fase 2 — Backend (opsional)

1. Endpoint `GET /api/faq?locale=id` mengembalikan array kategori + items
2. Halaman FAQ fetch remote, fallback ke messages.json jika gagal/offline
3. Admin CMS untuk edit konten FAQ tanpa deploy ulang

---

### Agent yang perlu di-spawn (jika diterima)

- `module-settings-dev` untuk: route `/settings/faq`, komponen FAQ, tambah row di Settings
- Tidak butuh `data-consistency-auditor` (tidak menyentuh wallet.balance)
- Tidak butuh `storage-layer-engineer` (tidak ada IndexedDB change)
- Rekomendasikan `/audit-spec` setelah implementasi untuk verifikasi route map sync
- Rekomendasikan `i18n-format-validator` untuk verifikasi namespace `faq` di kedua locale

---

## Decision Log

| Tanggal | Keputusan | Rationale |
|---|---|---|
| 2026-05-15 | Draft dibuat | Research + diskusi awal tentang FAQ in-app untuk PFinTrack |
| 2026-05-15 | Pilih Option A1 (messages.json) over A2 (file terpisah) | Konsisten dengan precedent `changelog` di whats-new, zero infrastructure baru, bilingual otomatis |
| 2026-05-15 | Pilih accordion single-open over full-page per Q | Mobile-first: accordion conserves space, scannable, 14 item tidak butuh search di v1 |
| 2026-05-15 | Tempatkan di section Help bukan section baru | Section Help sudah ada, cukup 2 item (Tutorial + FAQ), tidak perlu section "Support/Bantuan" baru |
| 2026-05-15 | 14 pertanyaan, 3 kategori untuk v1 | Coverage cukup tanpa overwhelming; kategori Privacy paling kritis untuk retensi pengguna baru |
| 2026-05-15 | Promosi Search dari v2 → v1 (DELIVERED) | User request: cari pertanyaan sangat membantu walau hanya 14 item, terutama bilingual. Implementasi ringan (`useMemo` + `.includes`), auto-expand match meningkatkan UX. Empty state ramah dengan placeholder query. Zero impact ke storage / wallet contract. |
| 2026-05-15 | Draft konten 14 jawaban bilingual selesai | Tersimpan di `PROP-0005-faq-content.md`; Open Question §11 item pertama ditutup |
