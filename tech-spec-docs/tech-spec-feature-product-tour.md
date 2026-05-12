# Technical Specification Document
## Feature: Product Tour (Onboarding)

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.2
**Tanggal:** 2026-05-12
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
| **1.2** | **2026-05-12** | **Sinkronisasi §8.2 dengan §4 — §4 ditetapkan sebagai sumber kanonik string tooltip. String WL-1, LN-1, dan RP-1 di §8.2 diperbarui: ditambahkan kalimat instruksi eksplisit "Tap tab ini untuk melanjutkan." di akhir konten, sesuai dengan string yang tercantum di §4.** |
| 1.1 | 2026-05-12 | Keputusan arsitektur navigasi tur: navigasi antar tab bersifat manual (user tap tab sendiri). Open Question #1 di §11 ditutup sebagai RESOLVED. §3 diperbarui dengan catatan instruksi eksplisit di tooltip dan mekanisme pendeteksian elemen oleh Joyride. §4 diperbarui: step WL-1, LN-1, RP-1 ditandai sebagai step transisi tab. §10 diperbarui dengan catatan implementasi terkait konfigurasi Joyride untuk manual navigation. |
| 1.0 | 2026-05-12 | Dokumen awal. Formalisasi user stories US-01 s.d. US-09 ke dalam spesifikasi teknis. Mencakup katalog 13 step tur, kontrak `data-tour`, localStorage contract, styling spec, dan acceptance criteria. |

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Library tur: **`react-joyride` v4**. Dipilih karena dukungan spotlight overlay, placement otomatis, dan locale prop bawaan. |
| 2 | State management tur menggunakan **Zustand** (`lib/store/tour.ts`) agar konsisten dengan pola state aplikasi lainnya (`useAppStore`). State tur **tidak** di-persist ke Zustand persist middleware — persistensi hanya via key `tour_completed` di `localStorage`. |
| 3 | Komponen `ProductTour` adalah **Client Component** dengan guard `useEffect` untuk mencegah render di server (SSR). `react-joyride` memerlukan akses ke DOM dan `window`. |
| 4 | Tur dimulai dari route `/transactions` karena ini adalah tab default dan landing page aplikasi (sesuai §2.2 Global Architecture). |
| 5 | Key `tour_completed` adalah **key tambahan di luar 7 key data finansial utama**. Key ini merupakan UI state murni — tidak berisi data finansial dan tidak perlu dimigrasi ke Fase 2. |
| 6 | Step tur menggunakan atribut `data-tour="<nama>"` sebagai selector target. Pendekatan ini dipilih agar tidak bergantung pada class CSS atau struktur DOM yang dapat berubah saat refactor. |
| 7 | Total step: **13 step** tersebar di 4 modul. Urutan tur dimulai dari Transactions (modul default), diikuti Wallet, Loan, kemudian Report. |
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
│       └── ProductTour.tsx          ← Client Component utama (mount guard SSR)
├── lib/
│   └── store/
│       └── tour.ts                  ← Zustand store (state tur, tidak di-persist)
└── app/
    ├── layout.tsx                   ← ProductTour dimount di sini (global)
    └── settings/
        └── page.tsx                 ← Tambah item "Lihat Tutorial" → dispatch resetTour()
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

### 2.3 Zustand Store: `lib/store/tour.ts`

| State | Tipe | Nilai Awal | Keterangan |
|-------|------|------------|-----------|
| `isTourRunning` | `boolean` | `false` | Mengontrol apakah Joyride sedang aktif |
| `currentStepIndex` | `number` | `0` | Index step yang sedang ditampilkan |
| `tourSteps` | `Step[]` | Array 13 step | Definisi lengkap semua step tur (lihat §4) |

| Action | Perilaku |
|--------|---------|
| `startTour()` | Set `isTourRunning = true`, `currentStepIndex = 0` |
| `stopTour()` | Set `isTourRunning = false` |
| `resetTour()` | Hapus `localStorage['tour_completed']`, lalu panggil `startTour()` |
| `completeTour()` | Simpan `localStorage['tour_completed'] = new Date().toISOString()`, panggil `stopTour()` |
| `skipTour()` | Simpan `localStorage['tour_completed'] = new Date().toISOString()`, panggil `stopTour()` |

