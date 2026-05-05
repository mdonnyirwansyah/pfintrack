# Technical Specification Document
## Module: Wallet

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 5.1
**Tanggal:** 2026-05-05
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
| **4.1** | **2026-05-03** | **Update: Add Wallet dengan initial balance > 0 WAJIB dicatat ke `wallet_balance_history` (previous=0, new=balance). Ini memungkinkan Module Report menghitung Balance Correction sejak wallet pertama kali dibuat. Asumsi 10 & 11 direvisi.** |
| **5.0** | **2026-05-04** | **Balance Correction Transaction Pattern: Add Wallet dengan initial balance > 0 kini membuat wallet dengan balance=0 terlebih dahulu, kemudian `applyTransactionToWallet` dari income transaction "Balance Correction" yang menetapkan balance aktual. Edit Wallet dengan balance berubah juga tidak lagi langsung menulis balance — melainkan membuat income/expense transaction "Balance Correction" yang menggeser balance via side-effect. Kedua kondisi tetap menulis ke `wallet_balance_history`. Transaction Balance Correction muncul di Transaction list seperti transaksi reguler dan dapat dihapus (rollback via `rollbackTransactionFromWallet`). Rename app ke PFinTrack.** |
| **5.1** | **2026-05-05** | **Sync dengan implementasi: (1) `wallet_balance_history` schema ditambah `created_at` & `updated_at`. (2) `wallet_type` selector tersedia di Add & Edit (bukan hanya Edit). (3) Hapus Wallet diblokir jika wallet punya transaksi/loan aktif. (4) WalletCard layout diperbarui (card + icon + type label). (5) Edit Wallet screen sudah fully implemented. (6) Bottom Navigation 4 tab (tanpa Settings). (7) Pencatatan history dilakukan HANYA via `useWalletActions`, bukan via `useWalletStore`. (8) Dead code documented: `useWalletHistoryStore` & `WALLET_TYPES` constant tidak digunakan.** |

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
| 9 | **(DIPERBARUI v5.1)** Form **Add Wallet** memiliki **3 field input**: `name`, `wallet_type` (selector dengan 7 opsi, default `other`), dan `balance` (initial balance). Selector `wallet_type` tersedia di Add Wallet, bukan hanya di Edit Wallet seperti asumsi semula. |
| 10 | **(DIPERBARUI di v5.0)** `wallet_balance_history` dicatat dalam dua kondisi: **(a)** saat **Add Wallet** dengan `balance > 0` — dicatat sebagai koreksi awal dengan `previous_balance=0, new_balance=balance`; **(b)** saat **Edit Wallet** jika balance berubah dari nilai sebelumnya. Catatan ini digunakan oleh Module Report untuk menghitung **Balance Correction**. |
| 11 | **(DIPERBARUI di v5.0)** Perubahan balance yang **diakibatkan oleh transaksi** (income/expense/transfer) atau **loan** (give/get) **TIDAK** masuk ke `wallet_balance_history`. Hanya perubahan yang diprakarsai user secara eksplisit via form (Add Wallet & Edit Wallet) yang dicatat. Balance Correction transactions (dibuat otomatis oleh Wallet module) termasuk kategori transaksi biasa dan tidak dicatat ke history. |
| 12 | **(BARU di v5.0)** **Balance Correction Transaction Pattern**: Balance wallet tidak diubah langsung oleh Wallet module. Sebaliknya, Wallet module membuat transaksi income (balance naik) atau expense (balance turun) dengan `title:"Balance Correction"` dan `category:"Balance Correction"`. Side-effect `applyTransactionToWallet` dari transaction modul yang memperbarui `wallet.balance`. Ini menjaga konsistensi audit trail — satu mekanisme tunggal untuk semua perubahan balance. |

---

## 1. UI Component Breakdown

