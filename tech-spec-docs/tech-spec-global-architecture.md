# Technical Specification Document
## Global Architecture

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.1.1
**Tanggal:** 2026-05-14
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **1.1.5** | **2026-05-15** | **Tambah route `/settings/whats-new` — in-app changelog. Halaman menampilkan timeline rilis (badge versi, tanggal, tagline, intro, bullet list improvements) dengan badge "Versimu sekarang" pada entry yang match `APP_VERSION` (`src/lib/version.ts`). Konten dilokalisasi via namespace `changelog` di `messages/{id,en}.json` (bilingual). Row "About → PFinTrack" di `/settings` diubah dari static `<div>` jadi `<button>` clickable yang navigasi ke route ini. Total route: 22 → 23.** |
| **1.1.4** | **2026-05-15** | **E2E test sync setelah lokalisasi `aria-label` via `next-intl` (commit 121075e). Aria-label spesifik (mis. `"Delete entry"`, `"Delete wallet"`, `"Delete counterparty"`, `"Go back"`, `"Clear search"`, `"Mark as paid"`) sudah diganti dengan key generik dari namespace `common` (`"Delete"`, `"Back"`, `"Clear"`, `"Mark as Paid Off"`). Tests di `loan-edit-delete.spec.ts`, `wallet-delete.spec.ts`, `wallet.spec.ts`, `transactions-history.spec.ts`, `misc-coverage.spec.ts`, dan `settings-report.spec.ts` diupdate menyesuaikan label aktual yang dirender pada default locale `en`. Tombol konfirmasi di dialog di-scope ke `getByRole("alertdialog")` agar tidak bentrok dengan tombol pemicu (header). Indonesian-text assertion di `misc-coverage.spec.ts` (offline page heading, nav links) diubah ke versi English karena default locale = `en`. Aturan baru: kalau menambah `aria-label` baru via `next-intl`, pastikan key-nya stabil lintas locale ATAU update E2E test menggunakan label rendered locale `en`. ✅ FIXED 2026-05-15.** |
| **1.1.3** | **2026-05-15** | **Tambah shared component `IconBadge` (`src/components/shared/IconBadge.tsx`). Replace semua inline icon-with-background di WalletCard, CounterpartyListItem, Settings, dan Settings/Report. Tabel shared components di §3 diperbarui.** |
| **1.1.2** | **2026-05-14** | **Replace `<div role="dialog">` dengan elemen semantik `<dialog open>` native HTML5 di rename dialog `/loan/[counterpartyId]`. §12.6 diperbarui: aturan `role="dialog"` dihapus (redundant), panduan penggunaan `<dialog>` native ditambahkan.** |
| **1.1.1** | **2026-05-14** | **Fix aksesibilitas heading skip-level: `<h3>` di `EmptyState` dan `CategoryTrendChart` diubah ke `<h2>` karena keduanya muncul langsung di bawah `<h1>` tanpa `<h2>` di antaranya. §12.2 diperbarui dengan aturan eksplisit untuk `EmptyState` dan komponen chart.** |
| **1.1.0** | **2026-05-14** | **Semantic HTML audit & fix. Ditambahkan §12 Konvensi Semantic HTML. Perubahan kode: list transaksi/wallet/loan pakai `<ul>`+`<li>`; Settings section labels `<p>` → `<h2>`; chart wrappers `<div>` → `<figure>`+`<figcaption>`; DemoBanner `<div>` → `<aside>`; SummaryBar `<div>` → `<section aria-label>`; DonutChart chart area diberi `role="img" aria-label`; rename dialog di loan detail ditambah `role="dialog" aria-modal aria-labelledby`; overlay backdrop history picker `<div onClick>` → `<button type="button">`; `transactions.summary.ariaLabel` ditambah ke en.json & id.json.** |
| **1.0.0** | **2026-05-14** | **Baseline release. Konsolidasi seluruh revisi sebelumnya menjadi versi rilis pertama. Mencakup: arsitektur Next.js App Router, 22 route (termasuk `/settings/report` dan `/~offline`), 5 tab Bottom Navigation, inventaris lengkap key state aplikasi (termasuk `pfintrack_color_theme`, `tour_completed`, `storage_version`), shared components (`SplashScreen`, `ColorThemeProvider`, `TourInitializer`, `ThemeToggle`, `TypeToConfirmDialog`), Settings module (`/settings` dan `/settings/report`), demo mode, color theme (blue/pink), producer-consumer contract, dan migrasi IndexedDB (PROP-0001).** |

---

> **Catatan Scope:**
> Dokumen ini adalah **spesifikasi induk** yang mendefinisikan:
> 1. Konteks dan tujuan aplikasi secara keseluruhan
> 2. Arsitektur teknis Fase 1 (anonymous, localStorage)
> 3. Komponen shared (Bottom Navigation, Header, dialog)
> 4. Standar lintas-modul (format tanggal, format angka, warna, ikon)
> 5. Hubungan antar modul (producer–consumer)
> 6. Inventaris seluruh key di localStorage
> 7. Rencana migrasi ke Fase 2 (backend + auth)
>
> Setiap modul (Wallet, Transactions, Loan, Report) memiliki dokumen sendiri yang fokus pada logika internal masing-masing.

---

## 1. Tujuan & Konteks Aplikasi

### 1.1 Tujuan

**PFinTrack — Personal Finance Tracker** adalah web app mobile-first untuk membantu pengguna individual mengelola keuangan pribadi, mencakup:

- Multi-wallet (rekening bank, e-wallet, investasi, tabungan, aset digital)
- Pencatatan transaksi: income, expense, transfer antar wallet
- Pencatatan utang-piutang dengan orang lain (loan: give & get)
- Laporan keuangan multi-periode: realtime, monthly, dan custom

### 1.2 Filosofi Desain

| Prinsip | Implementasi |
|---------|--------------|
| **Privacy-first** | Tidak ada akun atau autentikasi di Fase 1. Semua data tersimpan di browser pengguna. |
| **Mobile-first** | UI dirancang untuk layar 375px–430px. Desktop sekunder, bukan prioritas. |
| **Frictionless onboarding** | Pengguna langsung pakai tanpa daftar. Bisa "claim" akun nanti tanpa kehilangan data. |
| **Migration-ready** | Struktur data Fase 1 dirancang identik dengan skema database Fase 2. |
| **Modular** | Setiap modul punya key localStorage yang jelas batasannya. |
| **Computed-on-the-fly** | Agregat (total balance, summary, outstanding, report) dihitung saat dibutuhkan, tidak di-cache, untuk mencegah desync. |

---

## 2. Arsitektur Aplikasi (Fase 1)

### 2.1 Stack Teknologi

| Komponen | Pilihan |
|----------|---------|
| Framework | **Next.js (App Router)** |
| Bahasa | TypeScript |
| Penyimpanan Data | **`localStorage` browser** |
| Autentikasi | Tidak ada (anonymous via UUID v4) |
| Backend / API | Tidak ada di Fase 1 |
| Hosting | Static / SSG (mis. Vercel, Netlify, Cloudflare Pages) |

### 2.2 Daftar Halaman (Route Map)

| Route | Module | Deskripsi |
|-------|--------|-----------|
| `/` | — | Redirect ke `/transactions` (default landing) |
| `/transactions` | Transactions | Daftar transaksi (root tab) |
| `/transactions/add/income` | Transactions | Form tambah income |
| `/transactions/add/expense` | Transactions | Form tambah expense |
| `/transactions/add/transfer` | Transactions | Form tambah transfer |
| `/transactions/[id]` | Transactions | Edit/delete transaksi |
| `/transactions/history` | Transactions | History + search seluruh transaksi |
| `/wallet` | Wallet | Daftar wallet |
| `/wallet/add` | Wallet | Form tambah wallet baru |
| `/wallet/[id]` | Wallet | Edit/delete wallet |
| `/report` | Report | Tab Realtime / Monthly / Custom |
| `/report/custom/add` | Report | Form tambah custom report |
| `/report/custom/[id]/edit` | Report | Edit/delete custom report |
| `/report/detail` | Report | Drill-down detail per periode |
| `/report/category` | Report | Category trend drill-down (6 bulan per kategori) |
| `/loan` | Loan | Daftar counterparty |
| `/loan/[counterpartyId]` | Loan | Detail per orang |
| `/loan/add/give` | Loan | Form tambah Give |
| `/loan/add/get` | Loan | Form tambah Get |
| `/loan/[counterpartyId]/edit/[entryId]` | Loan | Edit single loan entry |
| `/settings` | Settings | Pengaturan app (tab ke-5 Bottom Nav) |
| **`/settings/report`** | **Settings** | **Halaman visibilitas komponen Report — toggle show/hide per komponen analitik** |
| **`/settings/whats-new`** | **Settings** | **Halaman in-app changelog — timeline rilis dengan badge versi, tagline, dan ringkasan tiap pembaruan. Diakses dari row "PFinTrack vX.Y.Z" di Settings/About.** |
| **`/~offline`** | **Global** | **Halaman offline fallback (PWA service worker) — tampil saat pengguna tidak ada koneksi dan request ke route yang tidak ter-cache** |