> **Catatan:** `resetTour()` dipakai oleh Settings → "Lihat Tutorial". Menghapus key `tour_completed` memungkinkan trigger otomatis berjalan kembali jika user membuka halaman baru, atau langsung memanggil `startTour()` untuk efek instan.

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

### 3.3 Navigasi Antar Tab (DIPERBARUI di v1.1)

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

Total: **13 step**, dibagi menjadi 4 grup modul. Step dieksekusi secara linear.

> **Catatan placement:** Semua step menggunakan `placement: 'auto'` sehingga react-joyride menentukan posisi tooltip secara otomatis berdasarkan posisi elemen target di viewport. Pengecualian dicatat per step jika ada preferensi arah tertentu.

### 4.1 Grup: Transactions (Step 1–3, US-04)

| Step | # Global | Target (`data-tour`) | Konten Tooltip | Placement |
|------|---------|---------------------|----------------|-----------|
| TX-1 | 1 | `"nav-tab-transactions"` | *"Di sini semua catatan keuanganmu — pemasukan, pengeluaran, dan transfer antar wallet."* | `'top'` (di atas bottom nav) |
| TX-2 | 2 | `"fab-transactions"` | *"Tap untuk mencatat transaksi baru. Pilih tipe: Pemasukan, Pengeluaran, atau Transfer."* | `'top-end'` |
| TX-3 | 3 | `"transactions-filter-bar"` | *"Gunakan filter ini untuk mencari transaksi berdasarkan tanggal atau kategori."* | `'bottom'` |

### 4.2 Grup: Wallet (Step 4–6, US-03)

| Step | # Global | Target (`data-tour`) | Konten Tooltip | Placement |
|------|---------|---------------------|----------------|-----------|
| **WL-1** | **4** | **`"nav-tab-wallet"`** | **_"Wallet adalah rekening atau dompetmu. Semua transaksi terhubung ke wallet. Tap tab ini untuk melanjutkan."_** | `'top'` |
| WL-2 | 5 | `"fab-wallet"` | *"Tap di sini untuk menambah wallet pertamamu — misalnya BCA, Tunai, atau GoPay."* | `'top-end'` |
| WL-3 | 6 | `"wallet-first-card"` | *"Saldo wallet diperbarui otomatis setiap kali kamu catat transaksi."* | `'bottom'` |

> **Catatan WL-1 (BARU di v1.1):** Step ini adalah **step transisi tab**. Elemen target `"nav-tab-wallet"` adalah tombol tab Wallet di bottom nav — elemen ini selalu ada di DOM di semua halaman. Dengan men-tap tab Wallet sebagai respons terhadap instruksi di tooltip, user secara natural berpindah ke halaman `/wallet`, sehingga elemen target step WL-2 dan WL-3 menjadi tersedia di DOM. Tur tidak melakukan `router.push()` — navigasi sepenuhnya diinisiasi oleh user.

> **Catatan WL-3:** Target `"wallet-first-card"` merujuk ke kartu wallet pertama dalam daftar. Jika daftar wallet kosong (belum ada wallet), step ini **dilewati secara programatik** (skip step jika elemen target tidak ditemukan di DOM). Implementasi: tambahkan pengecekan ketersediaan elemen sebelum Joyride render step ini, atau gunakan `disableBeacon: true` dan fallback target ke container list.

### 4.3 Grup: Loan (Step 7–9, US-05)

| Step | # Global | Target (`data-tour`) | Konten Tooltip | Placement |
|------|---------|---------------------|----------------|-----------|
| **LN-1** | **7** | **`"nav-tab-loan"`** | **_"Catat utang dan piutangmu di sini — siapa yang berhutang ke kamu, atau kamu yang berhutang. Tap tab ini untuk melanjutkan."_** | `'top'` |
| LN-2 | 8 | `"fab-loan"` | *"Tap untuk mencatat. 'Dipinjamkan' = kamu memberi pinjaman. 'Dipinjam' = kamu yang pinjam."* | `'top-end'` |
| LN-3 | 9 | `"loan-counterparty-list"` | *"Setiap orang atau entitas dikelompokkan di sini. Tap untuk melihat histori pinjaman mereka."* | `'bottom'` |

