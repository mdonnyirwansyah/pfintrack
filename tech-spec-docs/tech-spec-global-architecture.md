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
| Background | Bervariasi per modul: <br>• Biru muda `#A6D5F2` (Transactions list, Loan list, Loan detail) <br>• Biru solid `#2196F3` (Wallet list, Report, semua form Add/Edit) |
| Warna teks | Putih |
| Tombol back | Ikon `‹` di kiri, hanya muncul di screen non-root (Add, Edit, Detail). Memicu `router.back()`. |
| Judul | Rata tengah. Bold. Bisa dengan subtitle (mis. di Loan Detail menampilkan "Not paid off"). |
| Action buttons | Optional, di kanan header (mis. ⚙️ Settings di Report header, ikon download/dokumen di Transactions list, ikon person+check/edit/delete di Loan Detail). |

### 3.2 Bottom Navigation

| Properti | Spesifikasi |
|----------|-------------|
| Posisi | Fixed bottom |
| Tinggi | `60px` + safe area inset bottom |
| Jumlah tab | **4 tab** (sebelumnya 5 — Settings dihapus dari scope) |
| Background | Putih dengan border-top tipis |

**Daftar tab:**

| Urutan | Label | Ikon | Route | Default tab? |
|--------|-------|------|-------|-------------|
| 1 | Transactions | Buku terbuka 📖 | `/transactions` | ✅ Ya |
| 2 | Wallet | Kartu kredit 💳 | `/wallet` | |
| 3 | Report | Bar chart 📊 | `/report` | |
| 4 | Loan | Layout/dashboard | `/loan` | |

**Aturan visual tab aktif:**
- Tab aktif: ikon dan label berwarna biru `#2196F3`, ikon dalam bentuk filled
- Tab non-aktif: ikon dan label berwarna abu `#9E9E9E`, ikon dalam bentuk outline
- Penentuan tab aktif berdasarkan **prefix path**: tab Transactions aktif jika path dimulai dengan `/transactions`, Wallet jika `/wallet`, dst.

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

Berdasarkan UI yang ada, terjadi inkonsistensi format antar screen. **Standar yang ditetapkan:**

| Konteks | Format | Contoh |
|---------|--------|--------|
| Header Transactions list (current day) | English singkat | `Fri, 01 May 2026` |
| Header Loan Detail (entry list) | English singkat | `Sun, 19 Apr 2026` |
| Header section Report (Monthly, Custom) | English singkat | `01 May 2026 - 31 May 2026` |
| Form input (Date Picker pre-filled) | Bahasa Indonesia singkat | `Jum, 01 Mei 2026` |

> **Rekomendasi finalisasi:** Sebaiknya disepakati **satu standar** untuk konsistensi UX. Saat ini campuran English (untuk display read-only) dan Indonesia (untuk input form). Tim developer perlu memutuskan apakah mengikuti pola yang ada atau menyatukan semua ke salah satu format.

### 4.3 Palet Warna

| Warna | Kode | Penggunaan |
|-------|------|-----------|
| Biru utama | `#2196F3` | Header form, FAB primer, tab aktif, tombol Save, accent buttons |
| Biru muda | `#A6D5F2` | Header beberapa list (Transactions, Loan) |
| Hijau (positive) | `#4CAF50` (atau senada) | Income, Get loan, Balance positif, Paid off, "+ angka" |
| Merah (negative) | `#F44336` (atau senada) | Expense, Give loan, Balance negatif, "- angka", tombol Delete |
| Oranye | `#FF9800` (atau senada) | FAB sub-action Income, FAB sub-action Get di Loan, accent Get summary |
| Pink | senada | Outstanding/Selisih di Loan Detail |
| Abu primer | `#212121` | Teks utama |
| Abu sekunder | `#757575` | Teks subtitle, label form |
| Abu divider | `#E0E0E0` | Garis pemisah antar item |
| Putih | `#FFFFFF` | Background konten utama |

### 4.4 Tipografi

| Elemen | Style |
|--------|-------|
| Header title | Bold, 18–20px, putih |
| Section header | Bold, 16–18px |
| Item title (list) | Semi-bold, 16px |
| Item subtitle (list) | Reguler, 14px, abu |
| Body | Reguler, 14–16px |
| Number (saldo, nominal) | Semi-bold, 16–24px tergantung konteks |
| Caption | Reguler, 12px, abu |

### 4.5 Spacing & Layout

| Aspek | Nilai |
|-------|-------|
| Padding container | 16px horizontal |
| Spacing antar field form | 12–16px vertikal |
| Tap target minimum | 44x44px (sesuai standar mobile) |
| Border radius card/input | 8px |
| Border radius FAB | 50% (lingkaran penuh) |
| Border radius button | 8px |
| Drop shadow card | `0 2px 8px rgba(0,0,0,0.08)` |

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

## 10. Asumsi yang Belum Dikonfirmasi (Konsolidasi)

Daftar konsolidasi seluruh asumsi yang masih perlu validasi dari semua module spec. Ini adalah backlog untuk diskusi tim sebelum atau saat development.

### 10.1 Visual & UX

| # | Asumsi | Modul Terkait |
|---|--------|--------------|
| 1 | Format tanggal di UI menggunakan campuran English (display) & Indonesia (form) — perlu disepakati standar tunggal | Semua |
| 2 | Counterparty Loan yang sudah Paid off tetap muncul di list (tidak ada toggle "hide paid off") | Loan |
| 3 | Donut chart Report membatasi 8 kategori, sisanya jadi "Lainnya" | Report |

### 10.2 Logika Bisnis

| # | Asumsi | Modul Terkait |
|---|--------|--------------|
| 4 | Saat amount Expense > balance wallet, sistem hanya menampilkan warning, tidak block (saldo boleh minus) | Transactions |
| 5 | Outstanding Loan negatif (user yang berhutang) ditampilkan di Summary "Give" sebagai nilai absolut | Loan |
| 6 | Periode Realtime Report = bulan berjalan penuh (1 - akhir bulan), bukan sampai hari ini saja | Report |
| 7 | Range maksimum custom report 10 tahun (untuk performa) | Report |
| 8 | Saat balance wallet berubah karena edit/delete transaksi lampau, **tidak** dicatat di `wallet_balance_history` | Wallet, Transactions |

### 10.3 UI yang Belum Ada Gambarnya

| # | Item | Modul Terkait |
|---|------|---------------|
| 9 | Edit/Detail Transaction screen | Transactions |
| 10 | Edit/Detail Wallet screen | Wallet |
| 11 | Edit single Loan Entry screen | Loan |
| 12 | Tab History Transactions (search) | Transactions |
| 13 | Edit Custom Report screen (dengan tombol Delete) | Report |
| 14 | Drill-down detail kategori dari donut chart | Report |
| 15 | Konfirmasi Mark as Paid, Delete Counterparty, Delete Wallet, Delete Transaction | Loan, Wallet, Transactions |
| 16 | Empty state ilustrasi untuk semua modul | Semua |

### 10.4 Fitur Belum Didefinisikan

| # | Item | Modul Terkait |
|---|------|---------------|
| 17 | Restore wallet/transaksi/loan dari soft-delete | Semua |
| 18 | Backup/restore data manual oleh user (export JSON?) | Global |
| 19 | Multi-currency support | Global |
| 20 | Drag-to-reorder wallet | Wallet |

---

## 11. Daftar Dokumen Spesifikasi

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

*— End of Technical Specification: Global Architecture (v1.0 Final) —*