---

## 3. Layout Shell (Komponen Shared)

> Komponen di bagian ini bersifat **lintas-modul**. Setiap module spec hanya merujuk ke sini, tidak mendefinisikan ulang.

### 3.1 App Header

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Fixed top |
| Tinggi | `56px` + safe area inset top |
| Background | Glassmorphism `glass-nav` (default). Warna dapat dioverride per halaman via `style` prop pada komponen `<AppHeader>`. Contoh override: biru muda untuk list screens, warna solid untuk form screens. |
| Warna teks | Putih |
| Tombol back | Ikon `‹` di kiri, hanya muncul di screen non-root (Add, Edit, Detail). Memicu `router.back()`. |
| Judul | Rata tengah. Bold. Bisa dengan subtitle (mis. di Loan Detail menampilkan "Not paid off"). |
| Action buttons | Optional, di kanan header (mis. ⚙️ Settings di Report header, ikon download/dokumen di Transactions list, ikon person+check/edit/delete di Loan Detail). |

### 3.2 Bottom Navigation

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Fixed bottom |
| Tinggi | `60px` + safe area inset bottom |
| Jumlah tab | **5 tab** |
| Background | `glass-nav` glassmorphism dengan border-top tipis |

**Daftar tab (urut kiri ke kanan):**

| Urutan | Label | Ikon | Route | Default tab? |
|--------|-------|------|-------|-------------|
| 1 | Transactions | BookOpen | `/transactions` | ✅ Ya |
| 2 | Wallet | CreditCard | `/wallet` | |
| 3 | Loan | LayoutDashboard | `/loan` | |
| 4 | Report | BarChart2 | `/report` | |
| 5 | Settings | Settings (gear) | `/settings` | ← paling kanan |

**Aturan visual tab aktif:**
- Tab aktif: ikon dan label berwarna `var(--nav-active)`, `strokeWidth: 2.5`
- Tab non-aktif: ikon dan label berwarna `var(--nav-inactive)`, `strokeWidth: 1.5`
- Penentuan tab aktif berdasarkan **prefix path**: tab Transactions aktif jika path dimulai dengan `/transactions`, Wallet jika `/wallet`, dst.

**Lebar tab:**
Setiap tab menggunakan `flex-1` agar semua 5 tab selalu sama lebar terlepas dari panjang label:

```tsx
className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-70 min-h-[44px]"
```

### 3.3 Floating Action Button (FAB)

Dipakai oleh Wallet, Transactions, Loan (di list maupun detail), dan Report Custom.

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Pojok kanan bawah, di atas Bottom Navigation |
| Bentuk | Lingkaran |
| Diameter | `56px` |
| Background utama | Biru `#2196F3` |
| Ikon | `+` putih |
| Shadow | Drop shadow medium |

**Variasi FAB Expandable:**

Beberapa modul (Transactions, Loan) menggunakan FAB yang **mengembang** menjadi multi sub-action saat di-tap.

| Modul | Sub-action |
|-------|-----------|
| Transactions | 🔁 Transfer (abu) · 💰 Income (oranye) · 🛒 Expense (merah) |
| Loan (List & Detail) | 🔻 Give (merah) · 🔺 Get (oranye) |

Saat FAB di-tap → muncul overlay semi-transparan, sub-action muncul vertikal di atas FAB. Tap sub-action → navigasi ke form. Tap luar overlay → menutup FAB.

### 3.4 Bottom Sheet (Wallet Picker)

Digunakan saat user perlu memilih wallet di form (Transactions, Loan).

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Slide-up dari bawah |
| Header bottom sheet | Background biru muda. Teks "Select Wallet" di kiri. Optional ikon ✏️ (manage wallets — shortcut ke `/wallet`) dan 📄 di kanan. |
| Body | Grid 3 kolom berisi card wallet aktif. Setiap card menampilkan nama wallet di tengah. Tap card → memilih wallet, bottom sheet otomatis tertutup. |
| Backdrop | Konten di belakang sheet di-darken (semi-transparan) |
| Close action | Tap backdrop atau swipe-down untuk menutup |

### 3.5 Date & Time Picker

| Komponen | Spesifikasi |
|----------|-------------|
| Date picker | Native HTML `input[type=date]`. Format display: English *"Fri, 01 May 2026"*. |
| Time picker | Native HTML `input[type=time]`. Format 24-jam (`HH:MM`). |
| **Layout di form** | Date dan Time ditampilkan **secara vertikal** (masing-masing full-width), bukan side-by-side, agar tidak tampak mepet di layar ≤390px. |
| Date navigator (Transactions list) | Tombol `‹` & `›` untuk previous/next day. Tap teks tanggal → buka full date picker. Swipe kanan → hari sebelumnya, swipe kiri → hari berikutnya (lihat §3.9). |

### 3.6 Confirmation Dialog

Pola dialog konfirmasi yang digunakan saat aksi destruktif (delete) atau perubahan state penting (mark as paid).

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Modal di tengah viewport, background gelap di belakang |
| Tombol | Dua tombol: **Batal** (abu, di kiri) dan **Konfirmasi/Hapus** (warna sesuai konteks: merah untuk destruktif, biru untuk netral) di kanan |
| Pesan | Teks deskriptif singkat dengan bold pada nama target (mis. "Hapus wallet **BCA**?") |
| Dismiss | Tap luar dialog atau tombol Batal → menutup tanpa aksi |

### 3.7 Empty State

Pola tampilan saat suatu list kosong.

| Komponen | Spesifikasi |
|----------|-------------|
| Ilustrasi | Gambar/icon ringan di tengah (dokumen, search, dll) |
| Teks utama | Singkat, deskriptif (mis. "There is no data" atau "Belum ada wallet") |
| Teks sekunder | Optional, ajakan tindakan (mis. "Tambah wallet pertama Anda") |
| Posisi | Vertikal center di area konten |

### 3.8 Loading State

| Konteks | Pola Tampilan |
|---------|--------------|
| Awal load halaman | Skeleton loader yang menyerupai bentuk konten asli |
| Tombol submit (Save) | Spinner di dalam tombol, tombol disabled |
| Pull-to-refresh | Indikator refresh native browser (jika tersedia) |

### 3.9 Swipe Navigation

Digunakan pada Transaction List untuk navigasi tanggal dengan gesture.

| Gesture | Efek |
|---------|------|
| Swipe kiri (→ kanan di layar) | Maju ke hari berikutnya |
| Swipe kanan (← kiri di layar) | Mundur ke hari sebelumnya |
| Swipe vertikal | Diabaikan (scroll normal) |

**Threshold:** 50px horizontal sebelum gesture dianggap valid. Gerakan vertikal > horizontal → diabaikan agar tidak konflik dengan scroll. Diimplementasi di `src/hooks/useSwipe.ts`.

### 3.10 Demo Mode

Fitur untuk pengguna baru yang ingin menjelajahi aplikasi tanpa harus input data sendiri.

**Komponen:**

| Komponen | File | Deskripsi |
|----------|------|-----------|
| `DemoBanner` | `src/components/shared/DemoBanner.tsx` | Banner biru sticky di bawah AppHeader. Hanya muncul saat `isDemoMode = true`. Berisi teks "Anda sedang mengeksplorasi data sampel." + tombol "Hapus & Mulai" + tombol × untuk dismiss sementara. |
| Welcome Card | `src/app/transactions/page.tsx` | Card yang muncul di Transaction List saat app pertama kali dibuka (wallets & transactions kosong). Menawarkan dua pilihan: "Eksplorasi dengan Data Sampel" atau "Mulai dari Nol". |
| `injectDemoData()` | `src/lib/demo-data.ts` | Mengisi 3 wallet (BCA, GoPay, Tunai), ±77 transaksi selama 1 bulan penuh, dan 3 loan counterparty dengan data realistis. |
| `clearDemoData()` | `src/lib/demo-data.ts` | Menghapus seluruh data finansial dari 6 key localStorage + reset flag (`globalThis.localStorage.removeItem`) + `window.location.reload()`. |
| Settings action | `src/app/settings/page.tsx` | Section "Data Sampel" merah, hanya muncul saat `isDemoMode = true`. Tombol "Hapus Data Sampel" dengan confirm dialog. |

**State:** `isDemoMode` **tidak** di-persist via `useAppStore`. Status demo mode dibaca langsung dari key `pfintrack_demo_mode` di localStorage (`localStorage.getItem("pfintrack_demo_mode") === "true"`). `injectDemoData()` menulis key ini; `clearDemoData()` menghapusnya. Tidak ada Zustand store untuk isDemoMode.

