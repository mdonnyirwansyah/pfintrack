# Technical Specification Document
## Module: Loan

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 1.3
**Tanggal:** 2026-05-05
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

> **Catatan Scope:**
> Dokumen ini hanya mencakup **Module Loan** (utang-piutang antar pribadi), terdiri dari 4 screen utama:
> Loan List, Add "Give", Add "Get", dan Loan Detail per orang.
> Modul lain (Wallet, Transactions, Report, Settings) dibahas dalam dokumen terpisah.
> Konfigurasi global (layout, navigasi, migrasi auth) dibahas dalam dokumen **Global Architecture**.

---

## Asumsi Teknis

| # | Asumsi |
|---|--------|
| 1 | Aplikasi adalah **Web App Mobile-First** dengan Next.js, diakses via browser mobile. |
| 2 | **Fase 1:** Tidak ada backend, tidak ada autentikasi. Semua data loan disimpan di **`localStorage`** browser. |
| 3 | Pengguna diidentifikasi anonim dengan UUID v4 di `localStorage['anon_id']` (sama dengan modul lain). |
| 4 | Format angka menggunakan locale **`id-ID`** (titik ribuan, koma desimal). Contoh: `1.425.827,00`. |
| 5 | Mata uang default: **IDR**. |
| 6 | Data loan disimpan di **dua key terpisah**: `loan_counterparties` (daftar orang) dan `loan_entries` (transaksi loan). |
| 7 | **Konsep dasar:** Modul Loan mencatat utang-piutang antar pribadi (mis. dengan teman/keluarga), terpisah dari transaksi keuangan reguler (Module Transactions). |
| 8 | **"Give"** = user **memberi** uang ke orang lain → orang tersebut berhutang ke user. |
| 9 | **"Get"** = user **menerima** uang dari orang lain → bisa pelunasan dari Give sebelumnya, atau user yang berhutang ke orang lain. |
| 10 | **Pengelompokan per orang (counterparty):** Loan dikelompokkan **per nama orang**. Setiap entry baru dengan nama yang sama (case-insensitive) digabungkan ke counterparty existing. |
| 11 | **Logika offset (saling tutup):** Setiap counterparty memiliki tiga total: `total_give`, `total_get`, dan `outstanding = total_give − total_get`. Get otomatis "mengurangi" outstanding dari Give sebelumnya. |
| 12 | **Status "Paid off":** Counterparty otomatis berstatus paid off ketika `outstanding == 0`, atau ketika user secara **manual menandai** dengan tombol Mark as Paid di detail. Jika di-mark manual, status tetap paid off meskipun outstanding ≠ 0. |
| 13 | **Integrasi dengan Wallet:** Wallet bersifat **WAJIB** di form Give/Get. Harus dipilih sebelum form bisa di-submit. Balance wallet otomatis ter-update (Give → kurangi, Get → tambah). |
| 14 | **Angka di Loan List samping nama** = `outstanding` (selisih `Give − Get`). Jika `outstanding == 0` atau status manual paid off → tampilkan teks **"Paid off"** menggantikan angka. |

---

## 1. UI Component Breakdown

### Screen 1 — Loan List (`/loan`)

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Bar atas dengan background biru muda. Teks "Loan" rata tengah. |
| **Summary Bar** | Dinamis | **Tiga kolom**: **Get** (hijau, `+ {total}` prefix jika > 0) · **Give** (merah, `- {total}` prefix jika > 0) · **Balance** (dinamis: `balance = totalGive − totalGet`; hijau + prefix `"+"` jika balance < 0 (user untung), merah + prefix `"-"` jika balance > 0 (user rugi), abu jika 0). Hanya menghitung counterparty dengan status `outstanding`. |
| **Counterparty List** | Dinamis | Daftar orang yang pernah loan dengan user. **Urutan:** counterparty dengan status *outstanding* lebih dulu (sorted by `updated_at` DESC per grup), kemudian counterparty *paid off* (sorted by `updated_at` DESC). Setiap baris: nama + subtitle (note dari entry terakhir, atau "Without explanation") + outstanding/Paid off + chevron `›`. |
| **Outstanding Display** | Dinamis | Logika tampilan per baris counterparty: `outstanding = totalGive − totalGet`. Jika `outstanding > 0` → merah dengan prefix `"- "` (counterparty berhutang ke user). Jika `outstanding < 0` → hijau dengan prefix `"+ "` (user berhutang ke counterparty). Jika `outstanding === 0` **atau** `manual_paid_off` → teks **"Lunas"** dengan warna `--text-secondary` (bukan hijau). |
| **FAB Expandable** | Interaktif | Tombol biru `+` di pojok kanan bawah. Tap → mengembang menjadi 2 sub-action: **Give** (merah, ikon `»` ke bawah) · **Get** (oranye, ikon `«` ke atas). |
| **Bottom Navigation** | Shared · Statis | 5 tab. Tab **Loan** aktif. *(Lihat Global Architecture.)* |

---

### Screen 2 — Loan Detail per Orang (`/loan/[counterpartyId]`)

