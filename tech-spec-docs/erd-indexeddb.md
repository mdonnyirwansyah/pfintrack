# ERD — IndexedDB Schema (pfintrack_db)

**Database:** `pfintrack_db` (IndexedDB)
**Object Stores:** 6 (`wallets`, `wallet_balance_history`, `transactions`, `loan_counterparties`, `loan_entries`, `custom_reports`)

---

```mermaid
erDiagram
    WALLETS {
        string id PK "e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string name "e.g. BCA Tabungan"
        string wallet_type "e.g. bank"
        number balance "e.g. 5000000"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-01-01T08:00:00.000Z"
        string updated_at "e.g. 2026-05-14T09:30:00.000Z"
    }

    WALLET_BALANCE_HISTORY {
        string id PK "e.g. b2c3d4e5-f6a7-8901-bcde-f12345678901"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string wallet_id FK "e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        number previous_balance "e.g. 4500000"
        number new_balance "e.g. 5000000"
        number delta "e.g. 500000"
        string corrected_at "e.g. 2026-05-14T09:30:00.000Z"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-05-14T09:30:00.000Z"
        string updated_at "e.g. 2026-05-14T09:30:00.000Z"
    }

    TRANSACTIONS {
        string id PK "e.g. c3d4e5f6-a7b8-9012-cdef-123456789012"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string type "e.g. expense"
        string wallet_id FK "e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        string_null destination_wallet_id FK "e.g. e5f6a7b8-c9d0-1234-efab-345678901234"
        number amount "e.g. 150000"
        string_null title "e.g. Makan Siang"
        string_null category "e.g. Food"
        string_null description "e.g. Warteg depan kantor"
        string transaction_date "e.g. 2026-05-14"
        string transaction_time "e.g. 12:30"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-05-14T12:30:00.000Z"
        string updated_at "e.g. 2026-05-14T12:30:00.000Z"
    }

    LOAN_COUNTERPARTIES {
        string id PK "e.g. d4e5f6a7-b8c9-0123-defa-234567890123"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string name "e.g. Budi Santoso"
        boolean manual_paid_off "e.g. false"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-03-01T08:00:00.000Z"
        string updated_at "e.g. 2026-05-14T09:00:00.000Z"
    }

    LOAN_ENTRIES {
        string id PK "e.g. e5f6a7b8-c9d0-1234-efab-345678901234"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string counterparty_id FK "e.g. d4e5f6a7-b8c9-0123-defa-234567890123"
        string type "e.g. give"
        number amount "e.g. 200000"
        string_null wallet_id FK "e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        string_null note "e.g. Pinjam buat bensin"
        string transaction_date "e.g. 2026-05-10"
        string transaction_time "e.g. 09:00"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-05-10T09:00:00.000Z"
        string updated_at "e.g. 2026-05-10T09:00:00.000Z"
    }

    CUSTOM_REPORTS {
        string id PK "e.g. f6a7b8c9-d0e1-2345-fabc-456789012345"
        string anon_id "e.g. f9e8d7c6-b5a4-3210-fedc-ba9876543210"
        string name "e.g. Q1 2026"
        string start_date "e.g. 2026-01-01"
        string end_date "e.g. 2026-03-31"
        boolean is_active "e.g. true"
        string created_at "e.g. 2026-04-01T10:00:00.000Z"
        string updated_at "e.g. 2026-04-01T10:00:00.000Z"
    }

    WALLETS ||--o{ WALLET_BALANCE_HISTORY : "manual edit logs"
    WALLETS ||--o{ TRANSACTIONS : "source wallet"
    WALLETS ||--o{ TRANSACTIONS : "destination wallet (transfer)"
    WALLETS ||--o{ LOAN_ENTRIES : "optional wallet side-effect"
    LOAN_COUNTERPARTIES ||--o{ LOAN_ENTRIES : "has entries"
```

---

## Catatan Relasi

| Relasi | Penjelasan |
|--------|-----------|
| `WALLETS` → `WALLET_BALANCE_HISTORY` | Hanya dicatat saat **manual edit balance** di `/wallet/[id]`. TIDAK pernah ditulis oleh operasi transaksi atau loan (§6.3). |
| `WALLETS` → `TRANSACTIONS` (source) | Setiap transaksi wajib punya sumber wallet. |
| `WALLETS` → `TRANSACTIONS` (destination) | Hanya ada untuk tipe `transfer`. Field `destination_wallet_id` nullable untuk income/expense. |
| `WALLETS` → `LOAN_ENTRIES` | Optional — loan entry boleh tidak terhubung ke wallet (`wallet_id` nullable). |
| `LOAN_COUNTERPARTIES` → `LOAN_ENTRIES` | Cascade soft-delete: jika counterparty dihapus, semua entry-nya ikut `is_active = false`. |
| `CUSTOM_REPORTS` | Berdiri sendiri, tidak ada FK ke object store lain — hanya menyimpan range tanggal untuk filter laporan. |

## Catatan Umum

- Semua record memiliki field universal: `id` (UUID v4), `anon_id`, `is_active`, `created_at`, `updated_at`.
- **Soft delete only** — record tidak pernah dihapus secara fisik. Saat dihapus: set `is_active = false`.
- `localStorage` hanya digunakan untuk flags: `pfintrack_anon_id`, `pfintrack_welcomed`, `tour_completed`, `pfintrack_color_theme`, `storage_version`.
- Semua angka disimpan sebagai JS `Number`, ditampilkan via `Intl.NumberFormat('id-ID')`.
- Semua tanggal disimpan sebagai ISO 8601 string.