**Alur:**
```
App dibuka pertama kali (wallets=[], transactions=[])
              ↓
  Welcome Card muncul di Transaction List
        ↓                      ↓
"Eksplorasi Data Sampel"   "Mulai dari Nol"
        ↓                      ↓
injectDemoData()           Dismiss card
globalThis.localStorage.setItem("pfintrack_demo_mode", "true")
window.location.reload()
        ↓
DemoBanner muncul di semua halaman
```

**Clear demo data:** Bisa via DemoBanner → "Hapus & Mulai" atau Settings → "Hapus Data Sampel".

---

### 3.11 Komponen Shared Tambahan

Komponen-komponen berikut ada di `src/components/shared/`:

| Komponen | File | Deskripsi |
|----------|------|-----------|
| `SplashScreen` | `src/components/shared/SplashScreen.tsx` | Screen animasi splash yang dirender oleh `/` (root redirect) dan `/not-found`. Menampilkan logo/nama app sebelum redirect ke `/transactions`. |
| `ColorThemeProvider` | `src/components/shared/ColorThemeProvider.tsx` | Provider yang membaca `colorTheme` dari `useColorTheme` hook dan menulis ke `document.documentElement.dataset.colorTheme`. Dipasang di `app/layout.tsx` membungkus seluruh app. |
| `TourInitializer` | `src/components/shared/TourInitializer.tsx` | Client component yang memeriksa `localStorage['tour_completed']` saat mount — jika tidak ada, memanggil `useTourStore.startTour()`. Ini adalah trigger otomatis tur pertama kali. |
| `ThemeToggle` | `src/components/shared/ThemeToggle.tsx` | Komponen helper untuk toggle light/dark theme. Digunakan di Settings. |
| `TypeToConfirmDialog` | `src/components/shared/TypeToConfirmDialog.tsx` | Dialog konfirmasi destruktif yang mengharuskan user mengetik frasa tertentu sebelum aksi dikonfirmasi (pola "type to confirm"). Digunakan di Settings → Delete All Data. |
| `IconBadge` | `src/components/shared/IconBadge.tsx` | Komponen reusable untuk ikon dengan background berwarna (lingkaran atau kotak rounded). Digunakan di WalletCard, CounterpartyListItem, Settings, Settings/Report. Props: `icon` (React.ElementType), `iconColor` (CSS color), `background` (CSS color), `size` ("sm"=32px / "md"=36px, default "md"), `shape` ("square"=rounded-[10px] / "circle"=rounded-full, default "square"), `border` (opsional), `strokeWidth` (default 1.5). |

---

## 4. Standar Lintas-Modul

### 4.1 Format Angka & Mata Uang

Semua nilai uang ditampilkan dengan **locale Indonesia (`id-ID`)**:

| Format | Contoh |
|--------|--------|
| Pemisah ribuan | Titik (`.`) |
| Pemisah desimal | Koma (`,`) |
| Jumlah desimal | **Dikontrol user** — default 0 digit, bisa diaktifkan 2 digit via Settings |
| Mata uang default | IDR (Rupiah) |
| Tampilan negatif | Prefix `-`: `-17.000` atau `-17.000,00` |
| Tampilan positif (kontekstual) | Prefix `+`: `+5.000` atau `+5.000,00` (untuk income, get loan, balance correction positif) |

**Preferensi `showDecimals`:**

User dapat mengaktifkan/menonaktifkan tampilan desimal di Settings → Display → "Show Decimals".

| `showDecimals` | Contoh tampilan |
|---------------|----------------|
| `false` (default) | `823.110` |
| `true` | `823.110,46` |

State ini disimpan di `useAppStore` (Zustand, persist ke `app_state`). Diimplementasi melalui `setFormatDecimals()` di `src/lib/format/number.ts` — sinkronisasi dari store ke formatter module dilakukan via `useEffect` di `AppProviders`.

**Penyimpanan vs Tampilan:**
- Di `localStorage`: angka **murni** (mis. `823110.46`, format JavaScript Number)
- Di UI: format locale via `formatIDR()` (mis. `"823.110"` atau `"823.110,46"`)
- Konversi dilakukan di lapisan UI menggunakan `Intl.NumberFormat('id-ID')`.

**Input amount di form:**
Field nominal di semua form (Transactions, Loan, Wallet) menggunakan `type="text" inputMode="decimal"` dengan behavior:
- **onFocus:** nilai diformat kembali ke angka murni untuk editing (mis. `"1.500.000"` → `"1500000"`)
- **onBlur:** nilai diformat ke IDR (mis. `"1500000"` → `"1.500.000"`)
- Parsing saat submit via `parseIDR()` yang menangani format IDR (`"1.500.000,50"` → `1500000.50`)

### 4.2 Format Tanggal & Waktu

**Penyimpanan (di localStorage):**

| Tipe | Format | Contoh |
|------|--------|--------|
| Tanggal saja | ISO 8601 date (`YYYY-MM-DD`) | `"2026-05-01"` |
| Waktu saja | 24-jam (`HH:MM`) | `"13:55"` |
| Timestamp lengkap | ISO 8601 datetime UTC | `"2026-05-01T13:55:00.000Z"` |

**Tampilan di UI:**

> ✅ **RESOLVED (2026-05-01):** Standar tunggal telah ditetapkan — **locale-aware** via `useLocale()`. Format output menyesuaikan bahasa aktif pengguna (English atau Indonesia).

| Konteks | Format (EN) | Format (ID) | Contoh (EN) |
|---------|-------------|-------------|-------------|
| Header Transactions list (current day) | English singkat | Indonesia singkat | `Fri, 01 May 2026` |
| Header Loan Detail (entry list) | English singkat | Indonesia singkat | `Sun, 19 Apr 2026` |
| Header section Report (Monthly, Custom) | English singkat | Indonesia singkat | `01 May 2026 - 31 May 2026` |
| Form input (Date Picker pre-filled) | English singkat | Indonesia singkat | `Fri, 01 May 2026` |

**Implementasi di `lib/format/date.ts`:**
- `formatDisplayDate(date, locale = "id")` — locale param opsional, default Indonesian
- `formatDateRange(from, to, locale = "id")` — locale param opsional, default Indonesian
- Komponen yang memanggil: `DateNavigator`, `RealtimeTab`, `LoanEntryListItem`, `transactions/history/page`, `report/detail/page`, `CustomReportSection`, `report/custom/add/page`, `report/custom/[id]/edit/page` — semuanya meneruskan `useLocale()` ke fungsi format.

**DateNavigator calendar popup (locale-aware):**
- Month label: menggunakan locale aktif via `date-fns` locale
- Weekday headers: single-letter abbreviations di-generate dari `date-fns`, dimulai Minggu
- Tombol "Today": menggunakan translation key `tc("today")` → `"Today"` (EN) / `"Hari ini"` (ID)

### 4.3 Palet Warna

> Semua warna **wajib** diakses via CSS custom property — **jangan hardcode hex** di komponen TSX.

**Token canonical (gunakan nama ini di kode):**

| Token CSS | Light | Dark | Penggunaan |
|-----------|-------|------|-----------|
| `--color-brand` | `#5B8DEF` | `#7BA4F7` | FAB, tombol Save/primary, tab aktif, chip, link |
| `--color-brand-soft` | `rgba(91,141,239,0.12)` | `rgba(123,164,247,0.15)` | Background pill/chip soft, icon badge |
| `--color-positive` | `#34C759` | `#30D158` | Income, Get loan, Balance positif |
| `--color-negative` | `#FF6B6B` | `#FF6B6B` | Expense, Give loan, Balance negatif, tombol Delete |
| `--color-accent` | `#FF9F43` | `#FFB340` | FAB Income/Get, warning, badge |
| `--color-accent-soft` | `rgba(255,159,67,0.12)` | `rgba(255,179,64,0.15)` | Background accent soft |
| `--text-primary` | `#1C1C1E` | `#F2F2F7` | Teks utama |
| `--text-secondary` | `#8E8E93` | `#8E8E93` | Teks label, subtitle |
| `--text-tertiary` | `#AEAEB2` | `#636366` | Teks meta, caption, tab inactive |
| `--text-on-primary` | `#FFFFFF` | `#FFFFFF` | Teks di atas background berwarna |
| `--bg-primary` | `#F8F9FB` | `#0F0F14` | Background halaman |
| `--bg-secondary` | `#F0F1F5` | `#1A1A24` | Background input, section |
| `--bg-card` | `rgba(255,255,255,0.72)` | `rgba(30,30,42,0.72)` | Card glass |
| `--border-default` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` | Border card, input |
| `--divider` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.06)` | Garis pemisah list |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.03)` | ×~4 lebih kuat | Box shadow kecil |
| `--shadow-md` | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.03)` | ×~4 lebih kuat | Box shadow medium (default `.glass`) |
| `--shadow-lg` | `0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.05)` | ×~4 lebih kuat | Box shadow besar |

