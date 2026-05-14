# Technical Specification Document
## Module: Transactions

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.0.0
**Tanggal:** 2026-05-14
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **1.0.0** | **2026-05-14** | **Baseline release. Konsolidasi seluruh revisi sebelumnya (v1.3–v1.5) menjadi versi rilis pertama. Mencakup: Transaction List (date navigator, summary bar, sort control, swipe navigation, long-press delete + undo, welcome card), 3 form Add (Income/Expense/Transfer) dengan real-time formatting, suggestion chips dari history, WalletPicker bottom sheet, Transaction History (search), Export Excel (.xlsx), 5-tab Bottom Navigation, tipe transaksi dikunci saat edit, kategori khusus Balance Correction, dan catatan dead code.** |

---

> **Catatan Scope:**
> Dokumen ini hanya mencakup **Module Transactions**, terdiri dari 5 screen utama:
> Transaction List, Add Transaction (Income), Add Transaction (Expense), Add Transaction (Transfer), dan Transaction History (Search).
> Modul lain (Wallet, Report, Loan, Settings) dibahas dalam dokumen terpisah.
> Konfigurasi global (layout, navigasi, migrasi auth) dibahas dalam dokumen **Global Architecture**.

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Aplikasi adalah **Web App Mobile-First** dengan Next.js, diakses via browser mobile. |
| 2 | **Fase 1:** Tidak ada backend, tidak ada autentikasi. Semua data transaksi disimpan di **`localStorage`** browser. |
| 3 | Pengguna diidentifikasi anonim dengan UUID v4 di `localStorage['anon_id']` (sama dengan Module Wallet — bukan key baru). |
| 4 | Format angka menggunakan locale **`id-ID`** (titik ribuan, koma desimal). Contoh: `1.500.000,50`. |
| 5 | Mata uang default: **IDR**. |
| 6 | Data transaksi disimpan di `localStorage['transactions']` sebagai JSON array. |
| 7 | Setiap transaksi **wajib terhubung ke wallet** (referensi `wallet_id`). Khusus tipe `transfer` membutuhkan dua wallet (`wallet_id` sebagai sumber dan `destination_wallet_id` sebagai tujuan). |
| 8 | **Suggestion chips** (title & category) di-generate dari **history transaksi user** — kombinasi unik yang pernah dipakai sebelumnya pada tipe transaksi yang sama. Bukan preset hardcoded. |
| 9 | Tap pada **chip title** otomatis mengisi field title **dan** category sekaligus (paket). Tap pada **chip category** hanya mengisi field category. |
| 10 | Filter tanggal di Transaction List bersifat **per hari** — navigasi maju/mundur satu hari, atau pilih tanggal spesifik via date picker (tanggal/bulan/tahun). Tidak ada filter range. |
| 11 | Saat transaksi disimpan, **balance wallet terkait otomatis ter-update**: `income` menambah, `expense` mengurangi, `transfer` mengurangi sumber & menambah tujuan. |
| 12 | Saat transaksi diubah/dihapus, balance wallet terkait juga harus **di-rekalkulasi** (transaksi lama dibatalkan efeknya, transaksi baru diaplikasikan). |
| 13 | Tipe transfer dianggap **netral terhadap Income/Expenses summary** — tidak masuk ke perhitungan total income maupun total expenses harian. |

---

## 1. UI Component Breakdown

