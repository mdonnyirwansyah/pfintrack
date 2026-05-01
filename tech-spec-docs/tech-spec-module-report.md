# Technical Specification Document
## Module: Report

**Aplikasi:** Personal Finance Manager
**Versi Dokumen:** 1.0
**Tanggal:** 2026-05-01
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

> **Catatan Scope:**
> Dokumen ini hanya mencakup **Module Report** (laporan keuangan), terdiri dari 4 tampilan utama:
> Realtime Report, Monthly Report, Custom Report, dan Add/Edit Custom Report.
> Module Report bersifat **read-only & computed** — tidak menyimpan data transaksi sendiri, melainkan mengagregasi data dari Module Transactions, Loan, dan Wallet.
> Modul lain (Wallet, Transactions, Loan, Settings) dibahas dalam dokumen terpisah.
> Konfigurasi global (layout, navigasi, migrasi auth) dibahas dalam dokumen **Global Architecture**.

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Aplikasi adalah **Web App Mobile-First** dengan Next.js, diakses via browser mobile. |
| 2 | **Fase 1:** Tidak ada backend. Semua kalkulasi report dilakukan di **client-side** dengan membaca data dari `localStorage`. |
| 3 | Pengguna diidentifikasi anonim dengan UUID v4 di `localStorage['anon_id']` (sama dengan modul lain). |
| 4 | Format angka menggunakan locale **`id-ID`** (titik ribuan, koma desimal). |
| 5 | Mata uang default: **IDR**. |
| 6 | Module Report **tidak memiliki data primer** — sumber data adalah `localStorage['transactions']`, `localStorage['loan_entries']`, dan `localStorage['wallets']`. |
| 7 | **Custom Report** disimpan di `localStorage['custom_reports']` sebagai JSON array. Hanya berisi metadata (nama + range periode), bukan hasil kalkulasi (selalu di-compute on-the-fly). |
| 8 | **Realtime Report**: periode = bulan berjalan (tanggal 1 hingga akhir bulan ini). |
| 9 | **Monthly Report**: list otomatis ter-generate per bulan, mulai dari bulan terbaru ke belakang, terus mundur sepanjang ada data transaksi. |
| 10 | **Loan** di summary report dihitung sebagai **cash flow loan**: `SUM(Get) − SUM(Give)` pada periode tersebut, dari `loan_entries` aktif. |
| 11 | **Balance Correction** mencerminkan efek dari **edit initial balance wallet** yang terjadi pada periode tersebut. Initial balance = nilai `balance` saat wallet pertama dibuat (lihat Bagian 4 untuk perhitungan detail). |
| 12 | **Donut chart** di Realtime hanya menampilkan kategori **Expense** (bukan Income, bukan Transfer). |

---

## 1. UI Component Breakdown

### Screen 1 — Report (`/report`)

> Halaman utama Module Report. Berisi 3 tab yang menampilkan jenis report berbeda.

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru `#2196F3`. Teks "Report" rata tengah, warna putih. Ikon ⚙️ Settings di kanan → shortcut ke `/settings`. |
| **Tab Switcher** | Interaktif | Tiga pill button bersebelahan: **Realtime** · **Monthly** · **Custom**. Tab aktif: background biru, teks putih. Tab non-aktif: background putih, teks biru, border biru. |
| **Tab Content** | Dinamis | Konten berubah sesuai tab aktif. Lihat sub-screen di bawah. |
| **Bottom Navigation** | Shared · Statis | 5 tab. Tab **Report** dalam keadaan aktif/biru. *(Komponen shared, lihat Global Architecture.)* |

---

### Tab 1 — Realtime

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Period Label** | Dinamis | Teks rata tengah menampilkan range periode bulan berjalan, format: `01 May 2026 - 31 May 2026`. Otomatis update tiap bulan. |
| **Donut Chart (Expense by Category)** | Dinamis | Chart melingkar yang menggambarkan distribusi expense per kategori untuk periode bulan berjalan. Setiap segment punya warna berbeda. Label kategori muncul di luar chart. Hanya menampilkan transaksi tipe `expense` aktif. |
| **Empty State Donut** | Dinamis | Jika tidak ada expense di periode → tampilkan placeholder ilustrasi/teks *"Belum ada pengeluaran bulan ini"*. |
| **Category Legend List** | Dinamis | Daftar kategori expense di bawah chart. Setiap baris: badge persentase (warna senada dengan segment chart) + nama kategori + total nominal. Urut berdasarkan nominal DESC. |

