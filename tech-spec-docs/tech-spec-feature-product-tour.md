# Technical Specification Document
## Feature: Product Tour (Onboarding)

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.0.0
**Tanggal:** 2026-05-14
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

> **Catatan Scope:**
> Dokumen ini mencakup fitur **Product Tour** — tur interaktif berbasis overlay yang memandu pengguna baru menjelajahi empat modul utama PFinTrack (Wallet, Transactions, Loan, Report). Fitur ini bersifat lintas-modul karena step tur menyentuh elemen UI di setiap tab navigasi.
>
> Dokumen ini mendefinisikan:
> 1. Komponen dan arsitektur state management tur
> 2. Katalog lengkap 13 step tur beserta target, konten, dan placement
> 3. Kontrak atribut `data-tour` yang wajib ditambahkan ke komponen yang sudah ada
> 4. Kontrak key `localStorage` untuk persistensi status tur
> 5. Spesifikasi visual (styling, dimensi tooltip, overlay)
> 6. String locale Indonesia
> 7. Kriteria penerimaan per user story
>
> Implementasi fitur ini memerlukan perubahan minor pada komponen shared (BottomNav, FAB) dan komponen per-modul (daftar lengkap di §5). Komponen-komponen tersebut dibahas dalam dokumen modul masing-masing; dokumen ini hanya mendefinisikan kontrak `data-tour` yang harus dipenuhi.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **1.0.1** | **2026-05-14** | **Fix: hapus native browser tooltip dari tombol tur (Skip, Back, Next, Finish). `react-joyride` menyuntikkan prop `title` ke `skipProps`/`backProps`/`primaryProps` yang memunculkan tooltip browser saat hover. Destructure dan buang `title` + `role` sebelum spread ke elemen `<button>` di `TourTooltip.tsx`. Tambah `type="button"` pada tombol di `TourSkipConfirm`. Tambah catatan implementasi di §10 item 9.** |
| **1.0.0** | **2026-05-14** | **Baseline release. Konsolidasi seluruh revisi sebelumnya (v1.0–v1.3) menjadi versi rilis pertama. Mencakup: arsitektur tur (ProductTour, TourInitializer, TourTooltip, TourBeacon), 22 step linear (Transactions 7, Wallet 6, Loan 3, Report 5, END 1), Zustand store minimalis (`run: boolean` saja), navigasi antar tab manual, kontrak atribut `data-tour`, kontrak key `tour_completed`, styling spec (tooltip, overlay, spotlight), string Indonesia via i18n, 9 user stories dengan acceptance criteria, dan SKIP_TARGETS per grup modul.** |

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Library tur: **`react-joyride` v4**. Dipilih karena dukungan spotlight overlay, placement otomatis, dan locale prop bawaan. |
| 2 | State management tur menggunakan **Zustand** (`src/lib/stores/useTourStore.ts`) agar konsisten dengan pola state aplikasi lainnya (`useAppStore`). State tur **tidak** di-persist ke Zustand persist middleware — persistensi hanya via key `tour_completed` di `localStorage`. |
| 3 | Komponen `ProductTour` adalah **Client Component** dengan guard `useEffect` untuk mencegah render di server (SSR). `react-joyride` memerlukan akses ke DOM dan `window`. |
| 4 | Tur dimulai dari route `/transactions` karena ini adalah tab default dan landing page aplikasi (sesuai §2.2 Global Architecture). |
| 5 | Key `tour_completed` adalah **key tambahan di luar 7 key data finansial utama**. Key ini merupakan UI state murni — tidak berisi data finansial dan tidak perlu dimigrasi ke Fase 2. |
| 6 | Step tur menggunakan atribut `data-tour="<nama>"` sebagai selector target. Pendekatan ini dipilih agar tidak bergantung pada class CSS atau struktur DOM yang dapat berubah saat refactor. |
| 7 | Total step: **22 step** (index 0–21) tersebar di 4 modul + 1 step END. Pembagian per grup: Transactions (7 step, index 0–6), Wallet (6 step, index 7–12), Loan (3 step, index 13–15), Report (5 step, index 16–20), dan 1 step END (index 21). Urutan tur dimulai dari Transactions (modul default), diikuti Wallet, Loan, kemudian Report. |
| 8 | Semua string teks tooltip dan tombol navigasi tur ditulis dalam **Bahasa Indonesia** via `locale` prop `react-joyride`. |
| 9 | Tap di luar area spotlight (overlay gelap) **tidak** menutup tur untuk mencegah penutupan tidak disengaja. Konfigurasi ini diatur via `disableOverlayClose: true` pada Joyride. |
| 10 | Modul Settings menyediakan aksi "Lihat Tutorial" untuk memulai ulang tur secara manual. Ini adalah satu-satunya entry point manual selain trigger otomatis. |

---

## 1. Gambaran Umum & Tujuan

### 1.1 Tujuan Fitur

Product Tour memandu pengguna baru memahami empat modul utama PFinTrack melalui tur interaktif berbasis overlay spotlight. Tur ini:

- Mengurangi friction onboarding bagi pengguna yang belum familiar dengan konsep wallet, transaksi, dan laporan keuangan digital.
- Menyoroti elemen UI kunci (tab navigasi, FAB, area konten) dengan penjelasan kontekstual singkat.
- Dapat diulang kapan saja via Settings tanpa menghapus data pengguna.

### 1.2 Ruang Lingkup (Scope)

**Termasuk dalam scope:**

| Item | Keterangan |
|------|-----------|
| Trigger otomatis | Tur muncul saat pertama kali membuka aplikasi (belum pernah menyelesaikan atau skip) |
| Trigger manual | Via Settings → "Lihat Tutorial" |
| Step tur 4 modul | Wallet (3 step), Transactions (3 step), Loan (3 step), Report (3 step), ditambah 1 step pembuka opsional — total spesifik tercantum di §4 |
| Navigasi tur | Tombol Berikutnya, Kembali, Lewati, Selesai |
| Persistensi status | Key `tour_completed` di localStorage |
| Styling | Mengikuti design tokens PFinTrack (warna, radius, font) |

**Di luar scope (Fase 1):**

| Item | Alasan |
|------|--------|
| Tur per modul terpisah | Kompleksitas berlebihan untuk Fase 1 — satu tur linear mencakup semua modul |
| Video atau animasi tutorial | Bukan kebutuhan onboarding minimal |
| Multi-bahasa tooltip | Hanya Indonesian di Fase 1; bahasa mengikuti locale aplikasi di Fase 2 |
| Analytics tur (drop-off rate) | Backend tidak ada di Fase 1 |
| Tur berbasis halaman (per-route trigger) | Satu tur global lebih sederhana untuk konteks mobile-first |

---

## 2. Arsitektur

### 2.1 Pohon Komponen

```
src/
├── components/
│   └── shared/
│       ├── ProductTour.tsx          ← Client Component utama (mount guard SSR, berisi STEP_TARGETS)
│       ├── TourInitializer.tsx      ← Client Component trigger otomatis (cek tour_completed saat mount)
│       ├── TourTooltip.tsx          ← Custom tooltip component untuk Joyride
│       └── TourBeacon.tsx           ← Custom beacon component untuk Joyride
├── lib/
│   └── stores/
│       ├── useTourStore.ts          ← Zustand store (hanya field `run: boolean`, tidak di-persist)
│       └── tourInterceptContext.ts  ← Context untuk intercept navigasi saat tur berjalan
└── app/
    ├── layout.tsx                   ← ProductTour dan TourInitializer dimount di sini (global)
    └── settings/
        └── page.tsx                 ← Item "Lihat Tutorial" → dispatch resetTour()
```

### 2.2 Komponen: `ProductTour.tsx`

| Aspek | Spesifikasi |
|-------|-------------|
| Tipe | Client Component (`"use client"`) |
| Mount guard | `useEffect` dengan `isMounted` state — `react-joyride` hanya di-render setelah komponen terpasang di DOM (mencegah hydration mismatch) |
| Posisi di tree | Dimount di `app/layout.tsx` sebagai sibling `{children}`, bukan wrapper, agar tersedia di semua route |
| Props | Tidak ada props — seluruh state dari Zustand store |
| Dependensi | `react-joyride`, `useTourStore` |

**Pseudocode alur inisialisasi:**

```
ProductTour mount (useEffect)
              ↓
   Cek localStorage['tour_completed']
        ↓ ADA                ↓ TIDAK ADA
   Tidak jalankan tur    Set isTourRunning = true
   (pernah selesai/skip)  di useTourStore
```

### 2.3 Zustand Store: `src/lib/stores/useTourStore.ts`

Store minimalis — semua state navigasi step dikelola secara internal oleh `react-joyride`. Zustand hanya mengontrol apakah Joyride aktif atau tidak.

| State | Tipe | Nilai Awal | Keterangan |
|-------|------|------------|-----------|
| `run` | `boolean` | `false` | Mengontrol apakah Joyride sedang aktif (`run` prop Joyride) |

> **Catatan implementasi:** Implementasi aktual hanya menggunakan satu field `run` (bukan `isTourRunning`/`currentStepIndex`/`tourSteps` yang pernah direncanakan). Step definitions (`STEP_TARGETS`, `TRANSITION_STEPS`, `SKIP_TARGETS`) didefinisikan sebagai konstanta di dalam file `ProductTour.tsx`, bukan di store. Ini adalah pilihan implementasi yang valid karena state navigasi step dikontrol oleh `react-joyride` secara internal.

| Action | Perilaku |
|--------|---------|
| `startTour()` | Set `run = true` |
| `stopTour()` | Set `run = false` |
| `resetTour()` | Hapus `localStorage['tour_completed']`, set `run = true` (efek instan) |
| `completeTour()` | Simpan `localStorage['tour_completed'] = new Date().toISOString()`, set `run = false` |
| `skipTour()` | Simpan `localStorage['tour_completed'] = new Date().toISOString()`, set `run = false` |

> **Catatan:** `resetTour()` dipakai oleh Settings → "Lihat Tutorial". Menghapus key `tour_completed` dan langsung memanggil `startTour()` membuat tur dimulai ulang dari awal secara instan tanpa perlu reload halaman.

### 2.4 Integrasi di `app/layout.tsx`