> **Catatan LN-1 (BARU di v1.1):** Step ini adalah **step transisi tab**. Elemen target `"nav-tab-loan"` adalah tombol tab Loan di bottom nav — selalu ada di DOM di semua halaman. Dengan men-tap tab tersebut, user berpindah ke `/loan` dan elemen target step LN-2 dan LN-3 menjadi tersedia. Tur tidak melakukan `router.push()`.

> **Catatan LN-3:** Jika daftar counterparty kosong, berlaku pola yang sama dengan WL-3 — step dilewati atau fallback ke container list kosong. Empty state tetap merupakan area yang valid untuk di-highlight.

### 4.4 Grup: Report (Step 10–12, US-06)

| Step | # Global | Target (`data-tour`) | Konten Tooltip | Placement |
|------|---------|---------------------|----------------|-----------|
| **RP-1** | **10** | **`"nav-tab-report"`** | **_"Laporan keuanganmu ada di sini — ringkasan pemasukan, pengeluaran, dan saldo. Tap tab ini untuk melanjutkan."_** | `'top'` |
| RP-2 | 11 | `"report-period-tabs"` | *"Lihat laporan per periode: realtime hari ini, bulanan, atau rentang tanggal kustom."* | `'bottom'` |
| RP-3 | 12 | `"report-donut-chart"` | *"Grafik ini menunjukkan distribusi pengeluaranmu per kategori."* | `'bottom'` |

> **Catatan RP-1 (BARU di v1.1):** Step ini adalah **step transisi tab**. Elemen target `"nav-tab-report"` adalah tombol tab Report di bottom nav — selalu ada di DOM di semua halaman. Dengan men-tap tab tersebut, user berpindah ke `/report` dan elemen target step RP-2 dan RP-3 menjadi tersedia. Tur tidak melakukan `router.push()`.

### 4.5 Step Penutup (Step 13)

| Step | # Global | Target (`data-tour`) | Konten Tooltip | Placement |
|------|---------|---------------------|----------------|-----------|
| END | 13 | `"nav-tab-transactions"` | *"Selesai! Kamu sudah mengenal fitur utama PFinTrack. Mulai catat keuanganmu sekarang."* | `'top'` |

> Step terakhir kembali menyorot tab Transactions sebagai call-to-action. Tombol "Selesai" di step ini memanggil `completeTour()`.

---

## 5. Kontrak Atribut `data-tour`

Seluruh atribut berikut **wajib** ditambahkan ke komponen yang sudah ada. Ini adalah kontrak antara spesifikasi tur dan implementasi komponen.

| Atribut `data-tour` | Komponen Target | File Komponen (perkiraan) | Catatan |
|--------------------|----------------|--------------------------|---------|
| `"nav-tab-transactions"` | Tab Transactions di BottomNav | `components/shared/BottomNav.tsx` | Tambahkan ke elemen `<button>` atau `<a>` tab Transactions |
| `"nav-tab-wallet"` | Tab Wallet di BottomNav | `components/shared/BottomNav.tsx` | Tambahkan ke elemen tab Wallet |
| `"nav-tab-loan"` | Tab Loan di BottomNav | `components/shared/BottomNav.tsx` | Tambahkan ke elemen tab Loan |
| `"nav-tab-report"` | Tab Report di BottomNav | `components/shared/BottomNav.tsx` | Tambahkan ke elemen tab Report |
| `"fab-transactions"` | FAB di `/transactions` | `components/transactions/TransactionsFAB.tsx` atau sejenisnya | FAB expandable — tambahkan ke container FAB utama (tombol `+`), bukan sub-action |
| `"fab-wallet"` | FAB di `/wallet` | `app/wallet/page.tsx` atau komponen FAB Wallet | FAB non-expandable — satu tombol |
| `"fab-loan"` | FAB di `/loan` | `components/loan/LoanFAB.tsx` atau sejenisnya | FAB expandable — tambahkan ke tombol `+` utama |
| `"transactions-filter-bar"` | Filter/sort bar di `/transactions` | `components/transactions/FilterSortBar.tsx` atau sejenisnya | Tambahkan ke container filter/sort |
| `"wallet-first-card"` | Kartu wallet pertama | `components/wallet/WalletCard.tsx` | Hanya item pertama dalam list (`index === 0`). Jika list kosong, step dilewati |
| `"loan-counterparty-list"` | Container list counterparty | `app/loan/page.tsx` atau `components/loan/CounterpartyList.tsx` | Tambahkan ke elemen container list, bukan per-item |
| `"report-period-tabs"` | Tab Realtime/Bulanan/Custom | `components/report/PeriodTabs.tsx` atau sejenisnya | Tambahkan ke container tab selector |
| `"report-donut-chart"` | Donut chart | `components/report/DonutChart.tsx` atau sejenisnya | Tambahkan ke container/wrapper chart |

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