---

### Tab 2 — Monthly

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Monthly Section** | Dinamis | Per bulan, ditampilkan satu blok dengan format konsisten (lihat di bawah). Section diurutkan dari bulan terbaru ke belakang. |
| **Section Header** | Statis | Teks rata tengah dengan format range: `01 May 2026 - 31 May 2026`. |
| **Summary Rows** | Dinamis | Daftar baris kunci-nilai untuk bulan tersebut: <br>• **Expenses** (hitam) <br>• **Income** (hijau, dengan prefix `+`) <br>• **Balance** (hitam jika positif, merah jika negatif, dengan prefix `+` atau `-`) <br>• **Loan** (hijau jika positif, hitam/merah jika negatif) — tampil hanya jika ada loan_entry aktif di bulan tersebut <br>• **Balance Correction** (hijau jika positif, merah jika negatif) — tampil hanya jika ada perubahan initial balance wallet di bulan tersebut |
| **Section Chevron** | Interaktif | Ikon `›` di kanan section. Tap pada section → navigasi ke screen detail breakdown per kategori (seperti tampilan Realtime, namun untuk bulan tersebut). |
| **Auto-load (Infinite Scroll)** | Dinamis | Saat user scroll ke bawah, sistem menambahkan section bulan-bulan sebelumnya yang masih punya data. Berhenti otomatis saat sudah mencapai bulan transaksi paling lama. |

---

### Tab 3 — Custom

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Custom Report Section** | Dinamis | Per custom report, ditampilkan satu blok serupa dengan Monthly, ditambah **nama** report (mis. "2026", "All Time", "2025") di bagian atas section. |
| **Section Header** | Dinamis | Dua baris rata tengah: <br>• Baris atas: **nama report** (bold) <br>• Baris bawah: range periode `01 Jan 2026 - 31 Dec 2026` |
| **Section Edit Action** | Interaktif | Ikon ✏️ di sudut kanan atas setiap section. Tap → membuka screen Edit Custom Report (rename, ubah range, atau delete). |
| **Section Chevron** | Interaktif | Ikon `›` di kanan section. Tap → navigasi ke screen detail breakdown per kategori untuk periode custom tersebut. |
| **Summary Rows** | Dinamis | Sama seperti tab Monthly: Expenses, Income, Balance, Loan, Balance Correction. |
| **FAB Button (`+`)** | Interaktif | Tombol mengambang biru `+` di pojok kanan bawah. Tap → navigasi ke screen Add Custom Report. |
| **Empty State** | Dinamis | Jika user belum punya custom report → tampilkan empty state dengan ajakan membuat report pertama. |

---

### Screen 2 — Add Custom Report (`/report/custom/add`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru. Tombol back `‹` di kiri. Judul "Add Report" rata tengah. |
| **Field: Report Name** | Interaktif | Input teks bebas. Placeholder *"Enter the report name"*. Border highlight biru saat fokus (tampak aktif di gambar). Wajib diisi. `autoFocus` saat halaman mount. |
| **Field: Start Date** | Interaktif | Field tanggal mulai dengan ikon kalender di kanan. Format display: `Jum, 01 Mei 2026`. Tap → membuka native date picker. Default: tanggal 1 bulan berjalan. |
| **Field: End Date** | Interaktif | Field tanggal akhir dengan ikon kalender di kanan. Format display sama. Tap → membuka native date picker. Default: tanggal hari ini. |
| **Save Button** | Interaktif | Posisi kanan bawah form. Warna biru, label "Save". Tiga kondisi: aktif / loading / disabled. |

---

### Screen 3 — Edit Custom Report (`/report/custom/[id]/edit`)

> Diakses dari ikon ✏️ di section custom report.