### Screen 1 — Transaction List (`/transactions`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Bar atas dengan background biru muda. Berisi date navigator dan dua tombol aksi di kanan. |
| **Date Navigator** | Interaktif | Tampilan tanggal aktif dalam format locale-aware (mis. "Fri, 01 May 2026" untuk EN) di tengah. Tombol `‹` di kiri untuk hari sebelumnya, `›` di kanan untuk hari berikutnya. Tap pada teks tanggal → membuka **custom calendar popup** (bukan native date picker): navigasi bulan `‹ MMMM YYYY ›` (locale-aware), grid hari 7×n dengan weekday headers single-letter locale-aware dari `date-fns` (mulai Minggu), highlight hari ini dengan outline, tombol **"Today"** / **"Hari ini"** (sesuai locale via `tc("today")`). Tanggal aktif disinkronkan ke URL via query param `?date=YYYY-MM-DD` agar state terjaga saat navigasi ke form Add dan kembali. |
| **Header Action: Export** | Interaktif | Ikon download di header. Tap → trigger export seluruh data transaksi ke file **Excel (.xlsx)** dan diunduh oleh browser. |
| **Header Action: History** | Interaktif | Ikon dokumen di header. Tap → navigasi ke screen **Transaction History (Search)** yang menampilkan seluruh transaksi (bukan hanya tanggal aktif) dengan kemampuan pencarian. |
| **Summary Bar** | Dinamis | Tiga kolom ringkasan untuk **tanggal aktif** saja: **Income** (hijau) · **Expenses** (merah, dengan prefix `"- "` jika > 0) · **Balance** (selisih income − expenses; prefix `"- "` jika negatif). Tipe transfer **tidak** dihitung di sini. |
| **Sort Control** | Interaktif | Pill button di kanan atas list (hanya muncul jika ada transaksi). Tap → dropdown dengan 4 opsi urutan: **Newest first** (default) · **Oldest first** · **Highest amount** · **Lowest amount**. Pill berwarna biru jika sort bukan default. Komponen reusable `SortPill` (`src/components/shared/SortPill.tsx`) sudah ada. **Catatan implementasi:** `transactions/page.tsx` menduplikasi sort logic secara inline, bukan menggunakan komponen `SortPill` — ini adalah code smell yang perlu direfactor. |
| **Swipe Navigation** | Interaktif | Geser layar ke kiri → maju satu hari. Geser ke kanan → mundur satu hari. Diimplementasi via `useSwipe` hook (threshold: 50px horizontal, diabaikan jika gerakan vertikal lebih dominan). |
| **Transaction List** | Dinamis | Daftar transaksi pada tanggal aktif, diurutkan sesuai `sortKey` aktif. Setiap item (`TransactionItem`) menampilkan: ikon tipe (circle dengan +/-) + **title** (primary, atas) + **category + description** (secondary, bawah, jika ada) + nominal (kanan atas, warna: income=hijau, expense=merah, transfer=abu) + waktu transaksi (kanan bawah) + badge nama wallet (hanya untuk income/expense). Transfer menampilkan "Wallet Asal → Wallet Tujuan" sebagai title. **Long-press item (≥500ms) → konfirmasi hapus.** |
| **Long-press Delete + Undo** | Interaktif | Tekan dan tahan (≥500ms) pada item transaksi → muncul dialog konfirmasi. Konfirmasi → item langsung disembunyikan dari list + muncul toast "Transaction deleted" dengan tombol **Undo** selama 5 detik. Tap Undo → item muncul kembali, soft-delete dibatalkan. Jika tidak di-undo → `softDeleteTransaction()` dipanggil setelah 5 detik. |
| **Empty State** | Dinamis | Tampil saat tidak ada transaksi di tanggal aktif. Berupa ilustrasi dokumen + teks deskriptif di tengah konten. |
| **Welcome Card** | Dinamis (first-run) | Tampil **menggantikan empty state** saat `wallets.length === 0 && transactions.length === 0` (aplikasi baru dipakai pertama kali). Menawarkan dua pilihan: **"Eksplorasi dengan Data Sampel"** (inject demo data + reload) dan **"Mulai dari Nol"** (dismiss card). Lihat §3.10 Global Architecture untuk detail Demo Mode. |
| **FAB Expandable** | Interaktif | Tombol mengambang biru `+` di pojok kanan bawah. Tap → mengembang menjadi 3 sub-action vertikal di atasnya (urut dari bawah ke atas): **Expense** (merah, ikon keranjang) · **Income** (oranye, ikon tren naik) · **Transfer** (abu, ikon panah dua arah). Tap di luar area FAB → menutup ekspansi. Form yang dituju menerima `?date=YYYY-MM-DD` dari tanggal aktif. Setelah save, redirect ke `/transactions?date=YYYY-MM-DD` (bukan `/transactions` tanpa param). |
| **Bottom Navigation** | Shared · Statis | **5 tab**: **Transactions** (aktif) · Wallet · Loan · Report · Settings. *(Komponen shared, lihat Global Architecture.)* |

---

### Screen 2 — Add Transaction (Income) (`/transactions/add/income`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Tombol back `‹` di kiri (kembali ke Transaction List). Judul "Add Income" di tengah. |
| **Date + Time Row** | Interaktif | Date dan Time tampil **berdampingan dalam satu baris horizontal** (Date: 3/5 lebar, Time: 2/5 lebar). Date: `type="date"` native input, default dari `?date=` query param (fallback hari ini). Time: `type="time"` native input, default waktu saat ini. |
| **Wallet Selector** | Interaktif | Button yang menampilkan nama wallet terpilih (atau placeholder "Select wallet"). Tap → membuka **Bottom Sheet "Select Wallet"**. **Auto-open saat Add mode** (picker otomatis terbuka saat halaman dimuat jika belum ada wallet yang dipilih). Setelah wallet dipilih, saldo wallet ditampilkan di bawah button sebagai teks tertiary. |
| **Amount Field** | Interaktif | Input teks (`type="text" inputMode="decimal"`) untuk nominal transaksi. Placeholder *"Enter the amount"*. Ikon kalkulator dekoratif di kanan. **Real-time formatting on onChange**: angka diformat id-ID otomatis saat user mengetik (titik sebagai pemisah ribuan, koma sebagai desimal). Bukan onFocus/onBlur pattern. Wajib diisi, > 0. |
| **Title Field** | Interaktif | Input teks bebas. Placeholder *"Type here for new title"*. Wajib diisi. |
| **Title Suggestion Chips** | Dinamis | Sederet chip biru di bawah field title. Berisi **title unik** yang pernah dipakai user pada transaksi tipe `income`. Tap chip → mengisi field title **dan** field category secara bersamaan (paket dari history). |
| **Category Field** | Interaktif | Input teks bebas. Placeholder *"Type here for new category"*. Wajib diisi. |
| **Category Suggestion Chips** | Dinamis | Sederet chip biru di bawah field category. Berisi **category unik** yang pernah dipakai pada transaksi tipe `income`. Tap chip → hanya mengisi field category. |
| **Description Field** | Opsional | **`<textarea>`** multi-line (3 baris), bersifat opsional. Placeholder *"Description (optional)"*. Maksimum 255 karakter. |
| **Cancel Button** | Interaktif | Tombol kiri di baris bawah form. Background abu, teks "Cancel". Tap → `router.back()`. |
| **Save Button** | Interaktif | Tombol kanan di baris bawah form (flex-1 berdampingan dengan Cancel). Warna biru `#2196F3`, teks "Save". Kondisi loading menampilkan teks "Saving...". |