### Screen 1 — Wallet List (`/wallet`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Bar navigasi atas. Background biru `#2196F3`. Teks "Wallet" rata tengah, warna putih, tebal. Tidak ada tombol back (ini adalah root screen dari tab Wallet). Tinggi `56px`. Mempertimbangkan safe area iOS (notch). |
| **Total Balance Row** | Dinamis | Card rounded di atas list. Label "Total Balance" di kiri (tebal) dan nilai agregat saldo di kanan. Nilai dihitung otomatis dari seluruh wallet aktif (`is_active=true`). Tampil dengan format locale `id-ID`. Saat loading ditampilkan skeleton `w-28`. |
| **Wallet List** | Dinamis | Daftar scrollable seluruh wallet aktif (`is_active=true`). Tiap item ditampilkan sebagai **WalletCard** (card glass, rounded-[16px]): ikon tipe wallet (circle) + nama wallet (bold) + label tipe wallet (kecil, secondary) + saldo terformat (kanan, bold, tabular-nums) + ikon chevron `›`. Antar item dipisahkan space (bukan divider). Urutan tampil berdasarkan field `sort_order` ascending. Tap item → navigasi ke `/wallet/[id]`. |
| **FAB Button (`+`)** | Interaktif | Tombol mengambang di pojok kanan bawah layar, posisi di atas bottom navigation. Bentuk lingkaran, warna biru `#2196F3`, ikon `+` putih. Tap → navigasi ke screen Add Wallet (`/wallet/add`). |
| **Bottom Navigation** | Shared · Statis | Bar navigasi bawah dengan **4 tab**: Transactions · **Wallet** (aktif, biru) · Report · Loan. *(Tidak ada tab Settings di Fase 1. Komponen shared, lihat Global Architecture.)* |

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
| **Field: Wallet Name** | Interaktif | Input teks bebas. Label: "Wallet Name". Placeholder: *"Enter the name"*. Auto-focus saat halaman dibuka. Batas maksimal 50 karakter. Border merah saat ada error. |
| **Field: Wallet Type** | Interaktif | Dropdown `<select>` dengan 7 pilihan: Bank, Bank Digital, E-Wallet, Investment, Savings, Digital Asset, Other. Default: `other`. **Tersedia di Add Wallet (tidak hanya di Edit).** |
| **Field: Initial Balance** | Interaktif | Input angka dengan label "Initial Balance". Placeholder: *"Enter the balance"*. Ikon kalkulator dekoratif di kanan (tidak interaktif). `inputMode="decimal"` untuk keyboard numerik di mobile. Format real-time: titik sebagai pemisah ribuan, koma sebagai desimal (id-ID style). |
| **Button: Save** | Interaktif | Tombol full-width, warna biru `#2196F3`, label "Save" putih, rounded-[12px]. Tiga kondisi: **aktif** (default), **loading** (spinner + teks "Saving..."), **disabled** (saat form submit). |

---