| Step # | Konten |
|--------|--------|
| 1 (TX-1) | *"Di sini semua catatan keuanganmu — pemasukan, pengeluaran, dan transfer antar wallet."* |
| 2 (TX-2) | *"Tap untuk mencatat transaksi baru. Pilih tipe: Pemasukan, Pengeluaran, atau Transfer."* |
| 3 (TX-3) | *"Gunakan filter ini untuk mencari transaksi berdasarkan tanggal atau kategori."* |
| 4 (WL-1) | *"Wallet adalah rekening atau dompetmu. Semua transaksi terhubung ke wallet. Tap tab ini untuk melanjutkan."* |
| 5 (WL-2) | *"Tap di sini untuk menambah wallet pertamamu — misalnya BCA, Tunai, atau GoPay."* |
| 6 (WL-3) | *"Saldo wallet diperbarui otomatis setiap kali kamu catat transaksi."* |
| 7 (LN-1) | *"Catat utang dan piutangmu di sini — siapa yang berhutang ke kamu, atau kamu yang berhutang. Tap tab ini untuk melanjutkan."* |
| 8 (LN-2) | *"Tap untuk mencatat. 'Dipinjamkan' = kamu memberi pinjaman. 'Dipinjam' = kamu yang pinjam."* |
| 9 (LN-3) | *"Setiap orang atau entitas dikelompokkan di sini. Tap untuk melihat histori pinjaman mereka."* |
| 10 (RP-1) | *"Laporan keuanganmu ada di sini — ringkasan pemasukan, pengeluaran, dan saldo. Tap tab ini untuk melanjutkan."* |
| 11 (RP-2) | *"Lihat laporan per periode: realtime hari ini, bulanan, atau rentang tanggal kustom."* |
| 12 (RP-3) | *"Grafik ini menunjukkan distribusi pengeluaranmu per kategori."* |
| 13 (END) | *"Selesai! Kamu sudah mengenal fitur utama PFinTrack. Mulai catat keuanganmu sekarang."* |

> **Catatan i18n:** Di Fase 1 semua string tur hardcoded dalam Bahasa Indonesia. Jika aplikasi kelak mendukung multi-bahasa penuh via `next-intl`, string-string ini perlu dipindahkan ke `messages/id.json` dan `messages/en.json`. Namespace yang disarankan: `tour.steps.<stepId>.content`.

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

4. **Navigasi antar tab: manual, bukan programatik (DIPERBARUI di v1.1).** Jangan tambahkan `router.push()` di dalam callback Joyride (`onChange`, `callback`). Navigasi antar tab sepenuhnya diinisiasi oleh user sebagai respons terhadap instruksi di tooltip. Konsekuensi implementasi:
   - Gunakan `disableScrolling: false` agar Joyride dapat scroll ke elemen target jika diperlukan.
   - Jika elemen target sebuah step tidak ada di DOM saat Joyride mencoba render step tersebut, Joyride harus melewati step tersebut secara diam (bukan throw error). Tangani kondisi ini via callback `STATUS.ERROR` — ketika error terjadi karena target tidak ditemukan, panggil `skipStep()` atau lanjut ke step berikutnya, jangan hentikan tur.
   - Step transisi tab (WL-1, LN-1, RP-1) aman karena target mereka (elemen BottomNav) selalu ada di DOM. Step konten per-halaman (WL-2, WL-3, LN-2, LN-3, RP-2, RP-3) baru tersedia setelah user berpindah ke tab yang tepat — pastikan penanganan error di atas sudah terpasang untuk kasus user yang tidak mengikuti urutan.