`ProductTour` ditempatkan di dalam `<body>` setelah semua provider, agar Zustand store sudah terinisialisasi saat komponen ini mengakses store:

```
<AppProviders>
  {children}
  <ProductTour />   ← di sini, bukan membungkus {children}
</AppProviders>
```

---

## 3. Alur Navigasi Tur

### 3.1 Trigger Otomatis (US-01)

```
User membuka aplikasi (route manapun)
              ↓
   ProductTour.tsx mount → useEffect
              ↓
   Cek: localStorage['tour_completed'] ada?
        ↓ YA                  ↓ TIDAK
   Tidak ada aksi         useTourStore.startTour()
                               ↓
                    react-joyride aktif, step 1 tampil
                    (target: tab Transactions di bottom nav)
```

### 3.2 Navigasi Antar Step (US-07)

```
Step N sedang tampil
              ↓
   ┌──────────────────────────────────┐
   │ Tombol "Berikutnya"              │ → Step N+1 (jika bukan step terakhir)
   │ Tombol "Kembali"                 │ → Step N-1 (jika bukan step pertama)
   │ Tombol "Lewati"                  │ → skipTour() (muncul di semua step kecuali terakhir)
   │ Tombol "Selesai"                 │ → completeTour() (hanya step terakhir)
   │ Tap overlay di luar spotlight    │ → Tidak ada aksi (disableOverlayClose: true)
   └──────────────────────────────────┘
```

### 3.3 Navigasi Antar Tab

Navigasi antar tab saat tur berjalan adalah **manual** — user harus tap tab bottom nav sendiri. Tur **tidak** melakukan programmatic navigation (tidak ada `router.push()` di dalam callback Joyride).

Mekanisme yang berlaku ketika step berpindah ke modul di tab berbeda:

1. Step yang targetnya adalah elemen tab bottom nav (WL-1, LN-1, RP-1) menyorot langsung tombol tab di bottom nav. Dengan men-tap tab tersebut untuk mengikuti instruksi, user secara natural berpindah ke halaman yang tepat.
2. Konten tooltip pada step transisi tab (WL-1, LN-1, RP-1) **wajib menyertakan instruksi eksplisit** di baris pertama atau terakhir teks, contoh: *"Tap tab ini untuk melanjutkan."* (Lihat §4 untuk teks lengkap per step.)
3. Joyride hanya melanjutkan ke step berikutnya (yang targetnya berada di halaman tujuan) **setelah user tap "Berikutnya"**. Jika elemen target step berikutnya belum ada di DOM saat itu, Joyride melewati step tersebut secara diam — bukan melempar error. Konfigurasi yang mendukung ini: `disableScrolling: false` dan penanganan `STATUS.ERROR` di callback (lihat §10 item 4).

```
Step TX-3 sedang tampil (tab Transactions)
              ↓
   User tap "Berikutnya"
              ↓
   Step WL-1 tampil — spotlight pada tab Wallet di bottom nav
   Konten: "Wallet adalah rekening atau dompetmu. ... Tap tab ini untuk melanjutkan."
              ↓
   User tap tab Wallet (navigasi terjadi secara natural)
              ↓
   Halaman /wallet terbuka — elemen di halaman Wallet kini ada di DOM
              ↓
   User tap "Berikutnya" di tooltip WL-1
              ↓
   Step WL-2 tampil — spotlight pada FAB di /wallet
```

> **Catatan:** Karena tab bottom nav selalu ada di DOM di semua halaman (komponen shared), spotlight pada WL-1, LN-1, RP-1 selalu berhasil ditampilkan tanpa bergantung pada route aktif saat itu.

### 3.4 Trigger Manual via Settings (US-02)

```
User navigasi ke /settings
              ↓
   Tap item "Lihat Tutorial"
              ↓
   useTourStore.resetTour()
     ├─ Hapus localStorage['tour_completed']
     └─ startTour() → step 1 tampil
              ↓
   Tur berjalan dari awal
   (bisa diulang berkali-kali)
```

---

## 4. Katalog Step Tur

Total: **22 step** (index 0–21), dibagi menjadi 4 grup modul + 1 step penutup. Step dieksekusi secara linear.

> **Catatan placement:** Setiap step memiliki placement eksplisit. Implementasi menggunakan placement hardcoded per step (bukan `'auto'`), karena posisi bottom nav di bawah memerlukan `'top'` yang konsisten untuk step transisi tab.

> **Catatan TRANSITION_STEPS:** Step dengan index 0, 7, 13, dan 16 adalah step transisi tab — menyorot tombol tab di bottom nav dan menginstruksikan user untuk tap tab tersebut. Setelah user tap tab, elemen di halaman tujuan menjadi tersedia di DOM, dan user tap "Berikutnya" untuk lanjut ke step konten.

> **Catatan SKIP_TARGETS:** Skip per grup tersedia: dari TX (index 0) → WL (index 7), dari WL (index 7) → LN (index 13), dari LN (index 13) → RP (index 16), dari RP (index 16) → END (index 21).

### 4.1 Grup: Transactions (Index 0–6)

