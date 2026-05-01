# Technical Specification Document
## Module: Wallet

**Aplikasi:** Personal Finance Manager
**Versi Dokumen:** 1.0
**Tanggal:** 2026-05-01
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

> **Catatan Scope:**
> Dokumen ini hanya mencakup **Module Wallet** yang terdiri dari dua screen utama:
> Screen 1 — Wallet List, dan Screen 2 — Add Wallet.
> Modul lain (Transactions, Report, Loan, Settings) dibahas dalam dokumen terpisah.
> Konfigurasi global (layout, navigasi, migrasi auth) dibahas dalam dokumen **Global Architecture**.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| 3.0 | 2026-05-01 | Versi awal: Wallet List & Add Wallet, struktur localStorage, pola migration-ready |
| **4.0** | **2026-05-01** | **Penambahan key `wallet_balance_history` untuk merekam perubahan balance wallet (mendukung fitur Balance Correction di Module Report). Dokumentasi flow Edit Wallet diperjelas: perbedaan antara perubahan via transaksi (otomatis) vs perubahan manual via edit form (memicu pencatatan history).** |

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Aplikasi adalah **Web App Mobile-First** — dibangun dengan Next.js, diakses via browser mobile. Bukan native app. |
| 2 | **Fase 1 (saat ini):** Tidak ada backend, tidak ada autentikasi. Semua data disimpan di **`localStorage`** browser pengguna. |
| 3 | **Fase 2 (masa depan):** Backend + sistem autentikasi akan ditambahkan. Data dari Fase 1 dapat **di-claim dan dimigrasi** ke akun user. |
| 4 | Pengguna diidentifikasi secara anonim menggunakan **UUID v4** yang di-generate saat pertama kali membuka aplikasi, disimpan di `localStorage` dengan key `anon_id`. UUID ini tidak pernah berubah selama Fase 1 dan menjadi **kunci migrasi** ke Fase 2. |
| 5 | Format angka menggunakan **locale Indonesia (`id-ID`)** — titik sebagai pemisah ribuan, koma sebagai pemisah desimal. Contoh: `50.427.272,74`. |
| 6 | Mata uang default: **IDR (Rupiah)**. |
| 7 | Data wallet disimpan di `localStorage` dengan key `wallets` sebagai array JSON. |
| 8 | **Total Balance** adalah hasil penjumlahan field `balance` dari seluruh wallet yang berstatus aktif (`is_active: true`), dihitung di sisi client. |
| 9 | Dari UI form **Add Wallet** hanya terlihat 2 field input (name + balance). Field `wallet_type` belum tampil di gambar — diasumsikan menggunakan nilai default `other` untuk saat ini, dan akan dibahas lebih lanjut saat gambar lengkap tersedia. |
| 10 | **(BARU di v4.0)** Setiap kali nilai `balance` wallet berubah karena **edit manual oleh user** (bukan karena transaksi/loan), perubahan tersebut wajib dicatat di key terpisah `wallet_balance_history`. Catatan ini digunakan oleh Module Report untuk menghitung **Balance Correction**. |
| 11 | **(BARU di v4.0)** Perubahan balance yang **diakibatkan oleh transaksi** (income/expense/transfer dari Module Transactions, atau give/get dari Module Loan) **TIDAK** masuk ke `wallet_balance_history`. Hanya perubahan manual yang dicatat di sana. |

---

## 1. UI Component Breakdown

