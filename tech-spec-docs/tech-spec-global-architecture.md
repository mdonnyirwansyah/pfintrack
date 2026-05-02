# Technical Specification Document
## Global Architecture

**Aplikasi:** Personal Finance Manager
**Versi Dokumen:** 1.0
**Tanggal:** 2026-05-01
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

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

**Personal Finance Manager** adalah web app mobile-first untuk membantu pengguna individual mengelola keuangan pribadi, mencakup:

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
| `/loan` | Loan | Daftar counterparty |
| `/loan/[counterpartyId]` | Loan | Detail per orang |
| `/loan/add/give` | Loan | Form tambah Give |
| `/loan/add/get` | Loan | Form tambah Get |
| `/loan/[counterpartyId]/edit/[entryId]` | Loan | Edit single loan entry |

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
| Date picker | Native HTML date input atau library setara. Format display: bahasa Indonesia *"Jum, 01 Mei 2026"*. |
| Time picker | Native HTML time input. Format 24-jam (`HH:MM`). |
| Date navigator (Transactions list) | Tombol `‹` & `›` untuk previous/next day. Tap teks tanggal → buka full date picker (tanggal/bulan/tahun). |

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

---

## 4. Standar Lintas-Modul

### 4.1 Format Angka & Mata Uang

Semua nilai uang ditampilkan dengan **locale Indonesia (`id-ID`)**:

| Format | Contoh |
|--------|--------|
| Pemisah ribuan | Titik (`.`) |
| Pemisah desimal | Koma (`,`) |
| Jumlah desimal | Selalu 2 digit |
| Mata uang default | IDR (Rupiah) |
| Tampilan negatif | Prefix `-` dengan spasi: `- 17.000,00` |
| Tampilan positif (kontekstual) | Prefix `+` dengan spasi: `+ 5.000,00` (untuk income, get loan, balance correction positif) |

**Penyimpanan vs Tampilan:**
- Di `localStorage`: angka **murni** (mis. `823110.46`, format JavaScript Number)
- Di UI: format locale (mis. `"823.110,46"`)
- Konversi dilakukan di lapisan UI menggunakan `Intl.NumberFormat('id-ID')`.

### 4.2 Format Tanggal & Waktu

**Penyimpanan (di localStorage):**

| Tipe | Format | Contoh |
|------|--------|--------|
| Tanggal saja | ISO 8601 date (`YYYY-MM-DD`) | `"2026-05-01"` |
| Waktu saja | 24-jam (`HH:MM`) | `"13:55"` |
| Timestamp lengkap | ISO 8601 datetime UTC | `"2026-05-01T13:55:00.000Z"` |

**Tampilan di UI:**

> ✅ **RESOLVED (2026-05-01):** Standar tunggal telah ditetapkan — **English semua**, baik display maupun input.

| Konteks | Format | Contoh |
|---------|--------|--------|
| Header Transactions list (current day) | English singkat | `Fri, 01 May 2026` |
| Header Loan Detail (entry list) | English singkat | `Sun, 19 Apr 2026` |
| Header section Report (Monthly, Custom) | English singkat | `01 May 2026 - 31 May 2026` |
| Form input (Date Picker pre-filled) | English singkat | `Fri, 01 May 2026` |

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
| `wallet_balance_history` | Wallet (saat user edit balance manual) | Report (untuk Balance Correction) | Hanya dicatat saat edit manual, bukan akibat transaksi |
| `transactions` | Transactions (CRUD) | Report (Income, Expenses, Donut chart) | Transfer tidak dihitung di Income/Expenses |
| `loan_counterparties` | Loan (CRUD) | — | Internal Loan |
| `loan_entries` | Loan (CRUD) | Report (Loan cash flow) | Cash flow loan = Get − Give per periode |
| `custom_reports` | Report (CRUD) | — | Internal Report |

### 6.3 Aturan Konsistensi Saldo Wallet

Berlaku untuk **semua operasi yang menyentuh `wallet.balance`**:

| Aksi | Efek terhadap `wallet.balance` | Catat ke `wallet_balance_history`? |
|------|-------------------------------|-------------------------------------|
| Tambah wallet baru (initial balance) | Set balance awal | ❌ Tidak |
| Edit balance manual via Edit Wallet | Set balance baru | ✅ Ya |
| Tambah transaksi income | `+= amount` | ❌ Tidak |
| Tambah transaksi expense | `-= amount` | ❌ Tidak |
| Tambah transaksi transfer | Source `-= amount`, Destination `+= amount` | ❌ Tidak |
| Edit/hapus transaksi | Rollback efek lama, apply efek baru | ❌ Tidak |
| Tambah loan give (dengan wallet) | `-= amount` | ❌ Tidak |
| Tambah loan get (dengan wallet) | `+= amount` | ❌ Tidak |
| Edit/hapus loan entry | Rollback efek lama, apply efek baru | ❌ Tidak |
| Soft delete wallet | (tidak ubah balance) | ❌ Tidak |