| Index | Key | Target (`data-tour`) | Placement | Catatan |
|-------|-----|---------------------|-----------|---------|
| 0 | `tx1` | `"nav-tab-transactions"` | `'top'` | **Transisi tab** — step pertama tur, menyorot tab Transactions |
| 1 | `tx2` | `"tx-date-nav"` | `'bottom'` | Date navigator di header Transaction List |
| 2 | `tx3` | `"tx-summary"` | `'bottom'` | Summary bar (Income/Expenses/Balance) |
| 3 | `tx4` | `"fab-transactions"` | `'top'` | FAB expandable di Transaction List |
| 4 | `tx5` | `"transactions-filter-bar"` | `'left'` | Filter/sort control |
| 5 | `tx6` | `"tx-export"` | `'bottom'` | Ikon export Excel di header |
| 6 | `tx7` | `"tx-history"` | `'bottom'` | Ikon navigasi ke History screen |

### 4.2 Grup: Wallet (Index 7–12)

| Index | Key | Target (`data-tour`) | Placement | Catatan |
|-------|-----|---------------------|-----------|---------|
| 7 | `wl1` | `"nav-tab-wallet"` | `'top'` | **Transisi tab** — instruksikan user tap ke Wallet |
| 8 | `wl2` | `"wl-total-balance"` | `'bottom'` | Card Total Balance di Wallet List |
| 9 | `wl3` | `"wl-filter-type"` | `'bottom'` | Filter tipe wallet |
| 10 | `wl4` | `"wl-sort"` | `'bottom'` | Sort control wallet |
| 11 | `wl5` | `"fab-wallet"` | `'top'` | FAB tambah wallet baru |
| 12 | `wl6` | `"wallet-first-card"` | `'bottom'` | Kartu wallet pertama. Jika list kosong: step dilewati secara diam (Joyride melewati step jika elemen tidak ditemukan di DOM) |

### 4.3 Grup: Loan (Index 13–15)

| Index | Key | Target (`data-tour`) | Placement | Catatan |
|-------|-----|---------------------|-----------|---------|
| 13 | `ln1` | `"nav-tab-loan"` | `'top'` | **Transisi tab** — instruksikan user tap ke Loan |
| 14 | `ln2` | `"fab-loan"` | `'top'` | FAB expandable di Loan List |
| 15 | `ln3` | `"loan-counterparty-list"` | `'bottom'` | Container list counterparty. Jika kosong: step tetap valid (highlight area kosong) |

### 4.4 Grup: Report (Index 16–20)

| Index | Key | Target (`data-tour`) | Placement | Catatan |
|-------|-----|---------------------|-----------|---------|
| 16 | `rp1` | `"nav-tab-report"` | `'top'` | **Transisi tab** — instruksikan user tap ke Report |
| 17 | `rp2` | `"report-period-tabs"` | `'bottom'` | Tab Realtime/Monthly/Custom |
| 18 | `rp3` | `"report-donut-mode"` | `'bottom'` | Toggle mode Expense/Income di atas donut chart |
| 19 | `rp4` | `"report-donut-chart"` | `'bottom'` | Donut chart |
| 20 | `rp5` | `"report-custom-fab"` | `'top'` | FAB di tab Custom. Dilewati secara diam jika user tidak berada di tab Custom saat step ini ditampilkan |

### 4.5 Step Penutup (Index 21)

| Index | Key | Target (`data-tour`) | Placement | Catatan |
|-------|-----|---------------------|-----------|---------|
| 21 | `end` | `"nav-tab-transactions"` | `'top'` | Step penutup, menyorot kembali tab Transactions. Tombol "Selesai" → `completeTour()` |

---

## 5. Kontrak Atribut `data-tour`

Seluruh atribut berikut **wajib** ada di komponen terkait. Ini adalah kontrak antara spesifikasi tur dan implementasi komponen.

| Atribut `data-tour` | Komponen Target | Catatan |
|--------------------|----------------|---------|
| `"nav-tab-transactions"` | Tab Transactions di BottomNav | Digunakan pada step index 0 dan 21 |
| `"nav-tab-wallet"` | Tab Wallet di BottomNav | Step transisi index 7 |
| `"nav-tab-loan"` | Tab Loan di BottomNav | Step transisi index 13 |
| `"nav-tab-report"` | Tab Report di BottomNav | Step transisi index 16 |
| `"tx-date-nav"` | Date Navigator di header Transaction List | Step index 1 |
| `"tx-summary"` | Summary bar (Income/Expenses/Balance) | Step index 2 |
| `"fab-transactions"` | FAB expandable di `/transactions` | FAB utama (tombol `+`), bukan sub-action. Step index 3 |
| `"transactions-filter-bar"` | Sort/filter control di Transaction List | Step index 4 |
| `"tx-export"` | Ikon export di header Transaction List | Step index 5 |
| `"tx-history"` | Ikon navigasi ke History | Step index 6 |
| `"wl-total-balance"` | Card Total Balance di Wallet List | Step index 8 |
| `"wl-filter-type"` | Filter tipe wallet | Step index 9 |
| `"wl-sort"` | Sort control di Wallet List | Step index 10 |
| `"fab-wallet"` | FAB di `/wallet` | Step index 11 |
| `"wallet-first-card"` | Kartu wallet pertama dalam list | Hanya `index === 0`. Jika kosong: step dilewati. Step index 12 |
| `"fab-loan"` | FAB expandable di `/loan` | FAB utama. Step index 14 |
| `"loan-counterparty-list"` | Container list counterparty | Bukan per-item. Step index 15 |
| `"report-period-tabs"` | Tab Realtime/Monthly/Custom | Step index 17 |
| `"report-donut-mode"` | Toggle Expense/Income di atas donut | Step index 18 |
| `"report-donut-chart"` | Donut chart container | Step index 19 |
| `"report-custom-fab"` | FAB di tab Custom Report | Dilewati jika tidak di tab Custom. Step index 20 |