**Alias (valid tapi deprecated — gunakan canonical di atas):**
- `--color-accent-warm` → alias ke `--color-accent`
- `--color-accent-warm-soft` → alias ke `--color-accent-soft`

**Color Theme (Accent Color):**

PFinTrack mendukung dua pilihan tema aksen (warna brand) yang dapat diubah user di Settings → Appearance → Accent Color. Tema aktif di-apply via atribut `data-color-theme` pada `document.documentElement`:

| Tema | `data-color-theme` | `--color-brand` (Light) | `--color-brand` (Dark) | Key localStorage |
|------|-------------------|------------------------|------------------------|------------------|
| Biru (default) | `"blue"` | `#5B8DEF` | `#7BA4F7` | `pfintrack_color_theme = "blue"` |
| Pink | `"pink"` | `#D95B7B` | `#F08FAA` | `pfintrack_color_theme = "pink"` |

Hanya `--color-brand` dan `--color-brand-soft` yang berubah antar tema. Token lain (`--color-positive`, `--color-negative`, `--color-accent`, dll.) tetap sama di semua tema. Preferensi disimpan ke localStorage via key `pfintrack_color_theme` (key state aplikasi, bukan data finansial).

### 4.4 Tipografi

Font: **Inter** (via `next/font/google`). Skala mengikuti iOS SF Pro.

| Elemen | Tailwind class | Keterangan |
|--------|---------------|-----------|
| Page title / large amount | `text-[22px] font-bold` | Heading utama halaman |
| Section title / header | `text-[17px] font-semibold` | Sub-heading, judul section |
| List item title | `text-[15px] font-semibold` | Nama wallet, judul transaksi |
| List item subtitle/meta | `text-[13px]` `color: --text-secondary` | Tipe, tanggal, keterangan singkat |
| Amount (body row) | `text-[15px] font-semibold tabular-nums` | Nominal di list |
| Amount (card/summary) | `text-[17px] font-semibold tabular-nums` | Balance di card info |
| Summary bar value | `text-[14px] font-semibold tabular-nums` | Income/Expense/Balance bar |
| Summary bar label | `text-[11px] font-medium uppercase` | Label di atas value summary bar |
| Form input | `text-[15px]` | Isi field input/select |
| Form label | `text-[13px] font-medium` `color: --text-secondary` | Label di atas input |
| Error message | `text-[12px]` `color: --color-negative` | Pesan validasi |
| Caption / meta | `text-[12px]` `color: --text-tertiary` | Waktu, hint, keterangan tambahan |
| Section header caps | `text-[12px] font-semibold uppercase tracking-wider` | Header section Settings dll |
| Nav tab label | `text-[10px] font-medium` | Label Bottom Navigation |

**Aturan angka:** Semua nominal uang **wajib** pakai `tabular-nums` agar digit sejajar.

### 4.5 Spacing & Layout

| Aspek | Nilai |
|-------|-------|
| Padding container | `16px` horizontal (`px-4`) |
| Spacing antar field form | `16px` (`gap-4`) |
| Tap target minimum | `44×44px` (`var(--tap-target-min)`) |
| Border radius card | `16px` (`rounded-[16px]`) |
| Border radius input/button | `12px` (`rounded-[12px]`) |
| Border radius FAB | `9999px` (lingkaran penuh) |
| Border radius pill/chip | `9999px` (`rounded-full`) |
| Border radius button | 8px |
| Drop shadow card | Gunakan `var(--shadow-sm/md/lg)` — lihat §4.3 |

### 4.5a Glassmorphism & Card Pattern

**Glass utility classes (CSS):**

| Class | Spesifikasi | Digunakan Untuk |
|-------|-------------|-----------------|
| `.glass` | `background: var(--bg-card)` + `backdrop-filter: blur(20px)` + `border: 1px solid var(--border-glass)` + `box-shadow: var(--shadow-md)` | Semua card & list item — shadow sudah inklusif, tidak perlu ditambah manual |
| `.glass-strong` | Sama dengan `.glass` namun blur `40px` | Bottom sheet, drawer |
| `.glass-nav` | Light: `background: rgba(255,255,255,0.72)` + Dark: `background: rgba(20,20,28,0.75)` + `backdrop-filter: blur(20px) saturate(1.8)` + inset box-shadow highlight | App Header & Bottom Navigation |

> **Penting:** `.glass-nav` memiliki override `.dark .glass-nav` terpisah di CSS — pastikan tidak di-override inline.

**Aturan card vs input:**

| Elemen | Background yang Digunakan |
|--------|--------------------------|
| Card / list item | Wajib pakai class `.glass` |
| Form input | `backgroundColor: "var(--bg-secondary)"` (opaque) — **jangan** pakai `.glass` atau `var(--bg-card)` |
| Loading skeleton | `var(--bg-secondary)` |
| WalletPicker item (unselected) | `var(--bg-secondary)` |

### 4.6 Pola Validasi Form

Berlaku untuk semua form di seluruh modul:

| Aspek | Pola |
|-------|------|
| Validasi trigger | Saat tap tombol Save (bukan on-blur per field) |
| Tampilan error | Inline di bawah field yang error, warna merah, font kecil |
| Field highlighting | Border field error berwarna merah |
| Disabled state Save | Tombol disabled (abu) saat field wajib belum terisi |
| Loading state Save | Spinner di tombol, tombol disabled |
| Auto-trim | Field teks otomatis trim whitespace di awal/akhir saat submit |
| Case-insensitive matching | Untuk pencocokan nama (wallet, counterparty, custom report) |

---

## 5. Identitas Anonim & Migration-Ready

### 5.1 Konsep `anon_id`

| Properti | Detail |
|----------|--------|
| Lokasi | `localStorage['anon_id']` |
| Tipe | String (UUID v4) |
| Dibuat kapan | Sekali saat aplikasi pertama kali dibuka di browser |
| Diubah? | Tidak. Permanen selama Fase 1 |
| Fungsi | Penanda kepemilikan data. Setiap record di setiap modul memiliki field `anon_id` yang merujuk ke nilai ini |

### 5.2 Bootstrap Aplikasi

```
Browser membuka aplikasi
              ↓
   Cek localStorage['anon_id']
       ↓ Ada              ↓ Tidak Ada
   Pakai yang ada    Generate UUID v4 baru
                     Simpan ke localStorage['anon_id']
              ↓
   Inisialisasi modul
   (setiap modul baca key localStorage masing-masing)
              ↓
   Render halaman default: /transactions
```

### 5.3 Migrasi Fase 2 (Anonymous → Authenticated)

Saat Fase 2 dirilis, pengguna dapat membuat akun untuk meng-claim seluruh data anonim mereka.

```
User klik "Buat Akun" (Fase 2)
              ↓
   Form Register (nama, email, password)
              ↓
   POST /api/auth/register
   Body: {
     credential fields...,
     anon_id: localStorage['anon_id'],
     payload: {
       wallets:                localStorage['wallets'],
       wallet_balance_history: localStorage['wallet_balance_history'],
       transactions:           localStorage['transactions'],
       loan_counterparties:    localStorage['loan_counterparties'],
       loan_entries:           localStorage['loan_entries'],
       custom_reports:         localStorage['custom_reports']
     }
   }
              ↓
   Backend:
     1. Buat user baru
     2. Tulis seluruh data ke database, ganti anon_id menjadi user_id
     3. Return JWT token
              ↓
   Client:
     1. Simpan JWT
     2. Hapus seluruh key localStorage anonim
     3. Selanjutnya semua operasi via API, bukan localStorage
```

**Prinsip kunci migrasi:**

| Prinsip | Implementasi |
|---------|--------------|
| Field `anon_id` di setiap record | Sudah ada di seluruh modul. Tidak perlu transformasi field tambahan |
| Skema localStorage = skema database | Field name dan tipe sudah dirancang konsisten |
| Layer abstraksi data per modul | Saat Fase 2, hanya layer ini yang diubah ke API call. Komponen UI tidak perlu disentuh |

---

## 6. Hubungan Antar Modul (Producer–Consumer)

> Setiap modul punya tanggung jawab spesifik. Beberapa modul **menulis** data yang dibaca modul lain. Bagian ini memetakan hubungan tersebut.

### 6.1 Diagram Ketergantungan