> Diakses dari tap baris counterparty di Loan List.

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru. Tombol back `‹` di kiri. **Nama counterparty** sebagai judul (mis. "Alma") dengan subtitle status di bawahnya: **"Not paid off"** atau **"Paid off"**. |
| **Header Action: Mark as Paid** | Interaktif | Ikon person dengan checkmark (👤✓) di kanan header. Tap → membuka konfirmasi untuk menandai counterparty sebagai paid off **secara manual**. Hanya tampil jika status saat ini `outstanding`. |
| **Header Action: Edit** | Interaktif | Ikon pensil (✏️). Tap → masuk mode edit nama counterparty (rename). |
| **Header Action: Delete** | Interaktif | Ikon tempat sampah (🗑️). Tap → membuka konfirmasi untuk **menghapus seluruh counterparty beserta semua entry**-nya (soft delete). |
| **Summary Bar (3 Kolom)** | Dinamis | Tiga total agregat untuk counterparty ini: <br>• **Get** (hijau): `+ {total_get}` jika > 0 — akumulasi seluruh entry tipe Get <br>• **Give** (merah): `{total_give}` — akumulasi seluruh entry tipe Give <br>• **Balance** (dinamis: hijau jika outstanding < 0, merah jika outstanding > 0, abu jika 0): `outstanding = total_give − total_get`. Prefix logic: `outstanding < 0 ? "+ " : outstanding > 0 ? "- " : ""`. |
| **Entry History List** | Dinamis | Daftar seluruh entry untuk counterparty ini, urut DESC by `transaction_date` lalu `transaction_time`. Setiap baris menampilkan: tanggal (format locale-aware "Day, DD Mon YYYY"), subtitle (note atau "Without explanation"), **nama wallet** (baris ke-3, warna `--text-tertiary`) jika ada `wallet_id`, nominal di kanan + chevron `›`. |
| **Entry Nominal Display** | Dinamis | Format tampilan tergantung tipe: <br>• Tipe **Get**: `+ {amount}` warna hijau (`--color-positive`) (mis. `+ 5.000,00`) <br>• Tipe **Give**: `{amount}` warna merah (`--color-negative`) (mis. `5.000,00`) |
| **Entry Tap** | Interaktif | Tap baris entry → navigasi ke screen Edit Entry untuk mengubah/menghapus entry tersebut. |
| **FAB Expandable** | Interaktif | Sama persis dengan Loan List: tombol `+` biru → expand ke **Give** (merah) + **Get** (oranye). Bedanya: saat dipilih, navigasi ke form Add Give/Get dengan **nama pre-filled & terkunci** ke counterparty saat ini. |

---

### Screen 3 — Add "Give" (`/loan/add/give`)

> Form untuk mencatat user **memberi uang** ke orang lain.

**Urutan field (atas ke bawah):**

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru solid. Tombol back `‹`. Judul **"Give"** rata tengah. |
| **Date + Time Row** | Interaktif | Date dan Time dalam satu flex row dengan rasio **3:2** (Date lebih lebar). Date: field tanggal + ikon kalender, default hari ini. Time: field jam `HH:MM`, default waktu sekarang. |
| **Wallet Selector** | **Wajib** | Field dropdown. Placeholder *"Select Wallet"*. **Wajib dipilih** — validasi error jika tidak dipilih saat submit. **Tidak ada** tombol clear/X. Di bawah selector ditampilkan `"Balance: {formatIDR(wallet.balance)}"` saat wallet dipilih. Untuk tipe **Give**: jika `amount > wallet.balance`, tampilkan warning AlertTriangle *"Insufficient wallet balance"* — non-blocking (form tetap bisa di-submit). **Auto-open**: bottom sheet wallet picker otomatis terbuka saat form Add pertama kali di-mount (hanya berlaku di mode Add, tidak di mode Edit). |
| **Amount Field** | Interaktif | Input teks (`type="text" inputMode="decimal"`). Placeholder *"Amount"*. Ikon kalkulator dekoratif di kanan. Wajib diisi, > 0. **Real-time formatting saat typing:** karakter non-numerik dihapus otomatis, titik ribuan ditambahkan secara langsung (contoh: `1.500.000`). Koma desimal boleh diketik (contoh: `1.500.000,50`). Parsing final menggunakan `parseIDR()`. |
| **Name Field** | Interaktif | Input teks bebas. Placeholder *"Enter the name"*. Wajib diisi. Auto-trim. Pencocokan ke counterparty existing case-insensitive. **Jika navigasi dari Loan Detail → field ini pre-filled & disabled (locked).** |
| **Note Field** | Opsional | Input teks bebas. Placeholder *"Note (optional)"*. Maksimum 255 karakter. |
| **Save Button** | Interaktif | Posisi kanan bawah. Warna biru, label "Save". Tiga kondisi: aktif / loading / disabled. |

---

### Screen 4 — Add "Get" (`/loan/add/get`)

Struktur **identik** dengan Add "Give" (termasuk urutan field dan wallet wajib), hanya berbeda judul header (**"Get"**) dan logika penyimpanan:

| Aspek | Give | Get |
|-------|------|-----|
| Tipe entry yang disimpan | `give` | `get` |
| Efek terhadap **outstanding** | `outstanding += amount` | `outstanding −= amount` |
| Efek terhadap **balance wallet** (jika dipilih) | Balance wallet **berkurang** | Balance wallet **bertambah** |
| Warna nominal di list detail | Hitam/abu (mis. `5.000,00`) | Hijau dengan prefix `+` (mis. `+ 5.000,00`) |