Struktur form **identik** dengan Add Custom Report, dengan tambahan:

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Field: Report Name** | Interaktif | Pre-filled dengan nama existing |
| **Field: Start/End Date** | Interaktif | Pre-filled dengan range existing |
| **Save Button** | Interaktif | Update record existing |
| **Delete Button** | Interaktif | Tombol hapus untuk menghapus custom report. Konfirmasi via dialog sebelum eksekusi. *Tidak terlihat di UI saat ini — diasumsikan ada di screen edit (perlu konfirmasi UI)* |

---

### Screen 4 — Report Detail (Drill-down per Periode)

> Diakses dari tap section di tab Monthly atau Custom.

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Tombol back `‹`. Judul = range periode (mis. "01 May 2026 - 31 May 2026") atau nama custom report. |
| **Donut Chart (Expense by Category)** | Dinamis | Sama persis dengan tab Realtime, tetapi data difilter sesuai periode terpilih. |
| **Category Legend List** | Dinamis | Sama dengan Realtime. Tap baris kategori → (opsional) drill-down lebih jauh ke list transaksi kategori tersebut. *Belum ada gambar UI — perlu konfirmasi* |

---

## 2. User Interactions & Flow

### Flow: Buka Tab Realtime

```
User tap tab "Report" di Bottom Nav
              ↓
   Default tab: "Realtime" aktif
              ↓
   Hitung periode bulan berjalan:
     start = 1 hari pertama bulan ini  (mis. 2026-05-01)
     end   = hari terakhir bulan ini   (mis. 2026-05-31)
              ↓
   Filter localStorage['transactions']:
     WHERE type = 'expense'
       AND is_active = true
       AND transaction_date BETWEEN start AND end
              ↓
   Group by category, hitung:
     SUM(amount) per category
     percentage = (categoryTotal / grandTotal) × 100
              ↓
   Render donut chart + legend list (urut DESC by total)
```

---

### Flow: Buka Tab Monthly

```
User tap tab "Monthly"
              ↓
   Tentukan bulan-bulan yang punya data transaksi:
     Ambil min(transaction_date) & max(transaction_date)
     dari semua transactions aktif
              ↓
   Generate list bulan dari max → min (DESC)
              ↓
   Untuk setiap bulan dalam viewport, hitung:
     1. Expenses    = SUM(amount) where type='expense' aktif di bulan itu
     2. Income      = SUM(amount) where type='income'  aktif di bulan itu
     3. Balance     = Income − Expenses
     4. Loan        = SUM(get.amount) − SUM(give.amount)
                      dari loan_entries aktif di bulan itu
                      (tampil hanya jika ada entry)
     5. Balance Correction = SUM(perubahan initial balance wallet)
                              di bulan itu
                              (tampil hanya jika ada perubahan)
              ↓
   Render section per bulan
              ↓
   Saat user scroll mendekati bawah → load section bulan berikutnya
   sampai habis (sudah mencapai bulan paling lama)
```

---

### Flow: Buka Tab Custom

```
User tap tab "Custom"
              ↓
   Baca localStorage['custom_reports']
              ↓
   Untuk setiap custom report, hitung summary 5 baris
   (Expenses, Income, Balance, Loan, Balance Correction)
   menggunakan filter date range dari report tersebut
              ↓
   Render list section, urut by created_at DESC
              ↓
   Jika list kosong → tampilkan empty state
   FAB '+' selalu tampil
```

---

### Flow: Add Custom Report

```
User tap FAB '+' di tab Custom
              ↓
   Navigasi ke /report/custom/add
              ↓
   User isi: Report Name + Start Date + End Date
              ↓
   Tap "Save"
              ↓
   [Validasi sisi client]
              ↓ LOLOS
   Buat record baru di localStorage['custom_reports']:
     id, anon_id, name, start_date, end_date,
     is_active: true, created_at, updated_at
              ↓
   Kembali ke tab Custom (auto-refresh)
   Section baru tampil di urutan paling atas
```

---

### Flow: Edit / Delete Custom Report