```
                ┌──────────────┐
                │    Wallet    │ (Producer)
                │              │
                │ - wallets    │
                │ - wallet_    │
                │   balance_   │
                │   history    │
                └──────┬───────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│Transactions│  │   Loan     │  │   Report   │
│            │  │            │  │            │
│ Membaca:   │  │ Membaca:   │  │ Membaca:   │
│ wallets    │  │ wallets    │  │ wallets    │
│            │  │ (opsional) │  │ wallet_    │
│ Mengubah:  │  │            │  │  balance_  │
│ wallet.    │  │ Mengubah:  │  │  history   │
│  balance   │  │ wallet.    │  │ transactions│
│            │  │  balance   │  │ loan_entries│
└────────────┘  └────────────┘  └────────────┘
                                      │
                                      ▼
                              ┌────────────┐
                              │ custom_    │
                              │ reports    │
                              │ (own data) │
                              └────────────┘
```

### 6.2 Tabel Producer–Consumer

| Data | Producer | Consumer | Catatan |
|------|----------|----------|---------|
| `wallets` | Wallet (CRUD) | Transactions (untuk pilih wallet, update balance), Loan (untuk pilih wallet, update balance), Report (referensi nama wallet) | Field `balance` di-update oleh siapa saja yang melakukan transaksi/loan |
| `wallet_balance_history` | Wallet (saat tambah wallet dengan balance > 0, atau edit balance manual) | Report (untuk Balance Correction) | Dicatat saat: (1) Add Wallet dengan initial balance > 0, (2) Edit Wallet jika balance berubah. Tidak dicatat akibat transaksi/loan. |
| `transactions` | Transactions (CRUD) **+ Wallet** (Balance Correction auto-transaction) | Report (Income, Expenses, Donut chart) | Transfer tidak dihitung di Income/Expenses. **Balance Correction** transactions (`type:"income"/"expense"`, `category:"Balance Correction"`) dibuat otomatis oleh Wallet saat Add/Edit dengan balance ≠ 0. Muncul di Transaction list seperti transaksi biasa. |
| `loan_counterparties` | Loan (CRUD) | — | Internal Loan |
| `loan_entries` | Loan (CRUD) | Report (Loan cash flow) | Cash flow loan = Get − Give per periode |
| `custom_reports` | Report (CRUD) | — | Internal Report |

### 6.3 Aturan Konsistensi Saldo Wallet

Berlaku untuk **semua operasi yang menyentuh `wallet.balance`**:

| Aksi | Efek terhadap `wallet.balance` | Catat ke `wallet_balance_history`? | Buat transaction Balance Correction? |
|------|-------------------------------|-------------------------------------|--------------------------------------|
| Tambah wallet baru (initial balance > 0) | Set `balance = 0` dulu, lalu income tx menaikkan ke initial balance | ✅ Ya — dicatat sebagai koreksi awal (previous=0, new=balance) | ✅ Ya — income `{type:"income", title:"Balance Correction", category:"Balance Correction", amount: initialBalance}` |
| Tambah wallet baru (initial balance = 0) | Set balance = 0 | ❌ Tidak | ❌ Tidak |
| Edit balance manual via Edit Wallet (delta ≠ 0) | Tidak di-update langsung — transaction side-effect yang mengubah balance | ✅ Ya (delta = new − old) | ✅ Ya — `{type: delta>0?"income":"expense", title:"Balance Correction", category:"Balance Correction", amount: Math.abs(delta)}` |
| Edit wallet name/type saja (balance tidak berubah) | Tidak berubah | ❌ Tidak | ❌ Tidak |
| Tambah transaksi income | `+= amount` | ❌ Tidak | — |
| Tambah transaksi expense | `-= amount` | ❌ Tidak | — |
| Tambah transaksi transfer | Source `-= amount`, Destination `+= amount` | ❌ Tidak | — |
| Edit/hapus transaksi (termasuk Balance Correction) | Rollback efek lama, apply efek baru | ❌ Tidak | — |
| Tambah loan give (dengan wallet) | `-= amount` | ❌ Tidak | — |
| Tambah loan get (dengan wallet) | `+= amount` | ❌ Tidak | — |
| Edit/hapus loan entry | Rollback efek lama, apply efek baru | ❌ Tidak | — |
| Soft delete wallet | (tidak ubah balance) | ❌ Tidak | ❌ Tidak |

**Balance Correction Transaction Pattern:**
Saat Add Wallet (balance > 0) atau Edit Wallet (balance berubah), Wallet module membuat transaksi income/expense dengan:
- `title: "Balance Correction"`, `category: "Balance Correction"`
- `wallet_id`: wallet terkait
- `amount`: initial balance (Add) atau `Math.abs(delta)` (Edit)
- Side-effect `applyTransactionToWallet` yang memperbarui `wallet.balance`

Transaksi ini tampil normal di Transaction list. Menghapus transaksi Balance Correction membalik balance wallet via `rollbackTransactionFromWallet` — perilaku yang diinginkan.

**Filosofi:** `wallet_balance_history` merekam niat user ("saya menetapkan balance sekian"), sementara transaction Balance Correction adalah mekanisme yang **mengeksekusi** perubahan balance tersebut. Keduanya ditulis bersamaan saat Save.

---

## 7. Inventaris Lengkap Key di localStorage

> **Catatan storage backend (v1.5):** Data finansial (7 key di bawah) sekarang disimpan di **IndexedDB** via library `idb`, bukan localStorage, sesuai migrasi PROP-0001. Key-key di tabel ini adalah nama **object store** di IndexedDB, bukan key localStorage. Key state aplikasi (`app_state`, `pfintrack_demo_mode`, dll.) tetap di localStorage. Lihat `tech-spec-migration-indexeddb.md` untuk detail skema IDB.

**7 Key Data Finansial (IndexedDB object stores):**

| Key / Store | Pemilik | Deskripsi | Versi Dokumen |
|-------------|---------|-----------|---------------|
| `wallets` | Wallet | Array daftar wallet user | Module Wallet |
| `wallet_balance_history` | Wallet | Array riwayat koreksi balance (add wallet + edit manual) | Module Wallet |
| `transactions` | Transactions | Array transaksi (income, expense, transfer) | Module Transactions |
| `loan_counterparties` | Loan | Array daftar orang (counterparty loan) | Module Loan |
| `loan_entries` | Loan | Array transaksi loan (give, get) | Module Loan |
| `custom_reports` | Report | Array custom report buatan user | Module Report |

**Key State Aplikasi (localStorage — bukan data finansial):**

| Key | Pemilik | Deskripsi |
|-----|---------|-----------|
| `anon_id` | Global | UUID v4 sebagai penanda anonymous user |
| `app_state` | Global | State Zustand ter-persist: `anonId`, `showDecimals`, `reportVisibility`. **Catatan:** `isDemoMode` sudah tidak disimpan di sini (v1.5) |
| `pfintrack_demo_mode` | Global | Flag sederhana (`"true"`) untuk demo mode — ditulis langsung oleh `injectDemoData()` dan dihapus oleh `clearDemoData()` |
| `pfintrack_color_theme` | Global | Preferensi tema aksen: `"blue"` (default) atau `"pink"`. Dikelola oleh `useColorTheme` hook |
| `tour_completed` | Global | Timestamp ISO 8601 saat tur onboarding selesai atau di-skip. Kosong/tidak ada = tur belum pernah dijalankan |
| `storage_version` | Global | Versi migrasi storage (integer). Dipakai oleh `migrate-from-localstorage.ts` sebagai guard agar migrasi localStorage→IDB hanya berjalan satu kali |

**Total: 6 object store data finansial (IndexedDB) + 6 key state aplikasi (localStorage) = 12 key total.**

> ⚠️ **Invariant 7-key:** Constraint "7 localStorage keys only" yang disebutkan di CLAUDE.md dan `Hard Invariants` merujuk pada **7 key data finansial**. Implementasi IndexedDB menggunakan 6 object store (anon_id tidak perlu store sendiri karena disimpan di localStorage). Key state aplikasi tidak dihitung dalam constraint ini karena tidak berisi data finansial dan tidak perlu dimigrasi ke Fase 2.

Setiap record di 6 object store data finansial memiliki field umum:
- `id` — UUID v4
- `anon_id` — referensi ke `localStorage['anon_id']`
- `is_active` — soft delete flag
- `created_at` & `updated_at` — ISO 8601 timestamp

---

## 8. Pola Soft Delete

Berlaku di seluruh modul.

| Aspek | Pola |
|-------|------|
| Trigger | User tap tombol Delete + konfirmasi dialog |
| Eksekusi | Set `is_active = false` di record terkait. **Tidak menghapus** dari `localStorage` |
| Tampilan | Record dengan `is_active = false` **tidak muncul** di list/agregat |
| Cascade (Loan) | Hapus counterparty → semua entry-nya juga di-soft-delete + rollback wallet |
| Audit trail | Record tetap ada untuk migrasi Fase 2 dan kemungkinan fitur restore di masa depan |

---

## 9. Pola Performance