---

## 2. User Interactions & Flow

### Flow: Buka Loan List

```
User tap tab "Loan" di Bottom Nav
              ↓
   Baca localStorage['loan_counterparties'] (yang is_active=true)
              ↓
   Untuk setiap counterparty, hitung agregat dari loan_entries:
     total_give    = SUM(amount where type='give'  AND is_active=true)
     total_get     = SUM(amount where type='get'   AND is_active=true)
     outstanding   = total_give − total_get
     status        = (manual_paid_off OR outstanding == 0) ? 'paid off' : 'outstanding'
              ↓
   Hitung Summary:
     Total Get  = SUM(outstanding)      di mana outstanding > 0 AND status != 'paid off'
     Total Give = SUM(|outstanding|)    di mana outstanding < 0 AND status != 'paid off'
              ↓
   Render list (outstanding group dulu by updated_at DESC, kemudian paid off group by updated_at DESC)
```

---

### Flow: Buka Loan Detail per Orang

```
User tap baris counterparty di Loan List (mis. "Alma")
              ↓
   Navigasi ke /loan/[counterpartyId]
              ↓
   Ambil counterparty by id dari localStorage
              ↓
   Ambil semua entries di mana counterparty_id == id AND is_active=true
              ↓
   Hitung agregat:
     total_give, total_get, outstanding, status
              ↓
   Render:
     - Header: nama + status ("Not paid off" / "Paid off")
     - Summary 3 kolom: Get / Give / Balance
     - List entries (urut DESC by date+time)
              ↓
   Render warna nominal per entry:
     - type='get'  → "+ {amount}" warna hijau
     - type='give' → "{amount}"   warna hitam/abu
```

---

### Flow: FAB Expandable (di Loan List)

```
User tap FAB "+" di Loan List
        └→ Expand ke 2 sub-action: Give, Get
           Tap "Give" → /loan/add/give           (nama kosong)
           Tap "Get"  → /loan/add/get            (nama kosong)
           Tap luar   → menutup
```

---

### Flow: FAB Expandable (di Loan Detail)

```
User tap FAB "+" di Loan Detail (counterparty: "Alma")
        └→ Expand ke 2 sub-action: Give, Get
           Tap "Give" → /loan/add/give?counterpartyId={id}
                        Form terbuka dengan name="Alma" (locked/disabled)
           Tap "Get"  → /loan/add/get?counterpartyId={id}
                        Form terbuka dengan name="Alma" (locked/disabled)
```

---

### Flow: Add Give / Get

```
User pilih Wallet (wajib) → isi Amount → isi Name (jika tidak locked) → (opsi) Note
                            ↓
                       Tap "Save"
                            ↓
                  [Validasi sisi client]
                            ↓ LOLOS
              Cari counterparty dengan name yang sama (case-insensitive, trimmed)
                            ↓
              ┌──────────────────────────────────────┐
              │ Counterparty SUDAH ADA?              │
              ├──────────────────────────────────────┤
              │ ↓ TIDAK                              │
              │   Buat counterparty baru             │
              │   - id, anon_id, name (preserve case)│
              │   - manual_paid_off: false           │
              │   - is_active: true                  │
              │                                      │
              │ ↓ YA                                 │
              │   Gunakan counterparty existing      │
              │   Jika manual_paid_off=true,         │
              │   reset menjadi false (re-open)      │
              └──────────────────────────────────────┘
                            ↓
              Buat entry baru:
              - id, anon_id, counterparty_id
              - type ('give' atau 'get')
              - amount, wallet_id (nullable), note
              - transaction_date, transaction_time
              - is_active: true
              - created_at, updated_at
                            ↓
              Simpan entry ke localStorage['loan_entries']
                            ↓
              Jika wallet_id terisi:
                Give → wallet.balance −= amount
                Get  → wallet.balance += amount
                Update localStorage['wallets']
                            ↓
              Update counterparty.updated_at
                            ↓
              Kembali ke screen sebelumnya:
              - Jika dari Loan List      → Loan List ter-refresh
              - Jika dari Loan Detail    → Loan Detail ter-refresh
```

---

### Flow: Mark as Paid (manual)

```
User di Loan Detail tap ikon person+checkmark di header
              ↓
   Tampilkan dialog konfirmasi:
     "Tandai [nama counterparty] sebagai lunas?
      Tindakan ini akan menutup seluruh utang-piutang dengan orang ini.
      Anda masih bisa menambahkan transaksi baru kapan saja."
              ↓ Konfirmasi
   counterparty.manual_paid_off = true
   counterparty.updated_at = now
   Simpan ke localStorage
              ↓
   Refresh detail: subtitle berubah jadi "Paid off"
   Header action "Mark as Paid" disembunyikan
              ↓
   Saat user kembali ke Loan List:
     Counterparty ini muncul dengan teks "Paid off" menggantikan nominal
     (meskipun outstanding ≠ 0, status manual override)
```