**Bottom Sheet "Select Wallet":**

| Komponen | Deskripsi |
|----------|-----------|
| **Header** | Teks "Select Wallet" di kiri. Dua ikon di kanan (✏️ manage wallet dan 📄 history wallet) **belum diimplementasi** — pending Fase 1. |
| **Wallet Grid** | Daftar wallet aktif dalam grid 3 kolom. Setiap card berisi nama wallet di tengah, dengan border tipis. Tap → memilih wallet dan menutup bottom sheet. |

---

### Screen 3 — Add Transaction (Expense) (`/transactions/add/expense`)

Judul header: **"Add Expense"**. Struktur **identik** dengan Add Income, dengan perbedaan:

| Aspek | Income | Expense |
|-------|--------|---------|
| Tipe transaksi yang disimpan | `income` | `expense` |
| Sumber suggestion chips | Title & category dari transaksi `income` user | Title & category dari transaksi `expense` user |
| Efek terhadap balance wallet | **Menambah** balance | **Mengurangi** balance |
| Warna nominal di list | Hijau | Merah |
| Validasi tambahan | — | (Opsional) Jika `amount > balance wallet`, tampilkan **warning** "Insufficient wallet balance" — tetap bisa disimpan (saldo bisa minus) |

---

### Screen 4 — Add Transfer (`/transactions/add/transfer`)

Judul header: **"Add Transfer"**. Struktur mirip Add Income/Expense, dengan perbedaan:

| Komponen | Deskripsi Teknis |
|----------|-----------------|
| **Source Wallet** | Field dropdown pertama (label "From Wallet"). Wallet asal (uang dikurangi). Wajib diisi. Saldo wallet ditampilkan di kanan button. **Auto-open** saat Add mode. |
| **Destination Wallet** | Field dropdown kedua (label "To Wallet"). Wallet tujuan (uang ditambah). Wajib diisi. **Tidak boleh sama** dengan Source Wallet. Saldo wallet ditampilkan di kanan button. |
| **Date + Time Row** | Date dan Time tampil **berdampingan horizontal** (Date: 3/5, Time: 2/5). Behavior identik dengan form Income/Expense. |
| **Amount Field** | Input teks (`type="text" inputMode="decimal"`) dengan **real-time onChange formatting** sama seperti form Income/Expense. |
| **Title Field** | **Tidak ada.** Transfer tidak memiliki title/category. |
| **Category Field** | **Tidak ada.** |
| **Suggestion Chips** | **Tidak ada.** |
| **Description Field** | Tetap ada, opsional. |

**Validasi khusus Transfer:**
- Source dan Destination Wallet **harus berbeda**.
- Saat user memilih Source Wallet, opsi yang sama otomatis dinonaktifkan/disembunyikan di Destination Wallet picker, dan sebaliknya.

---

### Screen 5 — Transaction History (Search) (`/transactions/history`)

> Diakses dari ikon dokumen 📄 di header Transaction List.

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Tombol back `‹`. Judul "History". |
| **Search Bar** | Interaktif | Input teks dengan ikon search 🔍. Placeholder *"Search transactions..."*. Mencari pada field: `title`, `category`, `description`, nama wallet (`wallet_id`), **dan nama destination wallet** (`destination_wallet_id`). Pencarian bersifat **real-time** dan **case-insensitive**. Tombol **X (clear)** muncul di kanan saat ada query untuk menghapus pencarian. Auto-focus saat halaman dibuka. |
| **Transaction List (All)** | Dinamis | Seluruh transaksi user (tanpa filter tanggal). **Selalu di-group per tanggal** sebagai header section (date label + divider + item count). Dalam setiap group, urut DESC by `transaction_time`. |
| **Empty State (Search)** | Dinamis | Tampil jika query search tidak menemukan hasil. Teks: *"Tidak ada transaksi yang cocok dengan pencarian"*. |

---

## 2. User Interactions & Flow

### Flow: Buka Transaction List