### Screen 3 — Wallet Detail / Edit (`/wallet/[id]`) — **✅ Implemented**

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru `#2196F3`, teks "Edit Wallet" rata tengah, warna putih. Tombol back `‹` di kiri. |
| **Current Balance Card** | Informatif | Card glass di atas form, menampilkan label "Current Balance" di kiri dan nilai saldo wallet saat ini di kanan (format id-ID). Tidak dapat diedit langsung — hanya informasi. |
| **Field: Wallet Name** | Interaktif | Pre-filled dengan nama wallet existing. Validasi sama dengan Add Wallet (termasuk duplikat, kecuali wallet dirinya sendiri dikecualikan dari cek duplikat). |
| **Field: Wallet Type** | Interaktif | Pre-filled dengan `wallet_type` existing. Selector sama dengan Add Wallet. |
| **Field: Balance** | Interaktif | Label "Balance" (bukan "Initial Balance"). Pre-filled dengan saldo saat ini (format id-ID). Perubahan pada field ini akan memicu Balance Correction transaction. |
| **Button: Save Changes** | Interaktif | Full-width, warna biru, label "Save Changes". Kondisi loading saat submit. |
| **Button: Delete Wallet** | Interaktif | Full-width, border merah, teks merah, ikon trash. **Kondisi disabled/grayed jika wallet sedang dipakai** (punya transaksi atau loan entries aktif). Saat kondisi disabled dan di-tap → tampil toast error. Saat kondisi aktif dan di-tap → tampil ConfirmDialog. |
| **ConfirmDialog (Delete)** | Modal | Dialog konfirmasi hapus dengan nama wallet bold, tombol Confirm (merah) dan Cancel. |
| **Skeleton Loader** | Loading | Empat skeleton `h-[52px]` tampil saat wallet belum dimuat dari localStorage. |
| **Not Found State** | Error | Tampil jika wallet ID tidak ada atau sudah di-soft-delete. Tombol "Back to List". |

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
                           - name, wallet_type
                           - balance: 0  ← SELALU 0, tidak menggunakan input user
                           - is_active: true
                           - created_at & updated_at (timestamp saat ini)
                           - sort_order (urutan terakhir + 1)
                              ↓
                   Tambahkan ke array wallets
                   Simpan kembali ke localStorage['wallets']
                              ↓
                   ✅ Jika balance input user > 0:
                      1. Buat record di wallet_balance_history:
                         - previous_balance: 0
                         - new_balance: balance input user
                         - delta: balance input user
                         - corrected_at: timestamp saat ini
                         Ini merekam "koreksi awal" wallet baru
                         agar Report dapat menghitung Balance Correction.
                      2. Buat transaksi "Balance Correction":
                         - type: "income"
                         - title: "Balance Correction"
                         - category: "Balance Correction"
                         - amount: balance input user
                         - wallet_id: wallet yang baru dibuat
                         Simpan ke localStorage['transactions']
                      3. applyTransactionToWallet() menaikkan wallet.balance
                         dari 0 ke nilai input user
                              ↓
                   Kembali ke Wallet List (/wallet)
                   Total Balance otomatis ter-update
```

> **Catatan penting (v5.0):** Wallet selalu dibuat dengan `balance = 0`. Balance aktual ditetapkan oleh transaksi "Balance Correction" yang dibuat bersamaan. Transaksi ini muncul di Transaction list dan dapat dihapus (rollback via `rollbackTransactionFromWallet`).

---

### Flow: Edit Wallet Screen — **(BARU di v4.0, DIPERBARUI di v5.0)**

```
Pengguna tap salah satu baris wallet di list
                              ↓
              Navigasi ke /wallet/[id]
                              ↓
              Form pre-filled dengan data existing
              Simpan nilai balance lama: previous_balance = wallet.balance
                              ↓
              User mengubah field (name, balance, atau wallet_type)
              → Tap "Save Changes"
                              ↓
                   [Validasi sisi client]
                              ↓ LOLOS
              ┌─────────────────────────────────────────────┐
              │ Update name & wallet_type langsung:         │
              │   wallet.name = form.name                   │
              │   wallet.wallet_type = form.wallet_type     │
              │   wallet.updated_at = now                   │
              │   (TIDAK update wallet.balance di sini)     │
              └─────────────────────────────────────────────┘
                              ↓
              ┌─────────────────────────────────────────────┐
              │ Cek: apakah balance berubah?                │
              │   delta = form.balance − previous_balance   │
              ├─────────────────────────────────────────────┤
              │ ↓ YA (delta ≠ 0)                            │
              │   1. Buat record baru di wallet_balance_    │
              │      history:                               │
              │      - previous_balance: nilai lama         │
              │      - new_balance: nilai baru              │
              │      - delta: new − previous                │
              │      - corrected_at: timestamp saat ini     │
              │   2. Buat transaksi "Balance Correction":   │
              │      - type: delta > 0 ? "income":"expense" │
              │      - title: "Balance Correction"          │
              │      - category: "Balance Correction"       │
              │      - amount: Math.abs(delta)              │
              │      - wallet_id: wallet.id                 │
              │   3. applyTransactionToWallet() mengubah    │
              │      wallet.balance oleh delta              │
              │                                             │
              │ ↓ TIDAK BERUBAH (delta = 0)                 │
              │   (skip history dan transaction)            │
              └─────────────────────────────────────────────┘
                              ↓
              Kembali ke Wallet List
              Total Balance otomatis ter-update