**Catatan:** Jika user menambah entry baru ke counterparty yang sudah manual paid off, `manual_paid_off` otomatis di-reset ke `false` (lihat flow Add Give/Get).

---

### Flow: Edit Counterparty (Rename)

```
User di Loan Detail tap ikon pensil di header
              ↓
   Tampilkan modal/inline edit untuk field name
   Pre-filled dengan nama saat ini
              ↓ User ubah → tap Save
              ↓
   Validasi:
     - Name 2-50 karakter
     - Tidak boleh konflik dengan counterparty lain
       (case-insensitive, kecuali counterparty diri sendiri)
              ↓ LOLOS
   counterparty.name = nilai baru
   counterparty.updated_at = now
   Simpan ke localStorage
              ↓
   Refresh tampilan header & list
```

---

### Flow: Delete Counterparty

```
User di Loan Detail tap ikon tempat sampah di header
              ↓
   Tampilkan dialog konfirmasi:
     "Hapus [nama] dan seluruh riwayat transaksi loan-nya?
      Saldo wallet yang terhubung akan dipulihkan.
      Tindakan ini tidak dapat dibatalkan."
              ↓ Konfirmasi
   Untuk setiap entry counterparty di mana is_active=true:
     1. Jika wallet_id terisi:
        Give → wallet.balance += amount  (rollback: kembalikan)
        Get  → wallet.balance −= amount  (rollback)
     2. entry.is_active = false
              ↓
   counterparty.is_active = false
   Simpan ke localStorage
              ↓
   Navigasi kembali ke Loan List
   Counterparty tidak muncul lagi
```

---

### Flow: Edit / Delete Single Entry

```
User di Loan Detail tap salah satu entry (atau chevron `›`)
              ↓
   Navigasi ke screen Edit Entry
              ↓
   ┌───── User ubah field & tap Save ─────┐
   │  1. Rollback efek entry LAMA:        │
   │     - Jika ada wallet:               │
   │       give: wallet += amount lama    │
   │       get : wallet −= amount lama    │
   │  2. Apply efek entry BARU:           │
   │     - Jika ada wallet:               │
   │       give: wallet −= amount baru    │
   │       get : wallet += amount baru    │
   │  3. Update entry & simpan            │
   │  4. Update counterparty.updated_at   │
   └──────────────────────────────────────┘

   ┌───── User tap Delete entry ──────────┐
   │  Konfirmasi → Rollback efek wallet   │
   │  → entry.is_active = false           │
   │  → Recalculate outstanding           │
   │  → Jika outstanding == 0 dan tidak   │
   │    manual_paid_off, status otomatis  │
   │    menjadi 'paid off'                │
   └──────────────────────────────────────┘
```

---

### Flow: Pencocokan Counterparty (Case-Insensitive)

```
User input nama: "  Alma Putri  "
              ↓
   Normalisasi: trim + lowercase → "alma putri"
              ↓
   Cari di localStorage['loan_counterparties']:
     SELECT WHERE LOWER(TRIM(name)) == "alma putri" AND is_active=true
              ↓
   ┌────────────────────────────────────────┐
   │ ↓ DITEMUKAN                            │
   │   Gunakan counterparty existing        │
   │   (TIDAK menimpa nama existing)        │
   │                                        │
   │ ↓ TIDAK DITEMUKAN                      │
   │   Buat counterparty baru               │
   │   name = "Alma Putri" (preserve case)  │
   └────────────────────────────────────────┘
```

---

## 3. Validasi Client-Side

### Validasi Add Give / Get

| Field | Aturan | Pesan Error |
|-------|--------|-------------|
| Date | Wajib diisi | "Tanggal harus dipilih" |
| Time | Wajib diisi | "Waktu harus dipilih" |
| Amount | Wajib diisi | "Nominal tidak boleh kosong" |
| Amount | Numerik & > 0 | "Nominal harus lebih dari 0" |
| Amount | Maksimum `999.999.999.999,99` | "Nominal melebihi batas maksimum" |
| Name | Wajib diisi (kecuali locked dari Loan Detail) | "Nama tidak boleh kosong" |
| Name | 2–50 karakter (setelah trim) | "Nama minimal 2 karakter / maksimal 50 karakter" |
| Wallet | **Wajib dipilih** | "Pilih wallet terlebih dahulu" |
| Note | Opsional, maksimum 255 karakter | "Note maksimal 255 karakter" |

**Catatan:**
- Tidak ada validasi minimum balance untuk Give. Saldo wallet boleh menjadi minus (hanya warning, tidak blocking).
- Untuk Get, tidak ada syarat user harus pernah Give terlebih dahulu (user bebas mencatat menerima uang).

### Validasi Edit Counterparty (Rename)

| Field | Aturan | Pesan Error |
|-------|--------|-------------|
| Name | Wajib diisi | "Nama tidak boleh kosong" |
| Name | 2–50 karakter (setelah trim) | "Nama minimal 2 karakter / maksimal 50 karakter" |
| Name | Tidak boleh sama dengan counterparty lain (case-insensitive, kecuali diri sendiri) | "Nama sudah dipakai counterparty lain" |

---

## 4. Data Modeling (localStorage Schema)

> Loan menggunakan **dua key terpisah** sesuai pola relational DB: `loan_counterparties` (orang) dan `loan_entries` (transaksi).