| Aspek | Implementasi |
|-------|--------------|
| Computed-on-the-fly | Total balance, summary, outstanding, report aggregate dihitung saat render — tidak di-cache di localStorage |
| Memoization | Untuk hasil kalkulasi yang berat (mis. summary report custom dengan range besar), gunakan memoization di level komponen |
| Infinite scroll | Tab Monthly di Report — load 6 bulan pertama, lalu tambah 6 bulan saat scroll mendekati bawah |
| Filter in-memory | Search, filter tanggal — semua dilakukan di sisi client karena dataset relatif kecil per user |
| Asumsi skala | Per user diasumsikan < 10.000 record per modul. Cukup untuk pemakaian personal multi-tahun |

---

## 10. Asumsi — Status Resolusi (Konsolidasi)

> ✅ **Seluruh 20 asumsi telah RESOLVED pada 2026-05-01.**

### 10.1 Visual & UX — ✅ RESOLVED

| # | Asumsi | Keputusan | Modul Terkait |
|---|--------|-----------|---------------|
| 1 | Format tanggal di UI | ✅ **English semua** — `Fri, 01 May 2026` untuk display maupun input form | Semua |
| 2 | Counterparty Paid off di list | ✅ **Tetap muncul + toggle hide/show** — sorted after outstanding | Loan |
| 3 | Donut chart kategori | ✅ **Limit 8 kategori + "Lainnya"** | Report |

### 10.2 Logika Bisnis — ✅ RESOLVED

| # | Asumsi | Keputusan | Modul Terkait |
|---|--------|-----------|---------------|
| 4 | Expense > balance wallet | ✅ **Boleh minus + warning** (soft, tidak block) | Transactions |
| 5 | Outstanding Loan negatif | ✅ **Ditampilkan di kolom Give sebagai nilai absolut** | Loan |
| 6 | Periode Realtime Report | ✅ **Bulan penuh** (1 - akhir bulan) | Report |
| 7 | Range max custom report | ✅ **10 tahun** | Report |
| 8 | Edit/delete txn → wallet_balance_history | ✅ **TIDAK dicatat** — audit trail sudah ada di transactions | Wallet, Transactions |

### 10.3 UI yang Belum Ada Gambarnya — ✅ RESOLVED

| # | Item | Keputusan | Modul Terkait |
|---|------|-----------|---------------|
| 9 | Edit/Detail Transaction | ✅ **Reuse form Add**, pre-filled + Save & Delete | Transactions |
| 10 | Edit/Detail Wallet | ✅ **Reuse form Add**, pre-filled + wallet_type selector + Save & Delete | Wallet |
| 11 | Edit single Loan Entry | ✅ **Reuse form Add Give/Get**, name locked + Delete | Loan |
| 12 | Tab History Transactions | ✅ **Full-page search**, real-time filter case-insensitive | Transactions |
| 13 | Edit Custom Report | ✅ **Reuse form Add** + tombol Delete merah di bawah form | Report |
| 14 | Drill-down kategori donut chart | ✅ **In-place** — tap legend/segment → list transaksi diperbarui di bawah chart tanpa navigasi; di `/report/detail` kategori bisa dipilih via URL param | Report |
| 15 | Confirmation Dialog | ✅ **Wajib semua** aksi destruktif, komponen reusable | Semua |
| 16 | Empty state | ✅ **Icon package** (mis. lucide-react), bukan emoji/custom illustration | Semua |

### 10.4 Fitur Belum Didefinisikan — ✅ RESOLVED (Skip Fase 1)

| # | Item | Keputusan | Modul Terkait |
|---|------|-----------|---------------|
| 17 | Restore dari soft-delete | ⏭️ **Skip** — Fase 2 | Semua |
| 18 | Backup/restore data (export JSON) | ⏭️ **Skip** — Fase 2 | Global |
| 19 | Multi-currency support | ⏭️ **Skip** — IDR only, hardcoded di formatter | Global |
| 20 | Drag-to-reorder wallet | ⏭️ **Skip** — tidak ada di Fase 1; sort dilakukan by name/balance via UI dropdown | Wallet |

---

---

## 11. Module Settings (`/settings`)

Route utama adalah `/settings` (tab ke-5 di Bottom Navigation), dengan satu sub-route: `/settings/report`.

### 11.1 Screens

**Screen: Settings (`/settings`)**

| Section | Komponen | Deskripsi |
|---------|----------|-----------|
| **Appearance** | Theme selector | 3 opsi: **Light** · **Dark** · **System** (mengikuti OS). Opsi aktif ditandai checkmark + warna primary. Menggunakan `next-themes` `setTheme()`. |
| **Appearance** | Accent Color picker | **Dua swatch warna** berdampingan: **Blue** (default, `#5B8DEF`) dan **Pink** (`#D95B7B`). Swatch aktif memiliki outline ring. Tap swatch → `useColorTheme().setColorTheme()` → ganti token `--color-brand`. Preferensi disimpan ke `pfintrack_color_theme` di localStorage. |
| **Language** | Language selector | 2 opsi: **English** · **Indonesia**. Implementasi via `next-intl` server action `setLocale()`. Preference disimpan di cookie. |
| **Display** | Show Decimals toggle | Toggle switch untuk mengaktifkan/menonaktifkan tampilan 2 desimal pada semua angka IDR. Default: off. Preview langsung di bawah label toggle: `100.000` (off) atau `100.000,00` (on). State di-persist via `useAppStore.showDecimals`. |
| **Report** | Report visibility shortcut | Row dengan ikon ChartPie → tap navigasi ke `/settings/report`. |
| **Data Sampel** *(conditional)* | Delete action | Section merah, **hanya muncul saat `pfintrack_demo_mode === "true"`**. Tombol "Hapus Data Sampel" dengan konfirmasi dialog destructive. Menjalankan `clearDemoData()` → hapus semua data + reload. |
| **Data & Storage** | Persistent Storage | Row informasi status IndexedDB persistent storage. Tombol aktif jika storage belum di-persist → memanggil `navigator.storage.persist()`. Ikon `ShieldCheck` (hijau, jika granted) atau `ShieldOff` (abu). |
| **Data & Storage** | Export backup | Row → tap trigger `exportBackup()` → download file `.json` atau `.gz`. |
| **Data & Storage** | Import backup | Row → tap membuka file picker (`.json`, `.gz`) → konfirmasi dialog → `importBackup(file)` → reload. |
| **Data & Storage** | Delete All Data | Row merah → tap membuka `TypeToConfirmDialog` (user harus ketik frasa konfirmasi) → `deleteAllData()` → reload. |
| **Help** | Lihat Tutorial | Row → tap memanggil `useTourStore.resetTour()` → tur onboarding dimulai ulang dari step 1. |
| **About** | What's New row | Row clickable: nama app `PFinTrack` + label `v{APP_VERSION}` + chevron → navigasi ke `/settings/whats-new`. Versi dibaca dari konstanta `APP_VERSION` di `src/lib/version.ts`. |

**Screen: What's New (`/settings/whats-new`)**

In-app changelog dengan layout timeline vertikal. Konten dibaca dari namespace `changelog` di `messages/{id,en}.json` (bilingual via `next-intl`).

| Elemen | Deskripsi |
|--------|-----------|
| Header | `AppHeader` dengan `showBack` + title `changelog.title`. |
| Subtitle | Paragraf intro pendek (`changelog.subtitle`). |
| Timeline | `<ol>` vertikal dengan garis penghubung. Tiap entry = satu `<li>` berisi node bulat (ikon Sparkles) + card glass. |
| Entry card | Header (versi + tanggal), tagline (`<h2>`), badge "Versimu sekarang" jika `entry.version === APP_VERSION`, intro paragraf, bullet list improvements. |
| Sumber data | `t.raw("entries")` — array `ChangelogEntry` (`{version, date, tagline, intro, items[]}`). |
| Aturan konten | Bahasa positif & user-oriented. Tidak menyebut "bug fix" atau detail teknis internal. |

**Screen: Report Visibility (`/settings/report`)**

Halaman ini mengatur visibilitas komponen analitik di tab Report. Setiap item adalah toggle on/off yang menulis ke `useAppStore.reportVisibility` (di-persist ke `app_state`).

| Toggle | Field | Default |
|--------|-------|---------|
| Saving Rate Card | `showSavingRateCard` | `true` |
| Loan Outstanding | `showLoanOutstanding` | `true` |
| Insight Card | `showInsightCard` | `true` |
| Donut Chart | `showDonutChart` | `true` |
| Loan Row (di summary) | `showLoanRow` | `true` |
| Balance Correction Row | `showBalanceCorrectionRow` | `true` |
| Monthly Overview Chart | `showMonthlyOverviewChart` | `true` |
| Net Worth Chart | `showNetWorthChart` | `true` |

Terdapat juga tombol "Tampilkan Semua" / "Sembunyikan Semua" untuk toggle massal via `useAppStore.setAllReportVisibility()`.