```
User tap tab "Transactions" di Bottom Nav
              ↓
   Set tanggal aktif = nilai dari ?date= query param, fallback hari ini
              ↓
   Baca localStorage['transactions']
              ↓
   Filter: transaction_date == tanggal aktif
              ↓
   Hitung Summary (Income, Expenses, Balance) dari list ter-filter
              ↓
   Render list (urut DESC by transaction_time, tiebreaker: created_at DESC)
              ↓
   Jika list kosong → tampilkan Empty State
```

---

### Flow: Navigasi Tanggal

```
User tap tombol "‹" (Previous)
        └→ tanggal aktif = tanggal aktif − 1 hari
           → re-filter & re-render list

User tap tombol "›" (Next)
        └→ tanggal aktif = tanggal aktif + 1 hari
           → re-filter & re-render list

User tap teks tanggal
        └→ Buka custom calendar popup (month navigator + day grid)
           User pilih hari → tanggal aktif = pilihan user
           → URL diupdate ke /transactions?date=YYYY-MM-DD
           → re-filter & re-render list
```

---

### Flow: FAB Expandable

```
User tap FAB "+" (kondisi tertutup)
        └→ FAB membuka 3 sub-action (bawah ke atas): Expense, Income, Transfer
           Background overlay semi-transparan muncul

User tap "Income"     → Navigasi ke /transactions/add/income?date=YYYY-MM-DD
User tap "Expense"    → Navigasi ke /transactions/add/expense?date=YYYY-MM-DD
User tap "Transfer"   → Navigasi ke /transactions/add/transfer?date=YYYY-MM-DD
User tap di area lain → FAB menutup, kembali ke kondisi awal
```

---

### Flow: Add Transaction (Income / Expense)

```
User memilih wallet → mengisi amount → mengisi title → mengisi category
                            ↓
        (Opsi) Tap chip title  → Auto-fill title + category dari history
        (Opsi) Tap chip category → Auto-fill category saja
                            ↓
              (Opsi) Mengisi description
                            ↓
                       Tap "Save"
                            ↓
                  [Validasi sisi client]
                ↓ GAGAL              ↓ LOLOS
        Tampilkan error      Buat objek transaction baru:
        per field            - id, anon_id, type
                             - wallet_id (yang dipilih)
                             - amount, title, category, description
                             - transaction_date, transaction_time
                             - created_at, updated_at
                                       ↓
                  Update balance wallet terkait:
                    income  → wallet.balance += amount
                    expense → wallet.balance −= amount
                                       ↓
                  Simpan transaction & wallet ke localStorage
                                       ↓
                  Kembali ke Transaction List
                  Summary & list ter-update otomatis
```

---

### Flow: Add Transaction (Transfer)

```
User pilih Source Wallet → pilih Destination Wallet → isi amount
                            ↓
              (Opsi) isi description
                            ↓
                      Tap "Save"
                            ↓
                  [Validasi sisi client]
                            ↓ LOLOS
              Buat objek transaction baru tipe 'transfer':
              - wallet_id          = Source Wallet
              - destination_wallet_id = Destination Wallet
                            ↓
              Update kedua wallet:
                Source.balance      −= amount
                Destination.balance += amount
                            ↓
              Simpan ke localStorage
                            ↓
              Kembali ke Transaction List
```

---

### Flow: Tap Chip Suggestion

```
─── Tap chip TITLE ──────────────────────────
   Cari kombinasi (title, category) di history transaksi user
   pada tipe yang sama (income/expense)
              ↓
   Ambil kombinasi terbaru (sorted by created_at DESC)
              ↓
   Isi: form.title    = chip.title
        form.category = chip.category   ← otomatis ikut terisi

─── Tap chip CATEGORY ───────────────────────
   Isi: form.category = chip.value      ← title tidak diubah
```

---

### Flow: Edit / Delete Transaction

```
User tap salah satu transaksi di list
              ↓
   Navigasi ke /transactions/[id] (detail/edit)
              ↓
   Tampilkan form ter-prefill dengan data transaksi
              ↓
       ┌───── User tap "Save" (edit) ─────┐
       │                                  │
       │  1. Batalkan efek transaksi LAMA │
       │     ke balance wallet            │
       │     - income lama  → balance −=  │
       │     - expense lama → balance +=  │
       │     - transfer    → reverse      │
       │                                  │
       │  2. Aplikasikan transaksi BARU   │
       │     ke balance wallet            │
       │                                  │
       │  3. Simpan ke localStorage       │
       └──────────────────────────────────┘
              ↓
       ┌───── User tap "Delete" ──────────┐
       │                                  │
       │  1. Konfirmasi dialog            │
       │  2. Batalkan efek transaksi      │
       │     ke balance wallet            │
       │  3. Hapus (soft delete:          │
       │     is_active = false)           │
       └──────────────────────────────────┘
              ↓
   Kembali ke Transaction List
```

---

### Flow: Export ke Excel

```
User tap ikon download di header
              ↓
   Ambil seluruh transaksi user (semua tanggal, is_active=true)
              ↓
   Konversi ke struktur tabel:
     Date | Time | Type | Wallet | Destination | Amount | Title | Category | Description
              ↓
   Generate file .xlsx (di sisi client)
              ↓
   Trigger download otomatis dengan nama:
     transactions_<anon_id_short>_<YYYYMMDD>.xlsx
```