---

### Key: `loan_counterparties`

**Contoh isi data:**

```json
[
  {
    "id": "cp-a1b2c3d4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Alma",
    "manual_paid_off": false,
    "is_active": true,
    "created_at": "2025-07-02T10:00:00.000Z",
    "updated_at": "2026-04-19T13:55:00.000Z"
  },
  {
    "id": "cp-e5f6g7h8-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Novi",
    "manual_paid_off": true,
    "is_active": true,
    "created_at": "2026-03-10T09:00:00.000Z",
    "updated_at": "2026-04-20T11:00:00.000Z"
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas counterparty |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan |
| `name` | String | Wajib, 2–50 karakter, unik per `anon_id` (case-insensitive) | Nama orang (preserve original capitalization) |
| `manual_paid_off` | Boolean | Default: `false` | Flag manual untuk paid off. Override perhitungan outstanding |
| `is_active` | Boolean | Default: `true` | Soft delete flag |
| `created_at` | String (ISO 8601) | Wajib | |
| `updated_at` | String (ISO 8601) | Wajib | Diupdate setiap ada entry baru / mark as paid / rename |

---

### Key: `loan_entries`

**Contoh isi data:**

```json
[
  {
    "id": "le-x1y2z3w4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "counterparty_id": "cp-a1b2c3d4-...",
    "type": "give",
    "amount": 50000.00,
    "wallet_id": "b3d9e1a2-cc4f-...",
    "note": null,
    "transaction_date": "2025-07-02",
    "transaction_time": "10:00",
    "is_active": true,
    "created_at": "2025-07-02T10:00:00.000Z",
    "updated_at": "2025-07-02T10:00:00.000Z"
  },
  {
    "id": "le-m1n2o3p4-...",
    "anon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "counterparty_id": "cp-a1b2c3d4-...",
    "type": "get",
    "amount": 51000.00,
    "wallet_id": null,
    "note": "Tiket CGV",
    "transaction_date": "2026-01-06",
    "transaction_time": "20:00",
    "is_active": true,
    "created_at": "2026-01-06T20:00:00.000Z",
    "updated_at": "2026-01-06T20:00:00.000Z"
  }
]
```

**Spesifikasi Field:**

| Field | Tipe Data | Constraint | Keterangan |
|-------|-----------|-----------|------------|
| `id` | String (UUID v4) | Wajib, Unik | Identitas entry |
| `anon_id` | String (UUID v4) | Wajib | Penanda kepemilikan |
| `counterparty_id` | String (UUID v4) | Wajib | FK ke `loan_counterparties.id` |
| `type` | String (Enum) | Wajib | `give` atau `get` |
| `amount` | Number (desimal) | Wajib, > 0 | Nominal entry |
| `wallet_id` | String (UUID v4) atau `null` | Opsional | FK ke `wallets.id`. Jika `null`, tidak menyentuh wallet |
| `note` | String atau `null` | Opsional, maksimum 255 karakter | Catatan tambahan. `null` jika kosong |
| `transaction_date` | String (`YYYY-MM-DD`) | Wajib | Tanggal entry |
| `transaction_time` | String (`HH:MM`) | Wajib | Waktu entry |
| `is_active` | Boolean | Default: `true` | Soft delete flag |
| `created_at` | String (ISO 8601) | Wajib | |
| `updated_at` | String (ISO 8601) | Wajib | |

---

### Enum: `loan_entry.type`

| Nilai | Label UI | Warna FAB | Efek Outstanding | Efek Wallet (jika dipilih) | Format Tampilan di List Detail |
|-------|----------|-----------|-----------------|---------------------------|--------------------------------|
| `give` | Give | Merah | `outstanding += amount` | Balance wallet **berkurang** | `{amount}` warna merah (`--color-negative`) |
| `get` | Get | Oranye | `outstanding −= amount` | Balance wallet **bertambah** | `+ {amount}` warna hijau |

---

### Computed Fields per Counterparty

Tiga total agregat yang **tidak disimpan** di localStorage — selalu dihitung ulang dari entries:

```
total_give  = SUM(amount where counterparty_id=X AND type='give' AND is_active=true)
total_get   = SUM(amount where counterparty_id=X AND type='get'  AND is_active=true)
outstanding = total_give − total_get
```

**Status Counterparty (computed):**

```
status =
  IF (manual_paid_off == true) THEN 'paid off'
  ELSE IF (outstanding == 0)   THEN 'paid off'
  ELSE                              'outstanding'