### Screen 1 — Wallet List (`/wallet`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Bar navigasi atas. Background biru `#2196F3`. Teks "Wallet" rata tengah, warna putih, tebal. Tidak ada tombol back (ini adalah root screen dari tab Wallet). Tinggi `56px`. Mempertimbangkan safe area iOS (notch). |
| **Total Balance Row** | Dinamis | Baris paling atas konten. Label "Total Balance" di kiri (tebal) dan nilai agregat saldo di kanan. Nilai dihitung otomatis dari seluruh wallet aktif. Tampil dengan format locale `id-ID`. Dipisahkan oleh garis bawah tipis dari list di bawahnya. |
| **Wallet List** | Dinamis | Daftar scrollable seluruh wallet milik user. Setiap baris menampilkan: nama wallet (kiri, tebal) + nilai saldo terformat (kanan) + ikon chevron `›` sebagai penanda bisa di-tap. Antar item dipisahkan divider tipis. Urutan tampil berdasarkan field `sort_order`. Tap baris → navigasi ke Wallet Detail/Edit. |
| **FAB Button (`+`)** | Interaktif | Tombol mengambang di pojok kanan bawah layar, posisi di atas bottom navigation. Bentuk lingkaran, warna biru `#2196F3`, ikon `+` putih. Tap → navigasi ke screen Add Wallet. |
| **Bottom Navigation** | Shared · Statis | Bar navigasi bawah dengan 5 tab: Transactions · **Wallet** (aktif, biru) · Report · Loan · Settings. *(Komponen shared, lihat Global Architecture.)* |

**Daftar Wallet yang Teridentifikasi dari UI:**

| Nama Wallet | Saldo Terlihat | Asumsi `wallet_type` |
|-------------|---------------|----------------------|
| Ajaib (Investasi) | 998.116,00 | `investment` |
| BCA | 823.110,46 | `bank` |
| Dana | 0,00 | `e_wallet` |
| Emas Digital | 9.735,00 | `digital_asset` |
| Gopay | 0,00 | `e_wallet` |
| Jago | 970.096,00 | `bank_digital` |
| Jago (Dana Darurat) | 3.500.000,00 | `savings` |
| Jago (Tabungan) | 0,00 | `savings` |
| Link Aja | 0,00 | `e_wallet` |
| OVO | 0,47 | `e_wallet` |
| **Total Balance** | **50.427.272,74** | *(agregat semua wallet)* |

---

### Screen 2 — Add Wallet (`/wallet/add`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Bar navigasi atas. Background biru `#2196F3`, teks "Add Wallet" rata tengah, warna putih. Terdapat tombol back `‹` di sisi kiri — fungsi: kembali ke Wallet List tanpa menyimpan data. |
| **Field: Wallet Name** | Interaktif | Input teks bebas. Placeholder: *"Enter the name"*. Terlihat dalam kondisi aktif/fokus (border biru) saat gambar diambil. Fokus otomatis saat halaman dibuka. Batas maksimal 50 karakter. |
| **Field: Balance** | Interaktif | Input angka. Placeholder: *"Enter the balance"*. Terdapat ikon kalkulator di sisi kanan sebagai elemen dekoratif (tidak interaktif). Saat difokus, memunculkan keyboard numerik di perangkat mobile. |
| **Button: Save** | Interaktif | Tombol aksi utama di sisi kanan bawah form. Warna biru `#2196F3`, label "Save" putih, sudut membulat. Memiliki tiga kondisi: **aktif** (default), **loading** (saat proses simpan), dan **nonaktif/disabled** (saat form belum terisi). |

---

### Screen 3 — Wallet Detail / Edit (`/wallet/[id]`) — **Belum Ada UI**

> Screen ini diasumsikan ada karena tap pada baris wallet di list memicu navigasi ke detail. **Belum ada gambar UI yang diberikan**. Asumsi struktur: form serupa dengan Add Wallet, pre-filled dengan data existing, ditambah tombol **Save Changes** dan **Delete**.

**Asumsi alur edit balance:** Saat user mengubah field `balance` di screen ini, sistem mendeteksi perubahan dan **mencatat ke `wallet_balance_history`** (lihat Bagian 4 — Logika Pencatatan).

---

## 2. User Interactions & Validations

### Flow: Inisialisasi Aplikasi (App Bootstrap)

```
Pengguna membuka aplikasi untuk pertama kali
                    ↓
       Cek: apakah localStorage['anon_id'] ada?
          ↓ YA                    ↓ TIDAK
   Gunakan ID yang ada      Generate UUID v4 baru
                            Simpan ke localStorage['anon_id']
                    ↓
       Cek: apakah localStorage['wallets'] ada?
          ↓ YA                    ↓ TIDAK
   Muat data wallet          Inisialisasi list kosong []
                    ↓
       Hitung Total Balance (jumlahkan semua balance aktif)
                    ↓
              Tampilkan Wallet List
```