---

### Flow: Search History

```
User tap ikon dokumen di header → Navigasi ke /transactions/history
              ↓
   Tampilkan seluruh transaksi user (urut DESC by date+time)
              ↓
   User mengetik di search bar
              ↓
   Filter real-time (case-insensitive) pada:
     - title
     - category
     - description
     - wallet name
              ↓
   Render hasil filter
   (jika kosong → empty state)
```

---

## 3. Validasi Client-Side

### Validasi Add Income / Expense

| Field | Aturan | Pesan Error |
|-------|--------|-------------|
| Date | Wajib diisi | "Tanggal harus dipilih" |
| Time | Wajib diisi | "Waktu harus dipilih" |
| Wallet | Wajib dipilih | "Pilih wallet terlebih dahulu" |
| Amount | Wajib diisi | "Nominal tidak boleh kosong" |
| Amount | Numerik & > 0 | "Nominal harus lebih dari 0" |
| Amount | Maksimum `999.999.999.999,99` | "Nominal melebihi batas maksimum" |
| Title | Wajib diisi | "Title tidak boleh kosong" |
| Title | Maksimum 100 karakter | "Title maksimal 100 karakter" |
| Category | Wajib diisi | "Category tidak boleh kosong" |
| Category | Maksimum 50 karakter | "Category maksimal 50 karakter" |
| Description | Opsional, maksimum 255 karakter | "Description maksimal 255 karakter" |

**Catatan khusus Expense:**
Jika `amount > wallet.balance`, tampilkan **warning** (bukan error) — pengguna tetap diizinkan menyimpan dengan kondisi saldo bisa minus.

---

### Validasi Add Transfer

| Field | Aturan | Pesan Error |
|-------|--------|-------------|
| Source Wallet | Wajib dipilih | "Pilih wallet sumber" |
| Destination Wallet | Wajib dipilih | "Pilih wallet tujuan" |
| Source ≠ Destination | Tidak boleh sama | "Wallet sumber dan tujuan tidak boleh sama" |
| Amount | Wajib & > 0 | "Nominal harus lebih dari 0" |
| Amount | Maksimum `999.999.999.999,99` | "Nominal melebihi batas maksimum" |

---

## 4. Data Modeling (localStorage Schema)

> Struktur dirancang **identik dengan skema database Fase 2** agar saat migrasi ke backend, bentuk data tidak berubah.

### Key: `transactions`

**Contoh isi data:**