```

**Cara baca outstanding:**

| Hasil | Arti |
|-------|------|
| `outstanding > 0` | Counterparty berhutang ke user. Masuk ke kolom **Get** di Loan List Summary |
| `outstanding < 0` | User berhutang ke counterparty. Masuk ke kolom **Give** di Loan List Summary, ditampilkan sebagai nilai absolut |
| `outstanding == 0` | Saling tutup → status otomatis `paid off` |

---

### Summary Bar di Loan List

```
Total Get  = SUM(outstanding)      untuk counterparty di mana outstanding > 0 AND status != 'paid off'
Total Give = SUM(|outstanding|)    untuk counterparty di mana outstanding < 0 AND status != 'paid off'
Balance    = totalGive − totalGet  (di mana: positif = user rugi netto, negatif = user untung netto)
```

**Tampilan prefix:**

| Kondisi | Get | Give | Balance |
|---------|-----|------|---------|
| totalGet > 0 | `"+ " + formatIDR(totalGet)` | — | — |
| totalGive > 0 | — | `"- " + formatIDR(totalGive)` | — |
| balance < 0 (user untung) | — | — | `"+ " + formatIDR(Math.abs(balance))` hijau |
| balance > 0 (user rugi) | — | — | `"- " + formatIDR(balance)` merah |
| balance == 0 | — | — | `"0"` abu |

Counterparty `paid off` (otomatis maupun manual) **tidak dihitung** di summary.

---

### Summary Bar di Loan Detail (per counterparty)

```
Get        = total_get               (akumulasi seluruh entry Get untuk orang ini)
Give       = total_give              (akumulasi seluruh entry Give untuk orang ini)
Selisih    = outstanding = total_give − total_get
```

**Prefix Balance di Loan Detail:**
```
prefix = outstanding < 0 ? "+ " : outstanding > 0 ? "- " : ""
```
- `outstanding > 0`: merah, prefix `"- "` (counterparty masih berhutang ke user)
- `outstanding < 0`: hijau, prefix `"+ "` (user yang berhutang ke counterparty)
- `outstanding === 0`: abu, tanpa prefix

**Contoh dari UI (Alma):**

| Kolom | Nilai | Penjelasan |
|-------|-------|-----------|
| Get (hijau) | `+ 494.288,00` | Total semua Get yang user terima dari Alma |
| Give (merah) | `499.288,00` | Total semua Give yang user beri ke Alma |
| Balance (merah) | `- 5.000,00` | `499.288 − 494.288 = 5.000` → Alma masih berhutang `5.000,00` ke user, prefix `"- "` |

---

## 5. Frontend State Management

### Screen: Loan List

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `counterparties` | Array of CounterpartyView | `[]` | Daftar counterparty + outstanding & status (computed) |
| `summary.totalGet` | Number | `0` | Total uang yang harus user terima |
| `summary.totalGive` | Number | `0` | Total uang yang harus user lunasi |
| `isLoading` | Boolean | `true` | Skeleton saat true |
| `isFabExpanded` | Boolean | `false` | FAB membuka/tertutup |

---

### Screen: Loan Detail per Orang

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `counterparty` | Counterparty | dari URL param | Data counterparty |
| `entries` | Array of LoanEntry | `[]` | Entries untuk counterparty ini, urut DESC |
| `totalGet` | Number | `0` | Akumulasi Get (computed) |
| `totalGive` | Number | `0` | Akumulasi Give (computed) |
| `outstanding` | Number | `0` | Selisih Give − Get (computed) |
| `status` | `'outstanding' / 'paid off'` | computed | |
| `isLoading` | Boolean | `true` | |
| `isFabExpanded` | Boolean | `false` | FAB di detail |
| `isMarkAsPaidDialogOpen` | Boolean | `false` | Dialog konfirmasi mark as paid |
| `isDeleteDialogOpen` | Boolean | `false` | Dialog konfirmasi hapus counterparty |
| `isEditNameMode` | Boolean | `false` | Mode edit nama counterparty |

---

### Screen: Add Give / Get

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `form.transaction_date` | String (ISO date) | Hari ini | |
| `form.transaction_time` | String (`HH:MM`) | Waktu sekarang | |
| `form.amount` | String | `""` | Raw input |
| `form.name` | String | `""` (atau pre-filled jika dari Loan Detail) | |
| `form.wallet_id` | String / null | `null` | Opsional |
| `form.note` | String | `""` | Opsional |
| `errors` | Object | `{}` | Map error per field |
| `isSubmitting` | Boolean | `false` | Loading state Save |
| `isWalletSheetOpen` | Boolean | `false` | Bottom sheet wallet picker |
| `isNameLocked` | Boolean | `false` | `true` jika navigasi dari Loan Detail (param `counterpartyId` ada) |

---

## 6. Struktur Halaman — Module Loan

| Route | Nama Screen | Keterangan |
|-------|-------------|-----------|
| `/loan` | Loan List | Halaman utama. Root tab Loan |
| `/loan/[counterpartyId]` | Loan Detail per Orang | Riwayat & summary per counterparty |
| `/loan/add/give` | Add Give | Form mencatat memberi uang. Param opsional `?counterpartyId={id}` untuk pre-fill dari detail |
| `/loan/add/get` | Add Get | Form mencatat menerima uang. Param opsional `?counterpartyId={id}` |
| `/loan/[counterpartyId]/edit/[entryId]` | Edit Entry | Edit single entry. Reuse form Add Give/Get dengan: name field locked, **tipe entry (give/get) terkunci dan tidak bisa diubah**, judul header menampilkan "Edit Give" atau "Edit Get" sesuai tipe entry, ada tombol Delete entry. |

---

## 7. Catatan untuk Tim Developer

| Aspek | Catatan |
|-------|---------|
| **Pemisahan Counterparty & Entry** | Loan menggunakan model **2-tabel**: counterparty (orang) + entries (transaksi). Pemisahan ini penting untuk: (a) agregasi outstanding/total per orang, (b) fitur Mark as Paid yang berlaku di level orang, (c) rename counterparty tanpa harus update setiap entry. |
| **Outstanding Selalu Dihitung Ulang** | Outstanding, total_give, dan total_get **tidak disimpan** sebagai field di counterparty. Selalu dihitung on-the-fly dari entries. Mencegah desync data saat ada edit/delete entry. |
| **Pencocokan Nama Case-Insensitive** | Saat user input nama di form: lakukan `LOWER(TRIM(name))` → cari counterparty existing. Jika ada → gunakan. Jika tidak → buat baru dengan nama persis seperti yang user ketik. Misal: "alma" dan "Alma" dianggap sama, tapi nama yang disimpan adalah dari entry pertama. |
| **Re-open Counterparty** | Jika counterparty `manual_paid_off=true`, lalu user tambah entry baru → otomatis reset `manual_paid_off` ke `false`. Status counterparty kembali aktif. |
| **Wallet Wajib di Loan** | Wallet bersifat **WAJIB** di form Give/Get (sama seperti Module Transactions). Validasi error ditampilkan jika wallet tidak dipilih saat submit. `wallet_id` tidak boleh `null` pada entry baru. |
| **Konsistensi Saldo Wallet** | Jika `wallet_id` terisi: Give → `wallet.balance −= amount`, Get → `wallet.balance += amount`. Saat edit/hapus entry yang memiliki `wallet_id`, balance wallet **wajib di-rollback** sebelum operasi baru diaplikasikan. |
| **Edit Entry yang Mengganti Wallet** | Jika user edit entry dari `wallet_id=A` menjadi `wallet_id=B`: rollback ke wallet A, lalu apply ke wallet B. Jika dari ada-wallet menjadi `null` (atau sebaliknya): hanya satu sisi yang di-update. |
| **Delete Counterparty (Cascade)** | Hapus counterparty wajib **soft-delete seluruh entry**-nya juga. Untuk setiap entry yang punya `wallet_id`, lakukan rollback balance wallet sebelum entry di-soft-delete. Operasi ini bersifat atomik secara konseptual — semua sukses atau semua di-rollback. |
| **Loan vs Transactions** | Loan **tidak masuk** ke perhitungan Income/Expenses di Module Transactions. Tapi jika user pilih wallet di entry loan, balance wallet ter-update — sehingga total balance wallet user tetap konsisten dengan kondisi keuangan riil. |
| **Outstanding Negatif** | Mungkin terjadi jika user lebih banyak Get daripada Give (artinya user yang berhutang). Sistem tidak mencegah, ditampilkan di Summary kolom **Give** sebagai nilai absolut. |
| **Soft Delete Pattern** | Entry & counterparty yang dihapus di-flag `is_active=false`. Tidak benar-benar dihapus dari localStorage untuk keperluan audit dan migrasi Fase 2. |
| **Manual Mark as Paid** | Override outstanding. Berguna untuk kasus "utang dimaafkan" atau "lunas dengan barter non-uang". Outstanding tetap dihitung apa adanya, tapi UI menampilkan "Paid off". Jika ada entry baru → flag otomatis reset. |
| **Format Tampilan Tanggal di Detail** | Format locale-aware via `formatDisplayDate(date, useLocale())`. EN: `"Sun, 19 Apr 2026"`. ID: `"Min, 19 Apr 2026"`. Lihat §4.2 Global Architecture. |
| **Auto-open Wallet Picker** | Di form Add Give/Get, bottom sheet wallet picker otomatis terbuka saat komponen pertama kali di-mount (jika belum ada wallet yang dipilih). Tujuan: mempercepat input karena wallet adalah field wajib. Di mode Edit, auto-open tidak berlaku karena `wallet_id` sudah terisi dari data entry yang di-edit. |
| **Edit Entry: Tipe Terkunci** | Saat edit single entry, tipe (`give`/`get`) tidak bisa diubah. Judul header menampilkan "Edit Give" atau "Edit Get" sesuai tipe entry existing. Form yang digunakan identik dengan Add, bedanya: name locked + type locked + ada tombol Delete. |
| **Dead Code: `src/features/loan/`** | Direktori `src/features/loan/` berisi file placeholder kosong (`CounterpartyCard.tsx`, `LoanEntryForm.tsx`, `useLoanActions.ts`) yang tidak digunakan. Implementasi aktual berada di `src/components/loan/` dan file halaman. File-file placeholder ini dapat dihapus. |
| **Note Field Character Counter** | Di form Add/Edit, field Note menampilkan character counter `{length}/255` di pojok kanan bawah sebagai UX hint. Ini tidak mengubah validasi (masih server-validate di `> 255`). |
| **Subtitle "Without explanation"** | Default subtitle saat entry tidak memiliki note. Berlaku baik di Loan List (note dari entry terakhir counterparty) maupun di Loan Detail (note per entry). |
| **Migrasi Fase 2** | Field `anon_id` di counterparty dan entry adalah kunci migrasi. Saat user buat akun, kedua key (`loan_counterparties` & `loan_entries`) dikirim ke backend untuk dipindahkan ke `user_id` baru. |

---

## 8. Asumsi — ✅ RESOLVED (2026-05-01)

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Outstanding negatif di Summary | ✅ **Di kolom Give, nilai absolut** |
| 2 | Edit Counterparty (ikon ✏️) | ✅ Rename nama counterparty |
| 3 | Delete Counterparty (ikon 🗑️) | ✅ Soft-delete semua entries + rollback wallet. Confirmation dialog wajib |
| 4 | Edit single entry via tap | ✅ **Reuse form Add Give/Get**, name locked + **type locked** (tidak bisa ubah give↔get) + Delete. Judul header: "Edit Give" / "Edit Get" |
| 5 | Subtitle "Without explanation" | ✅ Note dari entry **terakhir** counterparty |
| 6 | Format tanggal | ✅ **Locale-aware** — EN: `Sun, 19 Apr 2026` · ID: `Min, 19 Apr 2026`. Via `formatDisplayDate(date, useLocale())` |
| 7 | Saldo minus untuk Give | ✅ **Boleh minus**, konsisten dengan Transactions |
| 8 | Paid off di list | ✅ **Tetap muncul + toggle hide/show** |
| 9 | Format tampilan Get/Give | ✅ Get: `+ {amount}` hijau (`--color-positive`), Give: `{amount}` merah (`--color-negative`) tanpa prefix |
| 10 | Wallet opsional/wajib di Loan | ✅ **WAJIB** — validasi error jika tidak dipilih. Balance display + insufficient warning untuk Give. |
| 11 | Prefix "Lunas" di CounterpartyListItem | ✅ **Warna secondary** (`--text-secondary`), bukan hijau |
| 12 | Prefix symbol di Summary Bar | ✅ Give: `"- "` prefix jika > 0. Balance: `"+"` jika balance < 0 (user untung), `"-"` jika balance > 0 (user rugi) |
| 13 | Wallet name di LoanEntryListItem | ✅ Ditampilkan sebagai baris ke-3 (tertiary color) di detail entry list |

---

---

## 9. Known Implementation Issues (v1.3 — 2026-05-05)

Bagian ini mendokumentasikan **bug yang diketahui** di implementasi saat ini — spec §4 tetap menjadi sumber kebenaran untuk perilaku yang *seharusnya*. Item di bawah perlu diperbaiki di kode.

---

### Bug 1 — Summary Bar Loan List: `summaryGet`/`summaryGive` Terbalik

**File:** `src/app/loan/page.tsx`

**Perilaku kode saat ini:**
```js
if (outstanding > 0) give += outstanding;  // SALAH: harusnya → get
else get += Math.abs(outstanding);          // SALAH: harusnya → give
return { summaryGet: get, summaryGive: give };
```

**Akibat di UI:**
- Kolom **Get** (hijau, `+`) → menampilkan jumlah yang *user owe ke counterparty* (seharusnya di Give/merah)
- Kolom **Give** (merah, `-`) → menampilkan jumlah yang *counterparty owe ke user* (seharusnya di Get/hijau)

**Perilaku yang benar (sesuai §4):**
```js
if (outstanding > 0) get += outstanding;         // counterparty berhutang ke user → Total Get
else give += Math.abs(outstanding);              // user berhutang ke counterparty → Total Give
return { summaryGet: get, summaryGive: give };
```

---

### ~~Bug 2~~ ✅ FIXED — Balance Color & Prefix di `LoanSummaryBar`

**File:** `src/components/loan/LoanSummaryBar.tsx` — diperbaiki 2026-05-05.

Karena `balance = totalGive − totalGet` dan data di-assign sebagai `totalGive = outstanding > 0` (counterparty berhutang ke user), `totalGet = |outstanding < 0|` (user berhutang ke counterparty):
- `balance < 0` → Get > Give → lebih banyak uang masuk → user untung → **hijau, prefix `"+"`**
- `balance > 0` → Give > Get → lebih banyak uang keluar → user rugi → **merah, prefix `"-"`**

```js
// Sekarang sudah benar:
const balancePrefix = balance < 0 ? "+ " : balance > 0 ? "- " : "";
const balanceColor =
  balance === 0 ? "var(--text-secondary)"
  : balance < 0 ? "var(--color-positive)"  // Get > Give → hijau
  : "var(--color-negative)";               // Give > Get → merah
```

Contoh: Get=3.000.000, Give=2.000.000 → balance = −1.000.000 → tampil `"+ 1.000.000,00"` hijau ✓

---

### ~~Bug 3~~ ✅ FIXED — Balance Color di `LoanDetailSummaryBar`

**File:** `src/components/loan/LoanDetailSummaryBar.tsx` — diperbaiki 2026-05-05.

```js
// Sekarang sudah benar:
const balanceColor =
  outstanding === 0 ? "var(--text-secondary)"
  : outstanding > 0 ? "var(--color-negative)"  // counterparty berhutang ke user → merah
  : "var(--color-positive)";                   // user berhutang ke counterparty → hijau
```

---

*— End of Technical Specification: Module Loan (v1.3) —*
*Dokumen terkait: Module Wallet · Module Transactions · Global Architecture · Module Report · Module Settings*