### 11.2 i18n — Implementasi (via `next-intl`)

Language switch sudah diimplementasi dengan `next-intl`:

| Aspek | Implementasi |
|-------|-------------|
| **Storage** | Disimpan di cookie via `setLocale()` server action (`src/actions/setLocale.ts`) |
| **Provider** | `NextIntlClientProvider` di `src/app/layout.tsx` |
| **Pesan terjemahan** | `src/i18n/messages/en.json` dan `src/i18n/messages/id.json` |
| **Akses di komponen** | `useTranslations("namespace")` hook |
| **Scope terjemahan** | Label UI, placeholder, pesan validasi, empty state, header title, dialog text, `aria-label` interaktif |
| **TIDAK diterjemahkan** | Format tanggal (tetap English), format angka (tetap `id-ID` Intl), key field di storage |
| **Default** | English (`"en"`) |

### 11.3 Konsistensi Text

UI text menggunakan bahasa **sesuai locale aktif** via `next-intl`. Pesan dalam file `messages/en.json` dan `messages/id.json` harus konsisten dan lengkap.

**Aturan `aria-label`:** Semua atribut `aria-label` yang mengandung teks tampilan (bukan role teknis) harus menggunakan `t("key")` dari `useTranslations`. Kunci yang sudah ada di `common` namespace dapat digunakan langsung (misal `tc("back")`, `tc("close")`, `tc("delete")`, `tc("add")`, `tc("clear")`). Kunci khusus untuk konteks navigasi hari (`common.prevDay`, `common.nextDay`), toggle theme (`common.switchToLight`, `common.switchToDark`), dan overlay (`common.closeOverlay`) sudah tersedia.

**Namespace keys yang ditambahkan (2026-05-15):**
- `common.prevDay`, `common.nextDay` — navigasi DateNavigator
- `common.switchToLight`, `common.switchToDark` — ThemeToggle
- `common.closeOverlay` — FABExpandable backdrop
- `report.daily.listView`, `report.daily.calendarView` — view toggle DailySummarySection
- `tour.modules.{transactions|wallet|loan|report}` — nama modul di skip dialog (i18n aware)
- `tour.cancelAriaLabel` — backdrop TourSkipConfirm
- `demo.banner.demoModeAriaLabel` — DemoBanner aside landmark
- `offline.{heading|description|retry}` — halaman offline

---

## 12. Konvensi Semantic HTML

Seluruh halaman dan komponen PFinTrack mengikuti standar semantic HTML berikut untuk aksesibilitas dan SEO.

### 12.1 Landmark Elements

| Elemen | Penggunaan di PFinTrack |
|--------|------------------------|
| `<header>` | `AppHeader` — fixed top bar per halaman |
| `<nav>` | `BottomNav` — tab navigasi bawah |
| `<main>` | Wrapper konten utama di `RootLayout` (sudah diterapkan) |
| `<aside>` | `DemoBanner` — banner informasi demo mode |
| `<section>` | `SummaryBar` di Transactions — grup ringkasan harian (dengan `aria-label`) |
| `<figure>` / `<figcaption>` | `MonthlyOverviewChart`, `NetWorthChart` — chart dengan keterangan |

### 12.2 Heading Hierarchy

| Level | Konteks |
|-------|---------|
| `<h1>` | Judul halaman di `AppHeader` (satu per halaman, di-render sebagai `<h1>`) |
| `<h2>` | Section label di halaman Settings (`Appearance`, `Language`, `Display`, dll.) |
| `<h2>` | Heading di komponen card: `LoanOutstandingSection`, rename dialog di Loan Detail |
| `<h2>` | Judul di `EmptyState` (`title` prop) — tampil langsung di bawah `<h1>` tanpa section di antaranya |
| `<h2>` | Label chart di `CategoryTrendChart` ("6-month trend") — section pertama di halaman category, langsung di bawah `<h1>` |
| `<h3>` | Sub-heading yang berada di dalam section `<h2>` (bukan langsung setelah `<h1>`) |

Aturan: jangan lewati level heading (tidak boleh langsung `h1` → `h3`). `EmptyState` dan komponen yang tampil sebagai konten utama halaman (tanpa `<h2>` di atasnya) wajib menggunakan `<h2>`.

### 12.3 List Elements

Setiap daftar item menggunakan `<ul>` + `<li>` (bukan `<div>`):

| Halaman / Komponen | List |
|--------------------|------|
| `/transactions` | Daftar transaksi harian → `<ul>` + `<li>` |
| `/transactions/history` | Daftar transaksi history → `<ul>` + `<li>` |
| `/wallet` | Daftar wallet → `<ul>` + `<li>` |
| `/loan` | Daftar counterparty → `<ul>` + `<li>` |
| `/loan/[counterpartyId]` | Daftar loan entries → `<ul>` + `<li>` |
| `RealtimeTab` | Daftar transaksi per kategori → `<ul>` + `<li>` |

Tambahkan `list-none` di Tailwind untuk menghilangkan bullet bawaan browser.

### 12.4 Interactive Elements

| Wajib | Dilarang |
|-------|---------|
| `<button type="button">` untuk semua aksi | `<div onClick>` atau `<div role="button">` |
| `<a href>` untuk navigasi ke route | `<button>` untuk link navigasi |
| Backdrop/overlay: `<button type="button">` dengan `aria-label` | `<div onClick aria-hidden>` pada overlay interaktif |

### 12.5 Chart Accessibility

| Komponen | Pattern |
|----------|---------|
| `MonthlyOverviewChart` | `<figure>` + `<figcaption>` sebagai container + judul |
| `NetWorthChart` | `<figure>` + `<figcaption>` sebagai container + judul |
| `DonutChart` | Chart container `<div role="img" aria-label="...">` dengan deskripsi nilai |

### 12.6 Dialog Accessibility

Modal yang dibuat secara custom (bukan komponen Radix/shadcn) harus menggunakan elemen semantik `<dialog>` HTML5 native:
- Gunakan `<dialog open>` — elemen `<dialog>` sudah memiliki implicit role `dialog`, sehingga **tidak perlu** `role="dialog"`
- Tetap sertakan `aria-modal="true"` dan `aria-labelledby` yang menunjuk ke `id` elemen judul (`<h2>`)
- Styling overlay (backdrop) tetap menggunakan CSS inline atau className di elemen `<dialog>` itu sendiri
- Jangan gunakan `.showModal()` / `.close()` Web API — gunakan React state (`open` boolean attribute) untuk mengontrol visibilitas

Contoh: rename dialog di `/loan/[counterpartyId]` (✅ FIXED 2026-05-14 — diupgrade dari `<div role="dialog">` ke `<dialog open>`).

---

## 13. E2E Test Coverage (Playwright)

Semua test E2E berada di `tests/e2e/` menggunakan Playwright dengan viewport mobile `390×844px`.
Total: **148 test** di **14 file** (per 2026-05-14).

| File | Modul | Jumlah Test | Skenario Utama |
|------|-------|-------------|----------------|
| `navigation.spec.ts` | Global | 6 | Root redirect, bottom nav tabs, header posisi, overflow, tap targets |
| `wallet.spec.ts` | Wallet | 10 | List, add, edit name, duplicate check, back button, total balance |
| `wallet-delete.spec.ts` | Wallet | 5 | Delete button, confirm dialog, cancel, soft delete, in-use guard |
| `transactions.spec.ts` | Transactions | 11 | List, add income/expense/transfer, detail, history, summary bar |
| `transactions-edit-delete.spec.ts` | Transactions | 8 | Edit amount/title, delete, transfer in list, date navigator |
| `transactions-history.spec.ts` | Transactions | 15 | History page structure, search filter, clear search, no-results empty state, type filter chips (Income/Expense/All), wallet filter chips, wallet chip filtering, tap-to-detail, back navigation |
| `loan.spec.ts` | Loan | 9 | List, add give/get, counterparty detail, outstanding, FAB |
| `loan-edit-delete.spec.ts` | Loan | 12 | Edit entry, delete entry, mark paid off, unmark, delete counterparty, add get |
| `report.spec.ts` | Report | 11 | Tabs, Live data, detail/category pages, custom report CRUD |
| `report-monthly-custom.spec.ts` | Report | 10 | Monthly data, custom list, empty states, category page |
| `settings.spec.ts` | Settings | 8 | Header, sections visible, backup buttons visible, delete guard, overflow |
| `settings-backup.spec.ts` | Settings | 24 | Export download, restore upload/confirm/cancel/data, delete-all type-to-confirm, theme/accent/decimals/language/demo/help |
| `settings-report.spec.ts` | Settings | 7 | /settings/report header, 8 toggle rows, aria-pressed attribute, toggle state change, bulk hide-all, bulk show-all |
| `misc-coverage.spec.ts` | Global/Multi | 11 | /~offline render + module links; /report/detail with data + filter tabs + back; /report/custom/[id]/edit flow; Transfer updates both wallet balances; Loan auto paid-off (give+get=0 → Lunas) |