```json
[
  {
    "id": "txn-d8f2a1b3-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "income",
    "wallet_id": "b3d9e1a2-cc4f-...",
    "destination_wallet_id": null,
    "amount": 5000000.00,
    "title": "Gaji Bulanan",
    "category": "Gaji Bulanan",
    "description": "Gaji bulan Mei 2026",
    "transaction_date": "2026-05-01",
    "transaction_time": "08:30",
    "is_active": true,
    "created_at": "2026-05-01T08:30:00.000Z",
    "updated_at": "2026-05-01T08:30:00.000Z"
  },
  {
    "id": "txn-e1c4a2b5-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "expense",
    "wallet_id": "c4e0f2b3-dd5a-...",
    "destination_wallet_id": null,
    "amount": 25000.00,
    "title": "Makan di Warteg",
    "category": "Makan dan Minum",
    "description": null,
    "transaction_date": "2026-05-01",
    "transaction_time": "12:15",
    "is_active": true,
    "created_at": "2026-05-01T12:15:00.000Z",
    "updated_at": "2026-05-01T12:15:00.000Z"
  },
  {
    "id": "txn-f9d3b1c4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "transfer",
    "wallet_id": "b3d9e1a2-cc4f-...",
    "destination_wallet_id": "c4e0f2b3-dd5a-...",
    "amount": 1000000.00,
    "title": null,
    "category": null,
    "description": "Transfer ke Dana Darurat",
    "transaction_date": "2026-05-01",
    "transaction_time": "13:53",
    "is_active": true,
    "created_at": "2026-05-01T13:53:00.000Z",
    "updated_at": "2026-05-01T13:53:00.000Z"
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas unik transaksi, di-generate client |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan. Sama dengan `localStorage['anon_id']` |
| `type` | String (Enum) | Wajib | Salah satu dari: `income`, `expense`, `transfer` |
| `wallet_id` | String (UUID v4) | Wajib | Untuk `income`/`expense`: wallet terkait. Untuk `transfer`: wallet **sumber**. Referensi ke `wallets[].id` |
| `destination_wallet_id` | String (UUID v4) atau `null` | Wajib jika `type=transfer`, `null` untuk lainnya | Untuk `transfer`: wallet **tujuan** |
| `amount` | Number (desimal) | Wajib, > 0 | Nominal transaksi. Disimpan sebagai angka murni tanpa format locale |
| `title` | String atau `null` | Wajib untuk income/expense (1–100 char). `null` untuk transfer | Judul transaksi |
| `category` | String atau `null` | Wajib untuk income/expense (1–50 char). `null` untuk transfer | Kategori transaksi (free-text) |
| `description` | String atau `null` | Opsional, maksimum 255 karakter | Catatan tambahan |
| `transaction_date` | String (ISO date `YYYY-MM-DD`) | Wajib | Tanggal transaksi (terpisah dari created_at agar bisa input transaksi tanggal lampau) |
| `transaction_time` | String (`HH:MM` 24-jam) | Wajib | Waktu transaksi |
| `is_active` | Boolean | Default: `true` | Penanda soft-delete. `false` = transaksi dihapus |
| `created_at` | String (ISO 8601) | Wajib | Timestamp saat transaksi dibuat |
| `updated_at` | String (ISO 8601) | Wajib | Timestamp terakhir kali diubah |

---

### Enum: `transaction.type`

| Nilai | Label UI | Warna | Efek terhadap Wallet | Mengisi Title/Category? |
|-------|----------|-------|---------------------|-------------------------|
| `income` | Income | Hijau | `wallet.balance += amount` | ✅ Wajib |
| `expense` | Expense | Merah | `wallet.balance −= amount` | ✅ Wajib |
| `transfer` | Transfer | Abu-abu / Netral | Source `−= amount`, Destination `+= amount` | ❌ Tidak |

---

### Kategori Khusus: "Balance Correction"

Transaksi dengan `title: "Balance Correction"` dan `category: "Balance Correction"` adalah **transaksi yang dibuat otomatis oleh Wallet module** (bukan input manual user) dalam dua kondisi:

| Kondisi | Tipe | Amount |
|---------|------|--------|
| Add Wallet dengan initial balance > 0 | `income` | `initialBalance` |
| Edit Wallet dengan delta > 0 (balance naik) | `income` | `Math.abs(delta)` |
| Edit Wallet dengan delta < 0 (balance turun) | `expense` | `Math.abs(delta)` |

**Sifat transaksi Balance Correction:**
- Muncul normal di Transaction list, bisa di-tap untuk dilihat/dihapus
- Tidak bisa di-edit (atau jika di-edit, ubah label form menjadi read-only)
- Menghapus transaksi ini membalik balance wallet via `rollbackTransactionFromWallet` — perilaku yang diinginkan
- Terhitung di Income/Expenses summary dan Report (sama seperti transaksi biasa)
- Suggestion chips **tidak** mengambil "Balance Correction" sebagai sumber (karena auto-generated, bukan user choice)

---

### Suggestion Chips — Sumber Data

| Konteks | Sumber Data |
|---------|------------|
| **Income — chip Title** | `transactions` di mana `type='income'` dan `is_active=true` → ambil **kombinasi unik (title, category)** → urut berdasarkan kemunculan terbaru |
| **Income — chip Category** | `transactions` di mana `type='income'` dan `is_active=true` → ambil **category unik** → urut berdasarkan kemunculan terbaru |
| **Expense — chip Title** | `transactions` di mana `type='expense'` dan `is_active=true` → ambil **kombinasi unik (title, category)** → urut berdasarkan kemunculan terbaru |
| **Expense — chip Category** | `transactions` di mana `type='expense'` dan `is_active=true` → ambil **category unik** → urut berdasarkan kemunculan terbaru |
| **Transfer** | Tidak ada chip suggestion |

**Catatan tampilan chip:**
- Maksimal **8 chip** ditampilkan per field (untuk menjaga UI ringkas).
- Jika user belum punya history → tidak ada chip yang ditampilkan (form sepenuhnya kosong, user input manual).
- Saat `anon_id` di-claim ke akun di Fase 2, chip akan terus konsisten karena `anon_id` di setiap transaksi tetap menjadi penanda kepemilikan sebelum dimigrasi.

> ⚠️ **Catatan Implementasi:** `getTitleSuggestions` dan `getCategorySuggestions` di `useTransactionStore.ts` saat ini **TIDAK** mengeksklusi transaksi "Balance Correction" dari sumber suggestion. Ini adalah **bug**: transaksi Balance Correction (auto-generated oleh Wallet module) akan muncul sebagai chip suggestion padahal seharusnya dieksklusi. Fix: tambahkan filter `t.title !== "Balance Correction"` dalam fungsi tersebut.

---

## 5. Frontend State Management

### Screen: Transaction List

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `activeDate` | String (ISO date) | Hari ini | Tanggal yang sedang aktif/ditampilkan |
| `transactions` | Array of Transaction | `[]` | Transaksi pada `activeDate`, urut DESC |
| `summary.income` | Number | `0` | Total income hari aktif |
| `summary.expenses` | Number | `0` | Total expense hari aktif |
| `summary.balance` | Number | `0` | `income − expenses` (transfer tidak dihitung) |
| `isLoading` | Boolean | `true` | Tampilkan skeleton saat `true` |
| `isFabExpanded` | Boolean | `false` | Status FAB membuka atau tertutup |
| `isDatePickerOpen` | Boolean | `false` | Modal date picker terbuka atau tidak |
| `pendingDeletes` | `Set<string>` | `new Set()` | ID transaksi yang sudah dikonfirmasi hapus tapi masih menunggu timeout Undo (disembunyikan dari UI) |

**Kondisi tampilan:**

| Kondisi | Tampilan |
|---------|----------|
| `isLoading: true` | Skeleton loader |
| `transactions` kosong | Empty state "There is no data" |
| `transactions` berisi | List + summary terisi |
| `isFabExpanded: true` | Tampilkan 3 sub-action + overlay |

---

### Screen: Add Transaction (Income / Expense)

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `form.transaction_date` | String (ISO date) | Hari ini | |
| `form.transaction_time` | String (`HH:MM`) | Waktu sekarang | |
| `form.wallet_id` | String / null | `null` | Wallet yang dipilih |
| `form.amount` | String | `""` | Raw input, di-parse saat submit |
| `form.title` | String | `""` | |
| `form.category` | String | `""` | |
| `form.description` | String | `""` | |
| `errors` | Object | `{}` | Map error per field |
| `isSubmitting` | Boolean | `false` | Loading state tombol Save |
| `isWalletOpen` | Boolean | **`true` jika add mode** (auto-open), `false` jika edit | Bottom sheet pilih wallet. Auto-open saat wallet_id belum terisi |
| `titleSuggestions` | Array of `{title, category}` | Diambil dari history | Source untuk chip title |
| `categorySuggestions` | Array of String | Diambil dari history | Source untuk chip category |

---

### Screen: Add Transaction (Transfer)

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `form.transaction_date` | String (ISO date) | Hari ini | |
| `form.transaction_time` | String (`HH:MM`) | Waktu sekarang | |
| `form.source_wallet_id` | String / null | `null` | Wallet sumber |
| `form.destination_wallet_id` | String / null | `null` | Wallet tujuan |
| `form.amount` | String | `""` | |
| `form.description` | String | `""` | |
| `errors` | Object | `{}` | |
| `isSubmitting` | Boolean | `false` | |
| `activeWalletPicker` | `'source' / 'destination' / null` | `null` | Menentukan bottom sheet sedang memilih wallet untuk field mana |

---

### Screen: Transaction History (Search)

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `allTransactions` | Array of Transaction | `[]` | Seluruh transaksi user, urut DESC |
| `searchQuery` | String | `""` | Query yang diketik user |
| `filteredTransactions` | Array of Transaction | sama dengan `allTransactions` | Hasil filter real-time |
| `isLoading` | Boolean | `true` | |

**Logic filter:**
Filter dilakukan in-memory secara real-time. Pencocokan case-insensitive pada `title`, `category`, `description`, nama wallet (`wallet_id`), **dan nama destination wallet** (`destination_wallet_id` — untuk transfer).

---

## 6. Struktur Halaman — Module Transactions

| Route | Nama Screen | Keterangan |
|-------|-------------|-----------|
| `/transactions` | Transaction List | Halaman utama module. Root screen dari tab Transactions |
| `/transactions/add/income` | Add Income | Form input transaksi pendapatan |
| `/transactions/add/expense` | Add Expense | Form input transaksi pengeluaran |
| `/transactions/add/transfer` | Add Transfer | Form input transfer antar wallet |
| `/transactions/[id]` | Transaction Detail / Edit | ✅ Implemented. Reuse `IncomeExpenseForm` (income/expense) atau `TransferForm` (transfer) pre-filled. Delete button di footer form → ConfirmDialog → soft delete + rollback wallet. **Tipe transaksi dikunci** (tidak bisa ubah income→expense saat edit). |
| `/transactions/history` | Transaction History (Search) | Search seluruh transaksi |

---

## 7. Catatan untuk Tim Developer

| Aspek | Catatan |
|-------|---------|
| **Konsistensi Saldo Wallet** | Setiap operasi tambah/edit/hapus transaksi **wajib memicu update balance wallet terkait**. Disarankan diimplementasikan dalam satu fungsi atomik (semua operasi sukses atau semua di-rollback) agar tidak terjadi data tidak konsisten. |
| **Edit Transaksi & Wallet** | Saat user mengubah transaksi yang sebelumnya menggunakan **Wallet A** menjadi **Wallet B**: balance Wallet A harus dipulihkan (efek transaksi lama dibatalkan), lalu balance Wallet B di-update dengan transaksi baru. Hal yang sama berlaku saat tipe transaksi berubah (misal income → expense). |
| **Transfer Antar Wallet** | Transfer melibatkan **dua wallet**. Saat edit/hapus transfer, kedua wallet harus di-update secara bersamaan. |
| **Tipe Transfer di Summary** | Transfer **tidak dihitung** sebagai income maupun expense di Summary Bar. Ini adalah pemindahan dana internal user, bukan arus masuk/keluar dari sistem keuangan user. |
| **Suggestion Chips** | Chip dihasilkan dari **history transaksi user pada tipe yang sama**. Limit tampilan 8 chip. Saat tap chip title → otomatis isi title + category. Saat tap chip category → hanya isi category. |
| **Free-text Category** | Field category bersifat **free-text**, bukan enum tertutup. Pengguna bebas membuat kategori baru. Suggestion chip membantu konsistensi naming, namun tidak memaksa. |
| **Filter Tanggal** | Hanya per hari. Navigasi `‹` `›` mengubah tanggal aktif ±1 hari. Tap teks tanggal membuka date picker untuk loncat ke tanggal tertentu. Tidak ada filter range. |
| **Format Tanggal di UI** | Semua tampilan tanggal menggunakan `formatDisplayDate(date, useLocale())` — locale-aware. EN: *"Fri, 01 May 2026"*, ID: *"Jum, 01 Mei 2026"*. Lihat §4.2 Global Architecture untuk detail implementasi. |
| **Format Penyimpanan Tanggal** | Selalu disimpan dalam **ISO 8601** (`YYYY-MM-DD` untuk date, `HH:MM` untuk time). Konversi ke format locale hanya dilakukan di lapisan UI. |
| **Empty State Suggestion** | Saat user belum pernah membuat transaksi tipe tertentu, **tidak ada chip** yang ditampilkan. Form sepenuhnya kosong dan user input manual. Setelah transaksi pertama disimpan, chip akan muncul di transaksi berikutnya. |
| **Export Excel** | Generate file `.xlsx` di sisi client menggunakan library `xlsx` (SheetJS). File di-download otomatis. Nama file: `transactions_<anon_id_short>_<YYYYMMDD>.xlsx` (8 karakter pertama `anon_id`). Kolom: Date, Time, Type, Wallet, Destination Wallet, Amount, Title, Category, Description. |
| **Performance Search** | Untuk Fase 1, pencarian dilakukan in-memory (filter array). Asumsi jumlah transaksi user di bawah 10.000 record — performa masih sangat baik. Jika nanti melebihi, perlu indexing atau virtual scrolling. |
| **Soft Delete** | Transaksi yang dihapus tidak dihapus permanen. `is_active: false` untuk keperluan audit dan migrasi Fase 2. Transaksi soft-deleted **tidak** mempengaruhi balance wallet (efeknya sudah di-rollback saat dihapus). |
| **Migrasi Fase 2** | Field `anon_id` di setiap transaksi adalah kunci migrasi. Saat user membuat akun, backend akan mencari semua transaksi dengan `anon_id` user dan memindahkannya ke `user_id` baru. |
| **Tipe Transaksi Dikunci saat Edit** | Saat edit transaksi, `type` tidak dapat diubah (income tidak bisa diubah jadi expense, dst). Form Income/Expense atau Transfer ditentukan dari tipe asal. Wallet balance rollback+apply tetap benar untuk tipe yang sama. |
| **Balance Correction dieksklusi dari Suggestion Chips** ✅ | `getTitleSuggestions` dan `getCategorySuggestions` di `useTransactionStore.ts` sudah memfilter `t.title !== "Balance Correction"` dan `t.category !== "Balance Correction"` sehingga transaksi sistem tidak muncul sebagai suggestion. |
| **SortPill: komponen shared** ✅ | `transactions/page.tsx` menggunakan komponen `SortPill` dari `src/components/shared/SortPill.tsx` beserta helper `applySortKey`. Tidak ada lagi sort logic inline. |
| **Swipe Navigation** | `useSwipe` hook di `transactions/page.tsx`: swipe kiri = maju satu hari, swipe kanan = mundur satu hari. Threshold 50px horizontal; diabaikan jika gerakan vertikal lebih dominan (scrolling). |
| **WalletPicker Header Icons (Pending)** | Spec menyebut dua ikon (✏️ dan 📄) di header WalletPicker. **Belum diimplementasi.** Tunda ke iterasi berikutnya. |

---

## 8. Asumsi — ✅ RESOLVED (2026-05-01)

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Tap item transaksi → Edit screen | ✅ **Reuse form Add**, pre-filled + Save & Delete |
| 2 | Edit transaction → recalculate wallet balance | ✅ Rollback efek lama, apply efek baru |
| 3 | Hapus transaksi via tombol di Edit screen | ✅ Confirmation dialog wajib (komponen reusable) |
| 4 | Expense > balance wallet | ✅ **Boleh minus + warning** (soft, tidak block) |
| 5 | Format tanggal | ✅ **Locale-aware** — menggunakan `useLocale()` + `date-fns/locale`. EN: `Fri, 01 May 2026`, ID: `Jum, 01 Mei 2026`. Weekday headers di calendar popup juga locale-aware (single-letter, mulai Minggu). |
| 6 | Limit chip suggestion | ✅ **8 chip** per field |
| 7 | Ikon ✏️ dan 📄 di bottom sheet wallet | ⏳ **Belum diimplementasi** — ✏️ seharusnya navigasi ke Module Wallet, 📄 ke riwayat wallet. Pending Fase 1. |

---

*— End of Technical Specification: Module Transactions (v1.0.0) —*
*Dokumen terkait: Module Wallet · Global Architecture · Module Report · Module Loan · Module Settings*