```
User di tab Custom tap ikon ✏️ pada section
              ↓
   Navigasi ke /report/custom/[id]/edit
              ↓
   Form pre-filled dengan data existing
              ↓
   ┌──── User ubah & tap "Save" ────────────┐
   │  Validasi → Update record:             │
   │    name, start_date, end_date          │
   │    updated_at = now                    │
   │  Kembali ke tab Custom                 │
   └────────────────────────────────────────┘

   ┌──── User tap "Delete" ─────────────────┐
   │  Tampilkan dialog konfirmasi           │
   │  "Hapus custom report '[nama]'?"       │
   │       ↓ Konfirmasi                     │
   │  Soft delete: is_active = false        │
   │  Kembali ke tab Custom                 │
   │  Section tidak muncul lagi             │
   └────────────────────────────────────────┘
```

---

### Flow: Drill-down ke Detail Periode

```
User tap chevron `›` di section Monthly atau Custom
              ↓
   Navigasi ke /report/detail?start={YYYY-MM-DD}&end={YYYY-MM-DD}
              ↓
   Hitung breakdown expense by category untuk periode terpilih
              ↓
   Render donut chart + legend list
   (UI sama persis dengan tab Realtime, hanya data berbeda)
              ↓
   Header: tampilkan range periode atau nama custom report
```

---

## 3. Validasi Client-Side

### Validasi Add / Edit Custom Report

| Field | Aturan | Pesan Error |
|-------|--------|-------------|
| Report Name | Wajib diisi | "Nama report tidak boleh kosong" |
| Report Name | 2–50 karakter (setelah trim) | "Nama minimal 2 karakter / maksimal 50 karakter" |
| Report Name | Tidak boleh duplikat (case-insensitive, kecuali diri sendiri saat edit) | "Nama report sudah digunakan" |
| Start Date | Wajib diisi | "Tanggal mulai harus dipilih" |
| End Date | Wajib diisi | "Tanggal akhir harus dipilih" |
| Start ≤ End | End Date tidak boleh lebih awal dari Start Date | "Tanggal akhir harus setelah tanggal mulai" |
| Range Maksimum | Range tidak boleh lebih dari 10 tahun (untuk performa) | "Range maksimal 10 tahun" |

---

## 4. Logika Perhitungan Report

> Bagian ini mendokumentasikan formula yang digunakan di seluruh tab Report. Semua kalkulasi dilakukan **on-the-fly** dari data sumber (transactions, loan_entries, wallets) — tidak di-cache di localStorage.

---

### 4.1 Expenses

```
Expenses(periode) =
    SUM(transaction.amount)
    WHERE transaction.type = 'expense'
      AND transaction.is_active = true
      AND transaction.transaction_date BETWEEN periode.start AND periode.end
```

---

### 4.2 Income

```
Income(periode) =
    SUM(transaction.amount)
    WHERE transaction.type = 'income'
      AND transaction.is_active = true
      AND transaction.transaction_date BETWEEN periode.start AND periode.end
```

---

### 4.3 Balance

```
Balance(periode) = Income(periode) − Expenses(periode)
```

| Hasil | Tampilan |
|-------|----------|
| Positif | Warna hitam, prefix `+` (mis. `+ 1.500.000,00`) |
| Nol | `0,00` |
| Negatif | Warna merah, prefix `-` (mis. `- 17.000,00`) |

**Catatan:** `Transfer` tidak ikut dihitung di Income/Expenses/Balance — sama seperti aturan di Module Transactions Summary.

---

### 4.4 Loan (Cash Flow Loan)

```
Loan(periode) =
    SUM(amount where type='get'  AND is_active=true) −
    SUM(amount where type='give' AND is_active=true)
    FROM loan_entries
    WHERE transaction_date BETWEEN periode.start AND periode.end
```

| Hasil | Arti | Tampilan |
|-------|------|----------|
| Positif | User menerima lebih banyak Get daripada Give pada periode → cash flow loan positif | Hijau, prefix `+` |
| Negatif | User memberi lebih banyak Give daripada Get → cash flow loan negatif | Hitam/merah, prefix `-` |
| Nol | Loan tidak ditampilkan di summary | — |

**Catatan:** Hanya tampil jika ada loan_entry aktif di periode tersebut.

---

### 4.5 Balance Correction

> **Konsep:** Saat user mengubah `initial balance` wallet (mis. mengoreksi saldo awal yang salah ketik), perubahan tersebut tidak terekam sebagai transaksi (income/expense). Untuk menjaga konsistensi total saldo wallet user dengan agregat report, perubahan initial balance ditampilkan sebagai **Balance Correction** pada bulan kejadiannya.