```

> **Catatan penting (v5.0):** Balance wallet **tidak diupdate langsung** oleh Edit Wallet. Hanya `name` dan `wallet_type` yang diubah langsung. Perubahan balance di-delegasikan ke transaksi "Balance Correction" yang dibuat oleh Wallet module. Pencatatan ke `wallet_balance_history` tetap wajib bersamaan dengan pembuatan transaksi.
>
> Perubahan balance akibat transaksi income/expense/transfer atau give/get loan **TIDAK** boleh ditulis ke history ini.

---

### Flow: Hapus Wallet — **(BARU di v4.0, DIPERBARUI di v5.1)**

```
Pengguna tap tombol "Delete" di Wallet Detail
                              ↓
              Cek: apakah wallet sedang dipakai?
              (punya transaksi aktif ATAU loan entries aktif)
              ↓ YA                           ↓ TIDAK
   Toast error muncul:              Tampilkan ConfirmDialog
   "Wallet sedang digunakan"
   Tombol tetap disabled                     ↓ Konfirmasi
                              Soft delete: wallet.is_active = false
                              wallet.updated_at = now
                                            ↓
                              ⚠️ TIDAK menulis ke wallet_balance_history.
                                 Penghapusan wallet bukan koreksi balance —
                                 ini adalah penghapusan akun wallet itu sendiri.
                                            ↓
                              Kembali ke Wallet List (/wallet)
                              Wallet tidak muncul lagi di list