---

### Flow: Wallet List Screen

```
[Wallet List Screen]
        │
        ├─── Tap FAB ( + )
        │         └──→ Navigasi ke /wallet/add
        │
        ├─── Tap baris wallet (salah satu item)
        │         └──→ Navigasi ke /wallet/[id]
        │              (membawa wallet_id sebagai parameter)
        │
        └─── Pull-to-refresh (tarik layar ke bawah)
                  └──→ Baca ulang localStorage['wallets']
                       Hitung ulang Total Balance
                       Render ulang list
```

---

### Flow: Add Wallet Screen

```
Pengguna mengisi "Name" → mengisi "Balance" → Tap "Save"
                              ↓
                   [Validasi sisi client]
                ↓ GAGAL              ↓ LOLOS
        Tampilkan pesan        Tombol "Save" berubah
        error di bawah         ke kondisi loading
        field yang salah              ↓
                           Buat objek wallet baru:
                           - id baru (UUID v4)
                           - anon_id dari localStorage
                           - name, balance, wallet_type
                           - is_active: true
                           - created_at & updated_at (timestamp saat ini)
                           - sort_order (urutan terakhir + 1)
                              ↓
                   Tambahkan ke array wallets
                   Simpan kembali ke localStorage['wallets']
                              ↓
                   ⚠️ TIDAK menulis ke wallet_balance_history.
                      Initial balance saat wallet pertama dibuat
                      bukan termasuk "koreksi" — hanya perubahan
                      sesudahnya yang dianggap koreksi.
                              ↓
                   Kembali ke Wallet List (/wallet)
                   Total Balance otomatis ter-update
```

---

### Flow: Edit Wallet Screen — **(BARU di v4.0)**

```
Pengguna tap salah satu baris wallet di list
                              ↓
              Navigasi ke /wallet/[id]
                              ↓
              Form pre-filled dengan data existing
              Simpan nilai balance lama: previous_balance
                              ↓
              User mengubah field (name, balance, atau wallet_type)
              → Tap "Save Changes"
                              ↓
                   [Validasi sisi client]
                              ↓ LOLOS
              ┌─────────────────────────────────────────────┐
              │ Cek: apakah balance berubah?                │
              │   (form.balance != wallet.balance)          │
              ├─────────────────────────────────────────────┤
              │ ↓ YA, BERUBAH                               │
              │   Buat record baru di wallet_balance_history│
              │   - wallet_id                               │
              │   - previous_balance: nilai lama            │
              │   - new_balance: nilai baru                 │
              │   - delta: new − previous                   │
              │   - corrected_at: timestamp saat ini        │
              │   - is_active: true                         │
              │   Simpan ke localStorage['wallet_balance_   │
              │     history']                               │
              │                                             │
              │ ↓ TIDAK BERUBAH                             │
              │   (skip pencatatan history)                 │
              └─────────────────────────────────────────────┘
                              ↓
              Update wallet di localStorage['wallets']:
              - name, balance, wallet_type
              - updated_at = now
                              ↓
              Kembali ke Wallet List
              Total Balance otomatis ter-update
```

> **Catatan penting:** Pencatatan ke `wallet_balance_history` **HANYA** terjadi saat user secara manual mengedit field `balance` di screen ini. Perubahan balance akibat operasi normal (transaksi income/expense/transfer, give/get loan) **TIDAK** boleh ditulis ke history ini.

---

### Flow: Hapus Wallet — **(BARU di v4.0)**