> **Aturan penerapan:** Atribut `data-tour` hanya berfungsi sebagai selector — tidak memiliki efek visual atau logika. Penambahan atribut ini tidak boleh mengubah perilaku atau tampilan komponen yang sudah ada.

---

## 6. Kontrak localStorage

### 6.1 Key `tour_completed`

| Properti | Nilai |
|----------|-------|
| **Key** | `tour_completed` |
| **Tipe nilai** | String — ISO 8601 timestamp UTC |
| **Contoh nilai** | `"2026-05-12T09:30:00.000Z"` |
| **Di-set kapan** | Saat user menyelesaikan tur (tap "Selesai" di step terakhir) atau skip (tap "Lewati" di step manapun) |
| **Dihapus kapan** | Saat user tap "Lihat Tutorial" di Settings (`resetTour()`) |
| **Jika tidak ada** | Tur otomatis ditampilkan saat aplikasi dibuka |
| **Jika user clear storage** | Key hilang → tur akan muncul kembali otomatis |

### 6.2 Posisi dalam Inventaris localStorage

Key `tour_completed` berada **di luar** 7 key data finansial utama PFinTrack (lihat Global Architecture §7). Key ini adalah UI state murni:

| Kategori | Key | Keterangan |
|----------|-----|-----------|
| Data finansial (7 key) | `wallets`, `wallet_balance_history`, `transactions`, `loan_counterparties`, `loan_entries`, `custom_reports` | Tidak terkait tur |
| State aplikasi | `anon_id`, `app_state`, `pfintrack_demo_mode` | Tidak terkait tur |
| **UI state tur (baru)** | **`tour_completed`** | **Tidak berisi data finansial. Tidak dimigrasi ke Fase 2.** |

> **Konsekuensi migrasi Fase 2:** Key `tour_completed` **tidak** disertakan dalam payload migrasi ke backend (lihat Global Architecture §5.3). Di Fase 2, status tur dapat disimpan di profil user jika diinginkan — namun itu keputusan Fase 2.

---

## 7. Spesifikasi Styling

### 7.1 Tooltip

| Properti | Nilai | Token / Referensi |
|----------|-------|-------------------|
| Lebar maksimal | `300px` | — |
| Lebar minimal | `240px` | — |
| Background | `var(--bg-card)` | Glassmorphism card (lihat Global Architecture §4.5a) |
| Border | `1px solid var(--border-default)` | — |
| Border radius | `16px` | Konsisten dengan card (`rounded-[16px]`) |
| Box shadow | `var(--shadow-md)` | — |
| Padding dalam | `16px` | Konsisten dengan container padding |
| Font teks konten | `text-[14px]`, `color: var(--text-primary)` | — |
| Font tombol | `text-[13px] font-medium` | — |

### 7.2 Tombol Navigasi Tur

| Tombol | Background | Teks | Border Radius |
|--------|-----------|------|--------------|
| "Berikutnya" | `var(--color-brand)` | `var(--text-on-primary)` | `8px` |
| "Kembali" | Transparan | `var(--text-secondary)` | `8px` |
| "Lewati" | Transparan | `var(--text-tertiary)` | `8px` |
| "Selesai" | `var(--color-brand)` | `var(--text-on-primary)` | `8px` |

Tap target minimum semua tombol: **44×44px** (sesuai Global Architecture §4.5).

### 7.3 Overlay & Spotlight

| Properti | Nilai | Keterangan |
|----------|-------|-----------|
| Overlay background | `rgba(0, 0, 0, 0.55)` | Semi-transparan, tidak terlalu gelap agar konteks halaman masih terlihat |
| Spotlight border radius | `12px` | Menyesuaikan radius elemen target yang umumnya `rounded-[12px]` atau `rounded-[16px]` |
| Spotlight padding | `6px` | Ruang antara elemen target dan batas spotlight |
| Klik overlay | Dinonaktifkan (`disableOverlayClose: true`) | Mencegah penutupan tidak disengaja (US-07) |

### 7.4 Indikator Progres Step

| Properti | Nilai |
|----------|-------|
| Pola | Dot indicator (titik-titik) — bawaan react-joyride |
| Warna dot aktif | `var(--color-brand)` |
| Warna dot non-aktif | `var(--text-tertiary)` |
| Posisi | Di dalam tooltip, di atas tombol navigasi |

### 7.5 Posisi Tooltip terhadap Bottom Nav