**Filosofi:** Hanya **edit manual** yang tergolong "koreksi" — perubahan akibat operasi normal sudah punya audit trail-nya sendiri di `transactions` atau `loan_entries`.

---

## 7. Inventaris Lengkap Key di localStorage

| Key | Pemilik | Deskripsi | Versi Dokumen |
|-----|---------|-----------|---------------|
| `anon_id` | Global | UUID v4 sebagai penanda anonymous user | Global Architecture |
| `wallets` | Wallet | Array daftar wallet user | Module Wallet |
| `wallet_balance_history` | Wallet | Array riwayat perubahan balance manual | Module Wallet |
| `transactions` | Transactions | Array transaksi (income, expense, transfer) | Module Transactions |
| `loan_counterparties` | Loan | Array daftar orang (counterparty loan) | Module Loan |
| `loan_entries` | Loan | Array transaksi loan (give, get) | Module Loan |
| `custom_reports` | Report | Array custom report buatan user | Module Report |

**Total: 7 key di localStorage.**

Setiap key (kecuali `anon_id`) berisi array of objects dengan field umum yang konsisten:
- `id` — UUID v4
- `anon_id` — referensi ke `localStorage['anon_id']`
- `is_active` — soft delete flag (kecuali `anon_id` & `wallet_balance_history` yang juga punya `is_active`)
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
| 19 | Multi-currency support | ⏭️ **Skip** — IDR only, field `currency` sebagai placeholder | Global |
| 20 | Drag-to-reorder wallet | ⏭️ **Skip** — field `sort_order` sudah ada, UI nanti | Wallet |

---

---

## 11. Module Settings (`/settings`)

Route tunggal, tab ke-4 di Bottom Navigation (di sebelah kiri Report).

### 11.1 Screens

**Screen: Settings (`/settings`)**

| Section | Komponen | Deskripsi |
|---------|----------|-----------|
| **Appearance** | Theme selector | 3 opsi: **Light** · **Dark** · **System** (mengikuti OS). Opsi aktif ditandai checkmark + warna primary. Menggunakan `next-themes` `setTheme()`. |
| **Language** | Language selector | 2 opsi: **English** (aktif) · **Indonesia** (badge "Soon" — belum diimplementasi). Lihat §11.2 untuk rencana i18n. |
| **About** | Info row | Nama app + versi (mis. `v0.1.0`). |

### 11.2 Rencana i18n (Fase 1.5 — belum diimplementasi)

Language switch Indonesia/English direncanakan dengan pendekatan berikut:

| Aspek | Rencana |
|-------|---------|
| **Storage** | Preference disimpan di `localStorage['app_settings']` (key baru, bukan bagian 7 key utama) |
| **State** | Zustand store `useAppSettingsStore` — field `language: "en" \| "id"` |
| **Text strings** | Dictionary di `src/lib/i18n/en.ts` dan `src/lib/i18n/id.ts`, diakses via hook `useT()` |
| **Scope terjemahan** | Label UI, placeholder, pesan error validasi, empty state, header titles, dialog text |
| **TIDAK diterjemahkan** | Format tanggal (tetap English per §4.2), format angka (tetap id-ID Intl), nama field record di storage |
| **Default** | English (`"en"`) |

### 11.3 Konsistensi Text — Aturan Fase 1

Sampai i18n diimplementasi, **semua UI text menggunakan English**:

| Kategori | Contoh benar | Contoh salah |
|----------|-------------|-------------|
| Validation errors | `"Date is required"` | `"Tanggal harus dipilih"` |
| Empty states | `"No wallets yet"` | `"Belum ada wallet"` |
| Confirm dialogs | `"Delete Wallet?"` / `"Cancel"` / `"Delete"` | `"Hapus Wallet?"` / `"Batal"` / `"Hapus"` |
| Warning messages | `"Insufficient wallet balance"` | `"Saldo wallet tidak mencukupi"` |
| Fallback labels | `"Without explanation"` | `"Tanpa keterangan"` |
| Amount field | `"Amount is required"` | `"Nominal tidak boleh kosong"` |
| Name field | `"Name is required"` | `"Nama tidak boleh kosong"` |

---

## 12. Daftar Dokumen Spesifikasi

Aplikasi ini didokumentasikan dalam **5 dokumen** yang saling melengkapi:

| # | Dokumen | File |
|---|---------|------|
| 1 | **Global Architecture** (dokumen ini) | `tech-spec-global-architecture.md` |
| 2 | Module Wallet | `tech-spec-module-wallet.md` |
| 3 | Module Transactions | `tech-spec-module-transactions.md` |
| 4 | Module Loan | `tech-spec-module-loan.md` |
| 5 | Module Report | `tech-spec-module-report.md` |

**Urutan baca yang disarankan untuk developer baru:**
1. Global Architecture (dokumen ini) — pahami konteks, stack, dan komponen shared
2. Module Wallet — fondasi data yang dipakai modul lain
3. Module Transactions — pencatatan utama keuangan
4. Module Loan — utang-piutang
5. Module Report — agregat dari ketiga modul di atas

---

*— End of Technical Specification: Global Architecture (v1.1) —*