```
Pengguna tap tombol "Delete" di Wallet Detail
                              ↓
              Tampilkan dialog konfirmasi
                              ↓ Konfirmasi
              Soft delete: wallet.is_active = false
              wallet.updated_at = now
                              ↓
              ⚠️ TIDAK menulis ke wallet_balance_history.
                 Penghapusan wallet bukan koreksi balance —
                 ini adalah penghapusan akun wallet itu sendiri.
                              ↓
              Kembali ke Wallet List
              Wallet tidak muncul lagi di list
```

---

### Validasi Client-Side

| Field | Aturan Validasi | Pesan Error |
|-------|----------------|-------------|
| Wallet Name | Wajib diisi | "Nama wallet tidak boleh kosong" |
| Wallet Name | Minimal 2 karakter | "Nama minimal 2 karakter" |
| Wallet Name | Maksimal 50 karakter | "Nama maksimal 50 karakter" |
| Wallet Name | Tidak boleh duplikat (case-insensitive, hanya `is_active=true`) | "Nama wallet sudah digunakan" |
| Balance | Wajib diisi | "Saldo tidak boleh kosong" |
| Balance | Harus berupa angka dan bernilai ≥ 0 | "Saldo harus berupa angka positif" |
| Balance | Nilai maksimum `999.999.999.999,99` | "Saldo melebihi batas maksimum" |

---

## 3. Data Modeling (localStorage Schema)

> Module Wallet menggunakan **2 key** di localStorage:
> 1. `wallets` — daftar wallet milik user (sudah ada sejak v3.0)
> 2. `wallet_balance_history` — riwayat perubahan balance manual ⭐ **BARU di v4.0**

> Struktur data dirancang **identik dengan skema database Fase 2** agar saat migrasi ke backend, bentuk data tidak berubah.

---

### Key: `anon_id`

| Properti | Detail |
|----------|--------|
| Tipe data | String (UUID v4) |
| Contoh nilai | `"f47ac10b-58cc-4372-a567-0e02b2c3d479"` |
| Kapan dibuat | Sekali saja, saat pengguna pertama kali membuka aplikasi |
| Dapat diubah? | Tidak. Bersifat permanen selama Fase 1 |
| Fungsi di Fase 2 | Menjadi kunci untuk meng-claim dan memindahkan data ke akun user yang baru dibuat |

---

### Key: `wallets`

**Contoh isi data:**