Bottom Navigation memiliki ketinggian `60px + safe area inset bottom` (Global Architecture §3.2). Tooltip yang menyorot elemen bottom nav (step TX-1, WL-1, LN-1, RP-1, END) wajib menggunakan `placement: 'top'` agar tooltip muncul di atas elemen dan tidak tertutup safe area perangkat. react-joyride menangani kalkulasi ini otomatis jika placement disetel ke `'top'` atau `'auto'`.

---

## 8. String Locale (Indonesian)

Semua string berikut disetel via prop `locale` pada komponen `<Joyride>`.

### 8.1 Tombol Navigasi

| Key Prop Joyride | Nilai String Indonesia |
|-----------------|----------------------|
| `locale.back` | `"Kembali"` |
| `locale.next` | `"Berikutnya"` |
| `locale.skip` | `"Lewati"` |
| `locale.last` | `"Selesai"` |
| `locale.close` | `"Tutup"` |
| `locale.open` | `"Buka"` |

### 8.2 Konten Tooltip per Step

String diambil dari `messages/id.json` namespace `tour.steps.<key>` via `useTranslations('tour')`. Sumber kebenaran adalah file i18n, bukan hardcode di komponen.

| Index | Key | Konten (Bahasa Indonesia) |
|-------|-----|--------------------------|
| 0 | `tx1` | *"Di sini semua catatan keuanganmu — pemasukan, pengeluaran, dan transfer antar dompet. Ketuk tab ini untuk memulai."* |
| 1 | `tx2` | *"Geser kiri/kanan atau ketuk panah untuk pindah tanggal. Ketuk tanggal untuk membuka kalender."* |
| 2 | `tx3` | *"Total pemasukan, pengeluaran, dan saldo hari ini ditampilkan di sini."* |
| 3 | `tx4` | *"Ketuk untuk mencatat transaksi baru. Pilih tipe: Pemasukan, Pengeluaran, atau Transfer."* |
| 4 | `tx5` | *"Ketuk tombol ini untuk mengubah urutan tampilan — berdasarkan tanggal atau nominal transaksi."* |
| 5 | `tx6` | *"Ketuk untuk mengekspor semua transaksi ke file Excel."* |
| 6 | `tx7` | *"Ketuk untuk melihat riwayat semua transaksi di semua tanggal."* |
| 7 | `wl1` | *"Dompet adalah rekening atau dompetmu. Semua transaksi terhubung ke dompet. Ketuk tab ini untuk melanjutkan."* |
| 8 | `wl2` | *"Kartu ini menampilkan total saldo dari semua dompetmu."* |
| 9 | `wl3` | *"Filter dompet berdasarkan tipe — bank, e-wallet, tabungan, dan lainnya."* |
| 10 | `wl4` | *"Urutkan dompet berdasarkan nama atau saldo agar mudah ditemukan."* |
| 11 | `wl5` | *"Ketuk untuk menambah dompet baru — rekening bank, tunai, GoPay, dan lainnya."* |
| 12 | `wl6` | *"Ketuk kartu dompet untuk melihat detail, edit saldo, atau riwayat transaksinya."* |
| 13 | `ln1` | *"Catat utang dan piutangmu di sini — siapa yang berhutang ke kamu, atau kamu yang berhutang. Ketuk tab ini untuk melanjutkan."* |
| 14 | `ln2` | *"'Catat Utang': kamu berhutang ke orang atau orang melunasi piutangnya ke kamu. 'Pinjamkan': kamu meminjamkan uang ke orang atau kamu melunasi utangmu."* |
| 15 | `ln3` | *"Setiap orang atau entitas dikelompokkan di sini. Ketuk untuk melihat histori pinjaman mereka."* |
| 16 | `rp1` | *"Laporan keuanganmu ada di sini — ringkasan pemasukan, pengeluaran, dan saldo. Ketuk tab ini untuk melanjutkan."* |
| 17 | `rp2` | *"Lihat laporan per periode: realtime hari ini, bulanan, atau rentang tanggal kustom."* |
| 18 | `rp3` | *"Beralih antara tampilan Pengeluaran dan Pemasukan untuk melihat grafik breakdown masing-masing."* |
| 19 | `rp4` | *"Grafik ini menampilkan distribusi pengeluaran atau pemasukan per kategori. Ketuk potongan untuk memfilter daftar di bawah."* |
| 20 | `rp5` | *"Ketuk untuk membuat laporan kustom dengan rentang tanggal tertentu."* |
| 21 | `end` | *"Selesai! Sekarang kamu udah kenal PFinTrack. Yuk mulai catat!"* |

> **Catatan i18n:** String tur disimpan di `messages/id.json` dan `messages/en.json` namespace `tour.steps`, diakses via `useTranslations('tour')`. Perubahan teks dilakukan di file i18n, bukan di komponen.

---

## 9. Kriteria Penerimaan per User Story

### US-01 — Trigger Tour Otomatis

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Tur muncul saat `tour_completed` tidak ada di localStorage | ✅ Step pertama tampil otomatis saat app dibuka |
| 2 | Tur tidak muncul jika `tour_completed` sudah ada | ✅ Tidak ada overlay/tooltip saat buka aplikasi |
| 3 | Tur dimulai dari tab Transactions | ✅ Step pertama menyorot tab Transactions di bottom nav |
| 4 | Tombol "Lewati" tersedia di semua step | ✅ "Lewati" muncul di step 1 s.d. 12 |