```

> **Aturan Penting (v5.1):** Wallet yang masih memiliki transaksi aktif (`transactions` dengan `wallet_id` atau `destination_wallet_id` = wallet.id) atau loan entries aktif (`loan_entries` dengan `wallet_id` = wallet.id) **TIDAK DAPAT dihapus**. Tombol Delete tampil disabled (greyed out, cursor not-allowed). Tap pada tombol disabled memunculkan toast error, bukan dialog konfirmasi.

---

### Validasi Client-Side

| Field | Aturan Validasi | Pesan Error |
|-------|----------------|-------------|
| Wallet Name | Wajib diisi | "Wallet name is required" |
| Wallet Name | Minimal 2 karakter | "Name must be at least 2 characters" |
| Wallet Name | Maksimal 50 karakter | "Name must be 50 characters or less" |
| Wallet Name | Tidak boleh duplikat (case-insensitive, hanya `is_active=true`) | "Wallet name is already taken" |
| Balance | Wajib diisi | "Balance is required" |
| Balance | Harus berupa angka dan bernilai ≥ 0 | "Balance must be a positive number" |
| Balance | Nilai maksimum `999.999.999.999,99` | "Balance exceeds maximum limit" |

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
| `delta` | Number (desimal) | Wajib | Selisih: `new_balance − previous_balance`. Bisa positif atau negatif. Dihitung otomatis: `new_balance - previous_balance` |
| `corrected_at` | String (ISO 8601) | Wajib | Timestamp saat perubahan dilakukan. Field ini yang digunakan Module Report untuk filter periode |
| `is_active` | Boolean | Default: `true` | Soft delete flag (jika perubahan di-undo) |
| `created_at` | String (ISO 8601) | Wajib | Timestamp record dibuat (sama dengan `corrected_at` saat create) |
| `updated_at` | String (ISO 8601) | Wajib | Timestamp terakhir record diperbarui (digunakan saat soft delete) |

**Aturan Pencatatan:**

✅ **Wajib dicatat:**
1. Saat **Add Wallet** dengan `balance > 0` — dicatat sebagai koreksi awal (`previous=0, new=balance`)
2. Saat **Edit Wallet** jika nilai `balance` berubah dari nilai sebelumnya

❌ **TIDAK boleh dicatat** ketika balance berubah karena:
1. Transaksi income/expense/transfer dari Module Transactions
2. Operasi give/get dari Module Loan
3. Wallet di-soft-delete

> **Alasan:** Perubahan akibat transaksi sudah punya jejaknya sendiri di `transactions` atau `loan_entries`. Add Wallet & Edit Wallet adalah satu-satunya aksi di mana user secara eksplisit menetapkan nilai balance — sehingga layak disebut "koreksi".

---

### Enum: `wallet_type`

| Nilai | Label Tampil di UI | Ikon (Lucide) | Contoh Wallet |
|-------|--------------------|---------------|---------------|
| `bank` | Bank | `Landmark` | BCA, Mandiri, BNI, BRI |
| `bank_digital` | Digital Bank | `Smartphone` | Jago, Blu, SeaBank, Allo Bank |
| `e_wallet` | E-Wallet | `Wallet` | Gopay, OVO, Dana, LinkAja |
| `investment` | Investment | `TrendingUp` | Ajaib, Bibit, Bareksa |
| `savings` | Savings | `PiggyBank` | Dana Darurat, Tabungan Goals |
| `digital_asset` | Digital Asset | `Coins` | Emas Digital, Kripto |
| `other` | Other | `MoreHorizontal` | Default |

> **Catatan:** Label tampil di WalletCard menggunakan string hardcoded dalam bahasa Inggris (`WALLET_TYPE_LABELS` di `WalletCard.tsx`). Selector di form menggunakan `useTranslations("wallet.types")` (i18n-ready). Kedua sumber harus konsisten.

---

## 4. Logika Pencatatan Balance — **(BARU di v4.0)**

> Bagian ini menjelaskan **kapan** dan **bagaimana** balance wallet berubah, serta kapan perubahan tersebut wajib dicatat ke `wallet_balance_history`.

---

### 4.1 Sumber Perubahan Balance Wallet

Field `balance` di sebuah wallet dapat berubah karena beberapa alasan:

| # | Sumber Perubahan | Modul Pemicu | Catat ke history? | Cara balance berubah |
|---|-----------------|-------------|-------------------|----------------------|
| 1 | **Wallet baru dibuat** dengan initial balance > 0 | Wallet (Add) | ✅ **Ya** — koreksi awal (prev=0, new=balance) | Via transaksi "Balance Correction" income |
| 2 | **Wallet baru dibuat** dengan initial balance = 0 | Wallet (Add) | ❌ **Tidak** — tidak ada perubahan bermakna | Wallet dibuat dengan balance=0 langsung |
| 3 | **Transaksi income/expense/transfer** (termasuk "Balance Correction") | Transactions | ❌ **Tidak** | `applyTransactionToWallet()` |
| 4 | **Operasi loan give/get** (jika user pilih wallet) | Loan | ❌ **Tidak** | Loan module langsung update balance |
| 5 | **Edit manual** field balance via Edit Wallet (delta ≠ 0) | Wallet (Edit) | ✅ **Ya** (hanya jika nilai berubah) | Via transaksi "Balance Correction" income/expense |

---

### 4.2 Mengapa Hanya Edit Manual yang Dicatat?

- Perubahan dari **transaksi** sudah punya jejak audit-nya sendiri di `transactions` (Module Transactions). Mengulang pencatatannya di history akan menghasilkan double-counting.
- Perubahan dari **loan** sudah tercatat di `loan_entries`. Sama, double-counting akan terjadi.
- **Initial balance > 0** saat wallet dibuat = user menyatakan "wallet ini sudah punya saldo sekian". Ini adalah koreksi awal yang perlu direkam agar Module Report bisa melacak perubahan balance dari awal.
- **Edit manual** = user menyadari saldo tidak sesuai realita (mis. lupa catat transaksi, ada perbedaan dengan saldo asli di bank). Ini **murni koreksi** yang tidak ada jejaknya di tempat lain.

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

### Screen: Edit Wallet — **(BARU di v4.0, DIPERBARUI di v5.1)**

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `wallet` | `Wallet \| null` | `null` (dimuat dari localStorage via URL param) | Data wallet yang sedang diedit |
| `notFound` | Boolean | `false` | True jika wallet ID tidak ada atau sudah di-soft-delete |
| `form.name` | String | `wallet.name` | Pre-filled |
| `form.balance` | String | `formatIDR(wallet.balance)` | Pre-filled, format locale id-ID |
| `form.wallet_type` | Enum | `wallet.wallet_type` | Pre-filled |
| `errors` | Object | `{}` | Map error per field |
| `isSubmitting` | Boolean | `false` | Loading state tombol Save Changes |
| `isDeleteDialogOpen` | Boolean | `false` | Dialog konfirmasi hapus |
| `isInUse` | Boolean | `false` | True jika wallet punya transaksi/loan entries aktif — memblokir tombol Delete |

> **Catatan implementasi:** `previousBalance` tidak disimpan sebagai state terpisah — nilai lama diambil langsung dari `wallet.balance` yang di-load saat halaman dibuka, dan dipass ke `handleUpdate(wallet.id, values, wallet.balance)`.

**Logika Deteksi Perubahan Balance:**
- Saat tap Save: bandingkan `parseIDR(form.balance)` dengan `wallet.balance` (nilai yang dimuat saat halaman dibuka).
- Jika berbeda → tulis ke `wallet_balance_history` + buat transaksi "Balance Correction".
- Jika sama → skip pencatatan history dan transaksi.

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
| **Balance Correction Transaction Pattern** ⭐ | Wallet module **tidak boleh** menulis `wallet.balance` secara langsung untuk perubahan berbasis koreksi. Harus via transaction "Balance Correction": (1) buat transaksi income/expense, (2) `applyTransactionToWallet()` mengubah balance. Ini menjaga satu jalur tunggal untuk semua perubahan balance. |
| **Pencatatan Balance History** ⭐ | **WAJIB** dicatat bersamaan dengan pembuatan transaksi "Balance Correction": (a) Add Wallet dengan balance > 0, (b) Edit Wallet jika balance berubah. **TIDAK BOLEH** dicatat saat: transaksi dari Module Transactions, operasi loan dari Module Loan, atau soft delete wallet. |
| **Atomicity Edit Wallet** ⭐ | Saat Save di Edit Wallet, tiga operasi berjalan bersamaan jika balance berubah: (1) update `name`/`wallet_type` di `wallets`, (2) tambah record ke `wallet_balance_history`, (3) buat transaksi "Balance Correction". Secara konseptual atomik. |
| **Balance Correction di Transaction List** ⭐ | Transaksi "Balance Correction" (dibuat otomatis oleh Wallet module) muncul normal di Transaction list. User **bisa** menghapusnya — rollback via `rollbackTransactionFromWallet` adalah perilaku yang benar dan diinginkan. |
| **Konsumsi oleh Module Report** ⭐ | `wallet_balance_history` adalah dependency Module Report (Bagian 4.5 di spec Report). Module Wallet adalah **producer**, Module Report adalah **consumer**. Module Wallet tidak perlu tahu bagaimana data ini dipakai — cukup pastikan format & timing pencatatan benar. |
| **Migrasi Fase 2** | Field `anon_id` di `wallets` dan `wallet_balance_history` adalah kunci migrasi. Saat user buat akun, **kedua key** harus dikirim ke backend untuk dipindahkan ke `user_id` baru. |
| **Satu jalur pencatatan history** ⭐ | Pencatatan `wallet_balance_history` dilakukan **HANYA** di `useWalletActions` (`handleCreate` dan `handleUpdate`), bukan di `useWalletStore`. `useWalletStore.createWallet` dan `updateWallet` memiliki conditional history-writing yang tidak pernah terpicu (dead code) karena: (a) `handleCreate` selalu memanggil `createWallet` dengan `balance: 0`, (b) `handleUpdate` memanggil `updateWallet` tanpa field `balance` di patch. **Ini perlu direfactor:** history-writing logic di `useWalletStore` harus dihapus untuk menghindari kebingungan.** |
| **Dead code: `useWalletHistoryStore`** ⚠️ | File `src/lib/stores/useWalletHistoryStore.ts` mendefinisikan Zustand store dengan `zustand/persist` ke key `wallet_balance_history`. Store ini **tidak pernah diimport atau digunakan** di mana pun. Zustand persist menulis format `{ state: {...}, version: 1 }` ke localStorage, yang **berbentrok** dengan format array plain yang digunakan `walletBalanceHistoryRepo`. Store ini harus **dihapus** untuk mencegah risiko data corruption. |
| **Dead code: `WALLET_TYPES` constant** ⚠️ | File `src/lib/constants/wallet-types.ts` mendefinisikan array `WALLET_TYPES` yang **tidak pernah diimport** di mana pun. `WalletForm` mendefinisikan `WALLET_TYPE_OPTIONS` sendiri secara lokal menggunakan `useTranslations`. Constant ini harus dihapus atau dijadikan sumber tunggal yang diimport oleh `WalletForm`. |
| **Hapus Wallet — In-Use Guard** ⭐ | Wallet yang memiliki transaksi aktif (sebagai `wallet_id` atau `destination_wallet_id`) atau loan entries aktif tidak dapat di-soft-delete. Cek dilakukan saat komponen dimuat di `/wallet/[id]`. Tombol Delete di-disabled dan menampilkan toast saat di-tap, bukan dialog konfirmasi. |
| **`UpdateWalletInput` includes `balance`** ⚠️ | Tipe `UpdateWalletInput` di `wallets.ts` membolehkan `balance` sebagai field yang bisa di-patch langsung ke `walletsRepo.update()`. Per spec v5.0, balance wallet **tidak boleh** diubah langsung — hanya via Balance Correction transaction. Tipe ini sebaiknya diubah menjadi `Partial<Pick<Wallet, "name" \| "wallet_type" \| "currency" \| "sort_order">>` (tanpa `balance`) untuk mencegah penyalahgunaan. |

---

## 8. Asumsi — ✅ RESOLVED

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Screen Wallet Detail/Edit (`/wallet/[id]`) | ✅ **Reuse form Add Wallet** (`WalletForm` component), pre-filled + wallet_type selector + Save Changes & Delete |
| 2 | Field `wallet_type` di Add Wallet | ✅ **(Diperbarui v5.1)** Selector `wallet_type` tersedia di **KEDUA** Add Wallet dan Edit Wallet (bukan hanya Edit). Default: `other`. |
| 3 | Edit balance dari X ke X (sama) | ✅ **Tidak dicatat** di history (delta = 0, dideteksi via `parseIDR(form.balance) === wallet.balance`) |
| 4 | Restore wallet dari soft-delete | ⏭️ **Skip Fase 1** — tidak ada UI restore |
| 5 | Edit/delete transaksi → wallet_balance_history | ✅ **TIDAK dicatat** — audit trail sudah ada di transactions |
| 6 | Hapus wallet yang sedang dipakai | ✅ **(Baru v5.1)** Wallet yang punya transaksi/loan aktif **TIDAK DAPAT** dihapus. Tombol disabled + toast error. |

---

*— End of Technical Specification: Module Wallet (v5.1) —*
*Dokumen terkait: Module Transactions · Module Loan · Module Report · Global Architecture · Module Settings*