5. **Penanganan step dengan elemen kondisional.** Step WL-3 (`wallet-first-card`) dan LN-3 (`loan-counterparty-list` saat kosong) bisa menghadapi situasi elemen tidak ada di DOM. Implementasi yang disarankan: validasi ketersediaan elemen sebelum tur dimulai dan filter step yang targetnya tidak ditemukan dari array `tourSteps`.

6. **Jangan gunakan class CSS atau ID sebagai selector.** Gunakan hanya `data-tour` attribute. Ini membuat tur tahan terhadap refactor styling.

7. **Tap target tombol tur.** Tombol Berikutnya, Kembali, Lewati, Selesai wajib memenuhi minimum `44×44px`. Sesuaikan `styles.buttonNext`, `styles.buttonBack`, dll via `styles` prop Joyride jika dimensi default library tidak mencukupi.

8. **Settings item "Lihat Tutorial".** Tambahkan sebagai item baris baru di section yang sesuai di `/settings`. Tidak perlu section khusus — bisa masuk ke section "About" atau section baru "Bantuan". Ikon yang disarankan: `HelpCircle` atau `BookOpen` dari lucide-react.

---

## 11. Pertimbangan & Pertanyaan Terbuka

| # | Topik | Status | Catatan |
|---|-------|--------|---------|
| 1 | **Navigasi antar tab saat tur berlangsung** | **RESOLVED (v1.1): Manual navigation** | Navigasi antar tab adalah **manual** — user tap tab bottom nav sendiri. Tur tidak melakukan programmatic navigation (`router.push()` tidak digunakan di dalam callback Joyride). Step transisi tab (WL-1, LN-1, RP-1) menyorot langsung elemen tab di bottom nav dan menampilkan instruksi eksplisit di konten tooltip ("Tap tab ini untuk melanjutkan."). Joyride menunggu user tap "Berikutnya" sebelum lanjut ke step berikutnya; jika elemen target belum ada di DOM, step dilewati secara diam via penanganan `STATUS.ERROR`. Lihat §3.3 dan §10 item 4 untuk detail implementasi. |
| 2 | **Step WL-3 saat wallet kosong** | Terbuka | Step ini secara eksplisit menyorot "kartu wallet jika ada". Perlu keputusan: (a) skip step ini sepenuhnya saat list kosong, atau (b) arahkan spotlight ke area list kosong dengan pesan alternatif "Setelah kamu menambah wallet, saldo akan terlihat di sini." |
| 3 | **Judul tooltip** | Terbuka | User stories tidak mendefinisikan judul (heading) untuk setiap tooltip — hanya konten. Perlu keputusan apakah setiap tooltip punya heading pendek (mis. "Transactions", "Wallet") atau hanya konten body saja. |
| 4 | **Beacon dot** | Terbuka | react-joyride menampilkan "beacon" (titik animasi berdenyut) sebelum tooltip muncul. Apakah beacon ini diaktifkan atau dinonaktifkan (`disableBeacon: true` per step)? Beacon dapat membingungkan di mobile jika tidak dikenali pengguna. |
| 5 | **Multi-bahasa tur (Fase 2)** | Fase 2 | Di Fase 1 string tur hardcoded Indonesian. Di Fase 2, jika `next-intl` dipakai, string perlu dipindahkan ke `messages/*.json`. Namespace: `tour.steps`. |
| 6 | **Analytics drop-off** | Fase 2 | Melacak di step mana pengguna paling banyak skip berguna untuk optimasi onboarding. Membutuhkan backend — skip untuk Fase 1. |

---

*— End of Technical Specification: Feature Product Tour (v1.2) —*