### Route Coverage Matrix (22 routes spec §2.2)

| Route | File | Status |
|-------|------|--------|
| `/` | `navigation.spec.ts` | ✅ Covered |
| `/transactions` | `transactions.spec.ts`, `transactions-edit-delete.spec.ts` | ✅ Covered |
| `/transactions/add/income` | `transactions.spec.ts` | ✅ Covered |
| `/transactions/add/expense` | `transactions.spec.ts` | ✅ Covered |
| `/transactions/add/transfer` | `transactions.spec.ts`, `misc-coverage.spec.ts` | ✅ Covered |
| `/transactions/[id]` | `transactions.spec.ts`, `transactions-edit-delete.spec.ts` | ✅ Covered |
| `/transactions/history` | `transactions-history.spec.ts` | ✅ Covered |
| `/wallet` | `wallet.spec.ts`, `wallet-delete.spec.ts` | ✅ Covered |
| `/wallet/add` | `wallet.spec.ts` | ✅ Covered |
| `/wallet/[id]` | `wallet.spec.ts`, `wallet-delete.spec.ts` | ✅ Covered |
| `/report` | `report.spec.ts`, `report-monthly-custom.spec.ts` | ✅ Covered |
| `/report/custom/add` | `report.spec.ts`, `report-monthly-custom.spec.ts` | ✅ Covered |
| `/report/custom/[id]/edit` | `misc-coverage.spec.ts` | ✅ Covered |
| `/report/detail` | `report.spec.ts`, `misc-coverage.spec.ts` | ✅ Covered |
| `/report/category` | `report.spec.ts`, `report-monthly-custom.spec.ts` | ✅ Covered |
| `/loan` | `loan.spec.ts`, `loan-edit-delete.spec.ts` | ✅ Covered |
| `/loan/[counterpartyId]` | `loan.spec.ts`, `loan-edit-delete.spec.ts` | ✅ Covered |
| `/loan/add/give` | `loan.spec.ts` | ✅ Covered |
| `/loan/add/get` | `loan.spec.ts`, `loan-edit-delete.spec.ts` | ✅ Covered |
| `/loan/[counterpartyId]/edit/[entryId]` | `loan-edit-delete.spec.ts` | ✅ Covered |
| `/settings` | `settings.spec.ts`, `settings-backup.spec.ts` | ✅ Covered |
| `/settings/report` | `settings-report.spec.ts` | ✅ Covered |
| `/~offline` | `misc-coverage.spec.ts` | ✅ Covered |

### Helper tersedia di `tests/e2e/helpers/storage.ts`

| Helper | Fungsi |
|--------|--------|
| `setupPage(page)` | Set localStorage flags + inject CSS `pointer-events: none` pada Next.js dev overlay + MutationObserver untuk remove dev elements |
| `goto(page, path)` | Navigate dan wait 500ms |
| `gotoWithSeed(page, path, seedFn)` | Navigate → clear IDB (with schema init) → seed → reload |
| `clearIDB(page)` | Clear semua IDB stores; jika stores belum ada, buat schema terlebih dahulu via `onupgradeneeded` |
| `dismissDevOverlay(page)` | Remove Next.js dev overlay elements (`nextjs-portal`, dll) yang bisa intercept pointer events |
| `seedWallets(page, wallets)` | Insert wallet records ke IDB |
| `seedTransactions(page, transactions)` | Insert transaction records ke IDB (`category` optional) |
| `seedCounterparties(page, counterparties)` | Insert loan_counterparties ke IDB |
| `seedLoanEntries(page, entries)` | Insert loan_entries ke IDB (`wallet_id` optional, default null) |
| `TEST_ANON_ID` | UUID test untuk semua seed records |

**Interface `SeedLoanEntry`** (field names harus sinkron dengan `LoanEntry` schema):
- `transaction_date: string` — tanggal entry (bukan `entry_date`)
- `note?: string` — catatan opsional (bukan `description`)
- `wallet_id?: string | null` — jika null/undefined, WalletPicker auto-open di edit page
- Tidak ada field `is_paid_off` — field ini ada di `LoanCounterparty`, bukan `LoanEntry`

**Catatan penting:** `DB_VERSION` di `storage.ts` harus selalu sinkron dengan `DB_VERSION` di `src/lib/storage/idb-client.ts`. Per 2026-05-14 nilainya adalah `2`.

**`clearIDB` behavior:** jika DB belum dibuat (misal test navigates ke `/settings` yang tidak menggunakan IDB), `clearIDB` tetap memastikan semua 6 object stores ada via `onupgradeneeded`. Ini mencegah `NotFoundError` saat IDB-dependent pages diakses kemudian.

### Known Issues (E2E Tests) — Fixed

| Issue | Status | Fix Date |
|-------|--------|----------|
| `SeedLoanEntry` menggunakan field names yang salah (`description`, `entry_date`, `is_paid_off`) | ✅ FIXED | 2026-05-14 |
| Category page test navigates ke `/report/category` tanpa `?name=` param — halaman return empty state | ✅ FIXED | 2026-05-14 |
| Custom report form `getByLabel("Report Name")` diganti `locator('input#report-name')` | ✅ FIXED | 2026-05-14 |
| Settings language test menggunakan `/en/settings` (URL-based locale) — app pakai cookie-based locale | ✅ FIXED | 2026-05-14 |
| `getByText("DELETE ALL DATA")` dan `getByText("Sample Data")` strict mode violation — perbaiki dengan `.first()` | ✅ FIXED | 2026-05-14 |
| `getByText("Delete All Data").click()` strict mode violation — perbaiki dengan `.first().click()` | ✅ FIXED | 2026-05-14 |
| `clearIDB` tidak membuat IDB schema saat DB belum ada — `gotoWithSeed("/settings", ...)` menyebabkan `NotFoundError` saat navigasi ke IDB-dependent page | ✅ FIXED | 2026-05-15 |
| `nextjs-portal` (Next.js dev tools indicator badge) intercept pointer events pada header buttons di beberapa test — header buttons tidak dapat di-click | ✅ FIXED | 2026-05-15 |
| Loan entry tests menggunakan `getByText(/amount/).first()` yang match summary bar bukan entry row | ✅ FIXED | 2026-05-15 |
| Settings language test menggunakan `"Indonesian"` sebagai button name, padahal label aktual adalah `"Indonesia"` | ✅ FIXED | 2026-05-15 |
| Transaction edit tests seed tanpa `category` — form validation gagal saat submit karena category required | ✅ FIXED | 2026-05-15 |
| Wallet delete test untuk in-use wallet mengexpect `alertdialog` padahal production code menampilkan toast | ✅ FIXED | 2026-05-15 |
| Custom report test gagal karena bfcache restore stale state — fix dengan `page.goto("/report")` setelah submit | ✅ FIXED | 2026-05-15 |
| Loan entry dengan `wallet_id: null` menyebabkan WalletPicker auto-open yang memblokir header button clicks | ✅ FIXED | 2026-05-15 |

### Fixture files di `tests/e2e/fixtures/`

| File | Deskripsi |
|------|-----------|
| `backup-valid.json` | Valid `BackupData` (version 1) dengan 1 wallet + 1 transaksi untuk test Restore Backup |

---

## 14. Daftar Dokumen Spesifikasi

Aplikasi ini didokumentasikan dalam **7 dokumen** yang saling melengkapi:

| # | Dokumen | File |
|---|---------|------|
| 1 | **Global Architecture** (dokumen ini) | `tech-spec-global-architecture.md` |
| 2 | Module Wallet | `tech-spec-module-wallet.md` |
| 3 | Module Transactions | `tech-spec-module-transactions.md` |
| 4 | Module Loan | `tech-spec-module-loan.md` |
| 5 | Module Report | `tech-spec-module-report.md` |
| 6 | **Migrasi Storage: localStorage → IndexedDB** | `tech-spec-migration-indexeddb.md` |
| 7 | **Feature: Product Tour (Onboarding)** | `tech-spec-feature-product-tour.md` |

> Konvensi Semantic HTML tersedia di **§12** dokumen ini.

**Urutan baca yang disarankan untuk developer baru:**
1. Global Architecture (dokumen ini) — pahami konteks, stack, dan komponen shared
2. Module Wallet — fondasi data yang dipakai modul lain
3. Module Transactions — pencatatan utama keuangan
4. Module Loan — utang-piutang
5. Module Report — agregat dari ketiga modul di atas
6. Migrasi Storage — memahami lapisan penyimpanan IndexedDB
7. Feature Product Tour — onboarding interaktif

---

*— End of Technical Specification: Global Architecture (v1.0.0) —*