**Definisi formal:**
Setiap kali user **mengedit** field `balance` di sebuah wallet (bukan saat wallet pertama dibuat), simpan **history perubahan** dengan field:
- `wallet_id`
- `previous_balance`
- `new_balance`
- `delta = new_balance − previous_balance`
- `corrected_at` (timestamp perubahan)

**Formula:**
```
Balance Correction(periode) =
    SUM(delta)
    FROM wallet_balance_history
    WHERE corrected_at BETWEEN periode.start AND periode.end
      AND is_active = true
```

| Hasil | Arti | Tampilan |
|-------|------|----------|
| Positif | User menambah saldo wallet (koreksi naik) | Hijau, prefix `+` |
| Negatif | User mengurangi saldo wallet (koreksi turun) | Merah, prefix `-` |
| Nol | Tidak ditampilkan di summary | — |

**Implikasi data model:**
Diperlukan **key tambahan** di localStorage: `wallet_balance_history` untuk merekam riwayat perubahan initial balance. Lihat Bagian 5 untuk skema.

---

### 4.6 Donut Chart Data (Expense by Category)

```
Untuk setiap kategori unik di transactions tipe 'expense' aktif pada periode:

  categoryTotal[category] = SUM(amount where category=X)
  grandTotal              = SUM(categoryTotal[*])

  Untuk setiap kategori:
    percentage = (categoryTotal / grandTotal) × 100
    nominal    = categoryTotal

Sort DESC by categoryTotal
```

**Catatan tampilan:**
- Maksimum 8 kategori ditampilkan secara individual.
- Jika kategori > 8, sisanya digabungkan menjadi *"Lainnya"* (asumsi — perlu konfirmasi).
- Warna segment di-generate konsisten per kategori (mis. hash dari nama kategori untuk warna deterministik).

---

## 5. Data Modeling (localStorage Schema)

> Module Report **tidak memiliki tabel data utama**. Hanya satu key tambahan yang murni dimiliki Module Report: `custom_reports`. Plus satu key auxiliary: `wallet_balance_history` (terkait Balance Correction).

---

### Key: `custom_reports`

**Contoh isi data:**