```json
[
  {
    "id": "b3d9e1a2-cc4f-4b6a-9a1e-1234567890ab",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "BCA",
    "balance": 823110.46,
    "wallet_type": "bank",
    "currency": "IDR",
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-01-15T10:00:00.000Z",
    "updated_at": "2026-04-20T08:30:00.000Z"
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas unik wallet |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan. Kunci migrasi Fase 2 |
| `name` | String | Wajib, 2–50 karakter, unik per `anon_id` | Nama wallet |
| `balance` | Number (desimal) | Wajib, ≥ 0 | Saldo wallet **saat ini** (current value, bukan initial) |
| `wallet_type` | String (Enum) | Wajib | Lihat tabel Enum `wallet_type` |
| `currency` | String | Default: `IDR` | ISO 4217 |
| `is_active` | Boolean | Default: `true` | Soft delete flag |
| `sort_order` | Number (integer) | Default: jumlah wallet + 1 | Urutan tampil |
| `created_at` | String (ISO 8601) | Wajib | Timestamp wallet dibuat |
| `updated_at` | String (ISO 8601) | Wajib | Timestamp terakhir wallet diperbarui |

> **Catatan:** Field `balance` adalah **nilai saat ini** (running balance), yang otomatis berubah saat ada transaksi/loan yang menggunakan wallet ini. **Bukan** initial balance.

---

### Key: `wallet_balance_history` ⭐ **BARU di v4.0**

> Mencatat **riwayat perubahan balance manual** yang dilakukan user via Edit Wallet form.
> Dibutuhkan oleh Module Report untuk menghitung **Balance Correction** per periode.

**Contoh isi data:**

```json
[
  {
    "id": "wbh-x1y2z3w4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "wallet_id": "b3d9e1a2-cc4f-4b6a-9a1e-1234567890ab",
    "previous_balance": 800000.00,
    "new_balance": 823110.46,
    "delta": 23110.46,
    "corrected_at": "2026-04-15T10:30:00.000Z",
    "is_active": true
  },
  {
    "id": "wbh-y2z3w4x5-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "wallet_id": "c4e0f2b3-dd5a-...",
    "previous_balance": 5000000.00,
    "new_balance": 4500000.00,
    "delta": -500000.00,
    "corrected_at": "2026-03-10T14:20:00.000Z",
    "is_active": true
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas unik record history |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan |
| `wallet_id` | String (UUID v4) | Wajib | FK ke `wallets.id` — wallet yang diubah |
| `previous_balance` | Number (desimal) | Wajib | Nilai balance **sebelum** diubah |
| `new_balance` | Number (desimal) | Wajib | Nilai balance **setelah** diubah |
| `delta` | Number (desimal) | Wajib | Selisih: `new_balance − previous_balance`. Bisa positif atau negatif |
| `corrected_at` | String (ISO 8601) | Wajib | Timestamp saat perubahan dilakukan. Field ini yang digunakan Module Report untuk filter periode |
| `is_active` | Boolean | Default: `true` | Soft delete flag (jika perubahan di-undo) |

**Aturan Pencatatan:**

✅ **Wajib dicatat:** Saat user mengedit field `balance` secara manual via screen Edit Wallet (`/wallet/[id]`).

❌ **TIDAK boleh dicatat** ketika balance berubah karena:
1. Wallet baru dibuat (initial balance dari Add Wallet form)
2. Transaksi income/expense/transfer dari Module Transactions
3. Operasi give/get dari Module Loan
4. Wallet di-soft-delete

> **Alasan:** Hanya perubahan manual yang merepresentasikan **koreksi** terhadap saldo — perubahan akibat transaksi sudah punya jejaknya sendiri di `transactions` atau `loan_entries`.

---

### Enum: `wallet_type`

| Nilai | Label Tampil di UI | Contoh Wallet |
|-------|--------------------|---------------|
| `bank` | Bank | BCA, Mandiri, BNI, BRI |
| `bank_digital` | Bank Digital | Jago, Blu, SeaBank, Allo Bank |
| `e_wallet` | E-Wallet | Gopay, OVO, Dana, LinkAja |
| `investment` | Investasi | Ajaib, Bibit, Bareksa |
| `savings` | Tabungan Khusus | Dana Darurat, Tabungan Goals |
| `digital_asset` | Aset Digital | Emas Digital, Kripto |
| `other` | Lainnya | Default |

---

## 4. Logika Pencatatan Balance — **(BARU di v4.0)**

> Bagian ini menjelaskan **kapan** dan **bagaimana** balance wallet berubah, serta kapan perubahan tersebut wajib dicatat ke `wallet_balance_history`.

---

### 4.1 Sumber Perubahan Balance Wallet

Field `balance` di sebuah wallet dapat berubah karena 4 alasan:

| # | Sumber Perubahan | Modul Pemicu | Catat ke history? |
|---|-----------------|-------------|-------------------|
| 1 | **Wallet baru dibuat** (initial balance) | Wallet (Add) | ❌ **Tidak** |
| 2 | **Transaksi income/expense/transfer** | Transactions | ❌ **Tidak** |
| 3 | **Operasi loan give/get** (jika user pilih wallet) | Loan | ❌ **Tidak** |
| 4 | **Edit manual** field balance via Edit Wallet | Wallet (Edit) | ✅ **Ya** |

---

### 4.2 Mengapa Hanya Edit Manual yang Dicatat?

- Perubahan dari **transaksi** sudah punya jejak audit-nya sendiri di `transactions` (Module Transactions). Mengulang pencatatannya di history akan menghasilkan double-counting.
- Perubahan dari **loan** sudah tercatat di `loan_entries`. Sama, double-counting akan terjadi.
- **Initial balance** saat wallet pertama dibuat bukan "koreksi" — itu adalah nilai awal yang valid, bukan kesalahan yang dikoreksi.
- **Edit manual** = user menyadari saldo tidak sesuai realita (mis. lupa catat transaksi, atau ada perbedaan dengan saldo asli di bank). Ini **murni koreksi** yang tidak ada jejaknya di tempat lain — sehingga harus dicatat agar Module Report bisa menampilkannya sebagai "Balance Correction".

---

### 4.3 Konsumen Data: Module Report

Module Report (Tab Monthly & Custom) menggunakan `wallet_balance_history` untuk menghitung baris **Balance Correction** dengan formula:

```
Balance Correction(periode) =
    SUM(delta)
    FROM wallet_balance_history
    WHERE corrected_at BETWEEN periode.start AND periode.end
      AND is_active = true
```

Hasil:
- Positif → user **menambah** saldo (koreksi naik), tampil hijau dengan prefix `+`
- Negatif → user **mengurangi** saldo (koreksi turun), tampil merah dengan prefix `-`
- Nol → baris Balance Correction tidak ditampilkan di summary

---

### 4.4 Skenario Edge Case

| Skenario | Perilaku |
|----------|---------|
| User edit balance lalu ubah lagi ke nilai lama (undo) | **Dua record** di history: satu delta positif, satu delta negatif. Total efek di Report = nol (saling kanselir). |
| User edit field name saja (tanpa ubah balance) | **Tidak** dicatat di history. Hanya `wallets.updated_at` yang berubah. |
| User edit balance dari `100.000` ke `100.000` (sama) | **Tidak** dicatat (delta = 0, perubahan tidak terdeteksi). |
| User soft-delete wallet | **Tidak** dicatat. Soft delete bukan koreksi balance. |
| Wallet di-restore (dari is_active=false ke true) | *Belum didefinisikan — perlu konfirmasi UI dan bisnis logic.* |

---

## 5. Frontend State Management

### Screen: Wallet List

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `wallets` | Array of Wallet | `[]` | Daftar wallet aktif yang ditampilkan |
| `totalBalance` | Number | `0` | Agregat saldo semua wallet aktif |
| `isLoading` | Boolean | `true` | Tampilkan skeleton saat true |

**Kondisi tampilan berdasarkan state:**

| Kondisi | Tampilan |
|---------|---------|
| `isLoading: true` | Skeleton loader |
| `isLoading: false` + `wallets` kosong | Empty state: ilustrasi + ajakan tambah wallet pertama |
| `isLoading: false` + `wallets` berisi | List wallet + total balance tampil normal |

---

### Screen: Add Wallet

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `form.name` | String | `""` | Nilai field nama |
| `form.balance` | String | `""` | Nilai field balance (raw string, di-parse saat submit) |
| `form.wallet_type` | Enum | `"other"` | Tipe wallet (default sampai ada UI pemilihan) |
| `errors.name` | String / null | `null` | Pesan error validasi nama |
| `errors.balance` | String / null | `null` | Pesan error validasi balance |
| `isSubmitting` | Boolean | `false` | Loading state tombol Save |

---

### Screen: Edit Wallet — **(BARU di v4.0)**

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `wallet` | Wallet | dari URL param | Data wallet yang sedang diedit |
| `form.name` | String | `wallet.name` | Pre-filled |
| `form.balance` | String | `formatCurrency(wallet.balance)` | Pre-filled, format locale |
| `form.wallet_type` | Enum | `wallet.wallet_type` | Pre-filled |
| `previousBalance` | Number | `wallet.balance` | **Snapshot nilai balance lama** untuk deteksi perubahan & pencatatan history |
| `errors` | Object | `{}` | Map error per field |
| `isSubmitting` | Boolean | `false` | Loading state Save |
| `isDeleteDialogOpen` | Boolean | `false` | Dialog konfirmasi hapus |

**Logika Deteksi Perubahan Balance:**
- Saat tap Save: bandingkan `parseCurrency(form.balance)` dengan `previousBalance`.
- Jika berbeda → buat record baru di `wallet_balance_history`.
- Jika sama → skip pencatatan history.

---

## 6. Struktur Halaman — Module Wallet

| Route | Nama Screen | Keterangan |
|-------|-------------|-----------|
| `/wallet` | Wallet List | Halaman utama. Root screen dari tab Wallet |
| `/wallet/add` | Add Wallet | Form tambah wallet baru. Diakses dari FAB `+` |
| `/wallet/[id]` | Wallet Detail / Edit | Detail dan edit wallet. Diakses dari tap item di list. *Belum ada gambar UI — diasumsikan struktur form serupa dengan Add Wallet, dengan tambahan tombol Save Changes & Delete* |

---

## 7. Catatan untuk Tim Developer

| Aspek | Catatan |
|-------|---------|
| **Platform Target** | Web app mobile-first. Prioritas tampilan di lebar layar 375px – 430px. |
| **Layer Abstraksi Wallet** | Semua operasi baca/tulis data wallet **wajib melalui satu layer abstraksi**. Saat Fase 2 mengganti `localStorage` dengan API call, hanya layer ini yang diubah. |
| **Soft Delete** | Wallet yang dihapus tidak dihapus permanen. Cukup ubah `is_active` menjadi `false`. Data tetap untuk audit dan migrasi Fase 2. |
| **Format Angka** | Nilai `balance` disimpan sebagai **angka murni** (mis. `823110.46`). Konversi ke format locale `id-ID` (mis. `823.110,46`) hanya di lapisan UI. |
| **Validasi Duplikat Nama** | Case-insensitive, hanya terhadap wallet yang `is_active: true`. |
| **Urutan Wallet** | Mengikuti `sort_order`. Wallet baru di posisi paling bawah. Drag-to-reorder belum ada di Fase 1. |
| **Re-load Setelah Navigasi** | Saat user kembali ke Wallet List dari Add/Edit, baca ulang data dari `localStorage` agar perubahan terbaru langsung tampil. |
| **Pencatatan Balance History** ⭐ | **WAJIB** dicatat hanya saat user edit balance manual via `/wallet/[id]`. **TIDAK BOLEH** dicatat saat: (a) Add Wallet, (b) transaksi dari Module Transactions, (c) operasi loan dari Module Loan, (d) soft delete wallet. |
| **Atomicity Edit Wallet** ⭐ | Saat Save di Edit Wallet, dua operasi harus berjalan bersamaan: (1) update record di `wallets`, (2) jika balance berubah, tambah record di `wallet_balance_history`. Secara konseptual atomik — kedua sukses atau kedua di-rollback. |
| **Konsumsi oleh Module Report** ⭐ | `wallet_balance_history` adalah dependency Module Report (Bagian 4.5 di spec Report). Module Wallet adalah **producer**, Module Report adalah **consumer**. Module Wallet tidak perlu tahu bagaimana data ini dipakai — cukup pastikan format & timing pencatatan benar. |
| **Migrasi Fase 2** | Field `anon_id` di `wallets` dan `wallet_balance_history` adalah kunci migrasi. Saat user buat akun, **kedua key** harus dikirim ke backend untuk dipindahkan ke `user_id` baru. |

---

## 8. Asumsi — ✅ RESOLVED (2026-05-01)

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Screen Wallet Detail/Edit (`/wallet/[id]`) | ✅ **Reuse form Add Wallet**, pre-filled + wallet_type selector + Save Changes & Delete |
| 2 | Field `wallet_type` di Add Wallet | ✅ Default `other`, selector ditambahkan di Edit Wallet |
| 3 | Edit balance dari X ke X (sama) | ✅ **Tidak dicatat** di history (delta = 0) |
| 4 | Restore wallet dari soft-delete | ⏭️ **Skip Fase 1** — tidak ada UI restore |
| 5 | Edit/delete transaksi → wallet_balance_history | ✅ **TIDAK dicatat** — audit trail sudah ada di transactions |

---

*— End of Technical Specification: Module Wallet (v4.0) —*
*Dokumen terkait: Module Transactions · Module Loan · Module Report · Global Architecture · Module Settings*