### US-02 — Tour Bisa Diulang Manual

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Item "Lihat Tutorial" muncul di `/settings` | ✅ Ada di daftar menu Settings |
| 2 | Tap item me-reset status dan mulai tur | ✅ `tour_completed` dihapus, step 1 tampil |
| 3 | Tur dapat diulang berkali-kali | ✅ Setiap tap "Lihat Tutorial" memulai ulang dari step 1 |

### US-03 — Tour Modul Wallet

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Step 4 menyorot tab Wallet | ✅ Spotlight pada elemen `data-tour="nav-tab-wallet"` |
| 2 | Step 5 menyorot FAB di `/wallet` | ✅ Spotlight pada elemen `data-tour="fab-wallet"` |
| 3 | Step 6 menyorot kartu wallet pertama | ✅ Spotlight pada elemen `data-tour="wallet-first-card"` (jika ada); dilewati jika list kosong |
| 4 | Konten teks sesuai spesifikasi §8.2 | ✅ Teks tooltip identik dengan kolom Konten di §4.2 |

### US-04 — Tour Modul Transactions

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Step 1 menyorot tab Transactions | ✅ Spotlight pada `data-tour="nav-tab-transactions"` |
| 2 | Step 2 menyorot FAB di `/transactions` | ✅ Spotlight pada `data-tour="fab-transactions"` |
| 3 | Step 3 menyorot filter/sort bar | ✅ Spotlight pada `data-tour="transactions-filter-bar"` |
| 4 | Konten teks sesuai spesifikasi §8.2 | ✅ Teks tooltip identik dengan kolom Konten di §4.1 |

### US-05 — Tour Modul Loan

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Step 7 menyorot tab Loan | ✅ Spotlight pada `data-tour="nav-tab-loan"` |
| 2 | Step 8 menyorot FAB di `/loan` | ✅ Spotlight pada `data-tour="fab-loan"` |
| 3 | Step 9 menyorot list counterparty | ✅ Spotlight pada `data-tour="loan-counterparty-list"` |
| 4 | Konten teks sesuai spesifikasi §8.2 | ✅ Teks tooltip identik dengan kolom Konten di §4.3 |

### US-06 — Tour Modul Report

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Step 10 menyorot tab Report | ✅ Spotlight pada `data-tour="nav-tab-report"` |
| 2 | Step 11 menyorot tab periode | ✅ Spotlight pada `data-tour="report-period-tabs"` |
| 3 | Step 12 menyorot donut chart | ✅ Spotlight pada `data-tour="report-donut-chart"` |
| 4 | Konten teks sesuai spesifikasi §8.2 | ✅ Teks tooltip identik dengan kolom Konten di §4.4 |

### US-07 — Navigasi Tour

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | "Berikutnya" tersedia di step 1 s.d. 12 | ✅ Tombol muncul dan memajukan step |
| 2 | "Kembali" tersedia di step 2 s.d. 13 | ✅ Tombol muncul dan memundurkan step; tidak ada di step 1 |
| 3 | "Lewati" tersedia di step 1 s.d. 12 | ✅ Tombol muncul; tidak ada di step 13 |
| 4 | "Selesai" hanya di step 13 | ✅ Hanya step terakhir menampilkan "Selesai", bukan "Berikutnya" |
| 5 | Tap overlay tidak menutup tur | ✅ `disableOverlayClose: true` diterapkan |

### US-08 — Tour Ramah Mobile

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Lebar tooltip ≤ 300px | ✅ CSS `max-width: 300px` diterapkan |
| 2 | Tooltip tidak menutupi bottom nav (step nav-tab) | ✅ Placement `'top'` untuk step yang menyorot bottom nav |
| 3 | Overlay semi-transparan terlihat jelas | ✅ `rgba(0, 0, 0, 0.55)` dengan spotlight kontras |
| 4 | Tur berfungsi di viewport 375px, 390px, 430px | ✅ Diuji di tiga breakpoint mobile |

### US-09 — Persistensi Status Tour

| # | Kriteria | Kondisi Pass |
|---|----------|-------------|
| 1 | Menyelesaikan tur menulis `tour_completed` ke localStorage | ✅ Value ISO timestamp tersimpan |
| 2 | Skip tur menulis `tour_completed` ke localStorage | ✅ Value ISO timestamp tersimpan |
| 3 | Setelah `tour_completed` ada, tur tidak muncul otomatis | ✅ Tidak ada overlay saat buka aplikasi kembali |
| 4 | Clear localStorage menghilangkan `tour_completed` | ✅ Tur akan muncul kembali otomatis |

---

## 10. Catatan untuk Tim Developer

1. **Tidak ada route baru.** Fitur ini tidak menambahkan route. Seluruh tur berjalan di atas halaman yang sudah ada.

2. **Tidak ada key localStorage data finansial baru.** Key `tour_completed` adalah UI state murni, terpisah dari 7 key data finansial. Tidak memengaruhi migrasi Fase 2.

3. **SSR guard wajib.** `react-joyride` mengakses `document` dan `window`. Tanpa `useEffect` + `isMounted` guard, aplikasi akan crash saat server render (Next.js App Router). Pattern yang benar:

```tsx
const [isMounted, setIsMounted] = useState(false)
useEffect(() => { setIsMounted(true) }, [])
if (!isMounted) return null
```

4. **Navigasi antar tab: manual, bukan programatik.** Jangan tambahkan `router.push()` di dalam callback Joyride (`onChange`, `callback`). Navigasi antar tab sepenuhnya diinisiasi oleh user sebagai respons terhadap instruksi di tooltip. Konsekuensi implementasi:
   - Gunakan `disableScrolling: false` agar Joyride dapat scroll ke elemen target jika diperlukan.
   - Jika elemen target sebuah step tidak ada di DOM saat Joyride mencoba render step tersebut, Joyride harus melewati step tersebut secara diam (bukan throw error). Tangani kondisi ini via callback `STATUS.ERROR` — ketika error terjadi karena target tidak ditemukan, panggil `skipStep()` atau lanjut ke step berikutnya, jangan hentikan tur.
   - Step transisi tab (WL-1, LN-1, RP-1) aman karena target mereka (elemen BottomNav) selalu ada di DOM. Step konten per-halaman (WL-2, WL-3, LN-2, LN-3, RP-2, RP-3) baru tersedia setelah user berpindah ke tab yang tepat — pastikan penanganan error di atas sudah terpasang untuk kasus user yang tidak mengikuti urutan.

5. **Penanganan step dengan elemen kondisional.** Step WL-3 (`wallet-first-card`) dan LN-3 (`loan-counterparty-list` saat kosong) bisa menghadapi situasi elemen tidak ada di DOM. Implementasi yang disarankan: validasi ketersediaan elemen sebelum tur dimulai dan filter step yang targetnya tidak ditemukan dari array `tourSteps`.

6. **Jangan gunakan class CSS atau ID sebagai selector.** Gunakan hanya `data-tour` attribute. Ini membuat tur tahan terhadap refactor styling.

7. **Tap target tombol tur.** Tombol Berikutnya, Kembali, Lewati, Selesai wajib memenuhi minimum `44×44px`. Sesuaikan `styles.buttonNext`, `styles.buttonBack`, dll via `styles` prop Joyride jika dimensi default library tidak mencukupi.

8. **Settings item "Lihat Tutorial".** Tambahkan sebagai item baris baru di section yang sesuai di `/settings`. Tidak perlu section khusus — bisa masuk ke section "About" atau section baru "Bantuan". Ikon yang disarankan: `HelpCircle` atau `BookOpen` dari lucide-react.

9. **Stripping `title` dari props Joyride.** `react-joyride` menyuntikkan prop `title` berisi teks tombol ke dalam `backProps`, `primaryProps`, dan `skipProps`. Prop ini menghasilkan native browser tooltip saat hover — tidak diinginkan karena tombol sudah memiliki visible text label. Di `TourTooltip.tsx`, destructure `title` (dan `role`, yang redundan pada elemen `<button>`) sebelum spread ke elemen tombol:
   ```tsx
   const { title: _skipTitle, role: _skipRole, ...skipRest } = skipProps;
   const { title: _backTitle, role: _backRole, ...backRest } = backProps;
   const { title: _primaryTitle, role: _primaryRole, onClick: primaryOnClick, ...primaryRest } = primaryProps;
   ```
   Aturan umum: tooltip (native atau custom) hanya dipakai pada icon-only button tanpa visible text label.

---

## 11. Keputusan Desain (Resolved)

Semua pertimbangan dan pertanyaan terbuka di iterasi sebelumnya sudah diselesaikan untuk release v1.0.0:

| # | Topik | Keputusan |
|---|-------|-----------|
| 1 | Navigasi antar tab saat tur berlangsung | **Manual navigation.** Tur tidak melakukan `router.push()` di dalam callback Joyride. Step transisi tab (WL-1, LN-1, RP-1) menyorot langsung elemen tab di bottom nav dengan instruksi eksplisit di tooltip ("Ketuk tab ini untuk melanjutkan."). Jika target belum ada di DOM, step dilewati via `STATUS.ERROR`. |
| 2 | Step WL-3 saat wallet kosong | **Skip step otomatis** via `TARGET_NOT_FOUND` handler di `ProductTour.handleEvent` — step dilanjutkan ke berikutnya tanpa pesan alternatif. |
| 3 | Judul tooltip | **Hanya body content** — tooltip menampilkan konten saja tanpa heading terpisah, sesuai desain `TourTooltip` di `src/components/shared/TourTooltip.tsx`. |
| 4 | Beacon dot | **Dinonaktifkan** — `disableBeacon: true` di setiap step (lihat `STEP_TARGETS` di `ProductTour.tsx`). |
| 5 | Multi-bahasa tur | **Sudah diimplementasi** di v1.0.0 — string tur disimpan di `messages/id.json` dan `messages/en.json` namespace `tour.steps`, diakses via `useTranslations('tour')`. |
| 6 | Analytics drop-off | **Defer ke Fase 2** — perlu backend untuk tracking; tidak ada di scope Fase 1. |

---

*— End of Technical Specification: Feature Product Tour (v1.0.0) —*