```json
[
  {
    "id": "rpt-a1b2c3d4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "2026",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "is_active": true,
    "created_at": "2026-01-15T10:00:00.000Z",
    "updated_at": "2026-01-15T10:00:00.000Z"
  },
  {
    "id": "rpt-e5f6g7h8-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "All Time",
    "start_date": "2025-06-01",
    "end_date": "2026-03-24",
    "is_active": true,
    "created_at": "2025-06-01T08:00:00.000Z",
    "updated_at": "2026-03-24T11:00:00.000Z"
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas custom report |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan |
| `name` | String | Wajib, 2–50 karakter, unik per `anon_id` (case-insensitive) | Nama report (mis. "2026", "Q1 2026") |
| `start_date` | String (`YYYY-MM-DD`) | Wajib | Tanggal mulai periode |
| `end_date` | String (`YYYY-MM-DD`) | Wajib, ≥ `start_date` | Tanggal akhir periode |
| `is_active` | Boolean | Default: `true` | Soft delete flag |
| `created_at` | String (ISO 8601) | Wajib | |
| `updated_at` | String (ISO 8601) | Wajib | |

---

### Key: `wallet_balance_history` *(terkait Module Wallet)*

> Key ini diperlukan untuk perhitungan **Balance Correction** di Report.
> Diisi setiap kali user mengedit `balance` wallet (bukan saat wallet pertama dibuat).
> **Akan didokumentasikan lebih lengkap di revisi Module Wallet** — sini hanya dicantumkan sebagai dependency.

**Contoh isi data:**

```json
[
  {
    "id": "wbh-x1y2z3w4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "wallet_id": "b3d9e1a2-cc4f-...",
    "previous_balance": 800000.00,
    "new_balance": 823110.46,
    "delta": 23110.46,
    "corrected_at": "2026-04-15T10:30:00.000Z",
    "is_active": true
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas record history |
| `anon_id` | String (UUID v4) | Wajib | |
| `wallet_id` | String (UUID v4) | Wajib | FK ke `wallets.id` |
| `previous_balance` | Number | Wajib | Nilai balance sebelum diedit |
| `new_balance` | Number | Wajib | Nilai balance setelah diedit |
| `delta` | Number | Wajib | `new_balance − previous_balance` |
| `corrected_at` | String (ISO 8601) | Wajib | Waktu perubahan dilakukan |
| `is_active` | Boolean | Default: `true` | Soft delete flag (jika perubahan di-undo) |

---

### Data yang Dibaca dari Modul Lain

Module Report **membaca-saja** data berikut dari modul lain:

| Sumber | Key di localStorage | Filter Utama | Digunakan Untuk |
|--------|--------------------|--------------|-----------------|
| Module Transactions | `transactions` | `is_active=true`, filter by `transaction_date` & `type` | Income, Expenses, Balance, Donut Chart |
| Module Loan | `loan_entries` | `is_active=true`, filter by `transaction_date` & `type` | Loan (cash flow) |
| Module Wallet | `wallet_balance_history` | `is_active=true`, filter by `corrected_at` | Balance Correction |

Module Report **tidak boleh menulis** ke key milik modul lain.

---

## 6. Frontend State Management

### Screen: Report (utama)

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `activeTab` | `'realtime' / 'monthly' / 'custom'` | `'realtime'` | Tab aktif saat ini |
| `isLoading` | Boolean | `true` | Tampilkan skeleton saat true |

---

### Tab: Realtime

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `period.start` | String (ISO date) | Tanggal 1 bulan ini | |
| `period.end` | String (ISO date) | Tanggal akhir bulan ini | |
| `categoryBreakdown` | Array of `{category, total, percentage, color}` | `[]` | Data untuk chart + legend |
| `grandTotalExpense` | Number | `0` | Total expense periode |

---

### Tab: Monthly

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `monthlyReports` | Array of `MonthlyReportView` | `[]` | List per bulan, di-load progresif |
| `oldestMonth` | String (ISO date) | Detected dari data | Bulan terlama yang punya transaksi |
| `displayedUntil` | String (ISO date) | Bulan ini | Bulan terakhir yang sudah di-render (untuk infinite scroll) |
| `isLoadingMore` | Boolean | `false` | Loader di bawah saat fetch bulan tambahan |

`MonthlyReportView` shape:
```
{
  start_date, end_date,
  expenses, income, balance,
  loan (optional),
  balance_correction (optional)
}
```

---

### Tab: Custom

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `customReports` | Array of `CustomReportView` | `[]` | Custom reports + summary tiap report |
| `isLoading` | Boolean | `true` | |

`CustomReportView` shape: gabungan `CustomReport` + `MonthlyReportView`-style summary.

---

### Screen: Add / Edit Custom Report

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `form.name` | String | `""` (atau pre-filled saat edit) | Nama report |
| `form.start_date` | String (ISO date) | Tanggal 1 bulan ini | Default Add. Pre-filled saat Edit |
| `form.end_date` | String (ISO date) | Hari ini | Default Add. Pre-filled saat Edit |
| `errors` | Object | `{}` | Map error per field |
| `isSubmitting` | Boolean | `false` | Loading state Save |
| `isDeleteDialogOpen` | Boolean | `false` | Dialog konfirmasi hapus (hanya di Edit) |

---

## 7. Struktur Halaman — Module Report

| Route | Nama Screen | Keterangan |
|-------|-------------|-----------|
| `/report` | Report (utama) | Halaman utama dengan 3 tab. Default tab: Realtime |
| `/report/custom/add` | Add Custom Report | Form tambah custom report baru |
| `/report/custom/[id]/edit` | Edit Custom Report | Form edit + delete custom report |
| `/report/detail?start=...&end=...` | Report Detail per Periode | Drill-down dari Monthly/Custom: donut chart per kategori untuk periode terpilih |

---

## 8. Catatan untuk Tim Developer

| Aspek | Catatan |
|-------|---------|
| **Read-Only Module** | Module Report **tidak menulis** data transaksi/loan/wallet. Hanya membaca dari modul-modul tersebut + menulis ke `custom_reports`-nya sendiri. |
| **Computed On-The-Fly** | Semua summary (Expenses, Income, Balance, Loan, Balance Correction) dihitung **on-the-fly** saat report dibuka — tidak di-cache di localStorage. Mencegah desync data jika ada edit/delete transaksi di belakang layar. |
| **Performa Monthly** | Untuk user dengan riwayat panjang, render semua bulan sekaligus bisa lambat. Implementasikan **infinite scroll**: load 6 bulan pertama, lalu load tambahan 6 bulan saat user mendekati bawah list. |
| **Performa Custom** | Saat user banyak punya custom report dengan range besar, tiap section membutuhkan iterasi seluruh transaksi. Pertimbangkan **memoization** hasil kalkulasi per range agar tidak dihitung ulang setiap re-render. |
| **Balance Correction Dependency** | Fitur Balance Correction membutuhkan **`wallet_balance_history`** — key baru yang harus ditulis oleh Module Wallet setiap kali user edit balance wallet. **Module Wallet perlu di-update** untuk mendukung ini. Tanpa key ini, baris Balance Correction tidak akan pernah muncul di Report. |
| **Transfer Tidak Dihitung** | Konsisten dengan Module Transactions: tipe `transfer` tidak ikut dalam Income, Expenses, atau Balance. Transfer adalah pemindahan dana internal user, bukan arus keluar/masuk. |
| **Loan vs Income/Expense** | Loan **terpisah** dari Income/Expense. Walaupun Get terlihat seperti income dan Give seperti expense, mereka tidak masuk perhitungan Income/Expense — hanya muncul di baris Loan tersendiri. Ini agar laporan rutin (gaji, belanja) tidak bercampur dengan utang-piutang. |
| **Empty Section** | Jika sebuah bulan tidak punya transaksi & loan & balance correction sama sekali → bulan itu **tidak perlu di-render** di tab Monthly. |
| **Format Tanggal** | Header section: format **English** (`01 May 2026 - 31 May 2026`). Form Add/Edit: format **Indonesia** (`Jum, 01 Mei 2026`). Inkonsistensi ini ada di seluruh aplikasi — perlu disepakati standar di Global Architecture. |
| **Soft Delete Custom Report** | Custom report yang dihapus di-flag `is_active=false`. Tidak menghapus permanen agar konsisten dengan pola modul lain dan memudahkan migrasi Fase 2. |
| **Donut Chart Library** | Untuk implementasi visual donut chart, gunakan library yang sudah teruji di mobile-web (mis. Recharts, ApexCharts, atau Chart.js dengan plugin). Pastikan responsif di lebar 375px. |
| **Warna Kategori** | Warna donut chart per kategori sebaiknya **deterministik** (mis. hash dari string kategori) agar konsisten antar render dan antar periode. |
| **Migrasi Fase 2** | Saat migrasi, hanya `custom_reports` & `wallet_balance_history` yang perlu dipindahkan dari localStorage ke backend. Data utama (transactions, loan_entries, wallets) sudah ditangani migrasi modul masing-masing. |

---

## 9. Asumsi — ✅ RESOLVED (2026-05-01)

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Monthly infinite scroll | ✅ Load 6 bulan pertama, tambah 6 saat scroll |
| 2 | Donut chart max kategori | ✅ **Limit 8 + "Lainnya"** |
| 3 | Tap kategori di legend | ✅ **Implementasi drill-down** — list transaksi per kategori |
| 4 | Edit Custom Report + tombol Delete | ✅ Tombol Delete merah di bawah form, confirmation dialog |
| 5 | Ikon ⚙️ di header Report | ✅ Shortcut ke Settings (out of scope Fase 1, ikon tetap ada tapi disabled/hidden) |
| 6 | Custom Report nama unik per anon_id | ✅ Case-insensitive unique |
| 7 | Balance Correction dari edit balance wallet | ✅ Dari `wallet_balance_history`, key sudah didefinisikan di Module Wallet v4.0 |
| 8 | Periode Realtime | ✅ **Bulan penuh** (1 - akhir bulan). Data natural hanya sampai hari ini |
| 9 | Range max custom report | ✅ **10 tahun** |

---

*— End of Technical Specification: Module Report (v1.0) —*
*Dokumen terkait: Module Wallet · Module Transactions · Module Loan · Global Architecture · Module Settings*
