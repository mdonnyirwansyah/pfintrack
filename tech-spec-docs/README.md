# Personal Finance Manager — Technical Specification

**Status:** Final
**Tanggal Finalisasi:** 2026-05-01
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

## Tentang Dokumentasi Ini

Dokumentasi ini adalah **technical specification** lengkap untuk aplikasi Personal Finance Manager. Setiap modul dipisah ke file terpisah agar tim developer bisa fokus pada bagian yang sedang dikerjakan, dengan satu dokumen induk (Global Architecture) sebagai referensi lintas-modul.

---

## Struktur Dokumen

| # | Dokumen | Deskripsi | File |
|---|---------|-----------|------|
| 1 | **Global Architecture** | Spesifikasi induk: stack, route map, layout shell (header, bottom nav, FAB, dialog), standar lintas-modul (warna, format, validasi), inventaris localStorage, hubungan antar modul, rencana migrasi Fase 2. **Wajib dibaca pertama**. | `tech-spec-global-architecture.md` |
| 2 | **Module Wallet** | Daftar wallet, tambah/edit wallet, manajemen balance manual, pencatatan riwayat perubahan balance untuk Balance Correction Report. | `tech-spec-module-wallet.md` |
| 3 | **Module Transactions** | Pencatatan income, expense, transfer antar wallet. Suggestion chips dari history, search, export Excel, navigasi tanggal. | `tech-spec-module-transactions.md` |
| 4 | **Module Loan** | Utang-piutang antar pribadi (give & get). Counterparty management, status paid off (auto & manual), integrasi opsional dengan wallet. | `tech-spec-module-loan.md` |
| 5 | **Module Report** | Laporan keuangan: Realtime (bulan berjalan), Monthly (per bulan), Custom (range buatan user). Donut chart kategori expense, summary multi-baris (Expenses, Income, Balance, Loan, Balance Correction). | `tech-spec-module-report.md` |

---

## Urutan Baca yang Disarankan

Untuk developer yang baru bergabung:

1. **Global Architecture** — pahami konteks aplikasi, stack teknologi, komponen shared, dan filosofi desain
2. **Module Wallet** — fondasi data (semua transaksi & loan terhubung ke wallet)
3. **Module Transactions** — pencatatan utama keuangan
4. **Module Loan** — pencatatan utang-piutang
5. **Module Report** — modul agregat yang membaca data dari semua modul di atas

Untuk developer yang spesialisasi pada satu modul:
1. **Global Architecture** (selalu wajib)
2. Dokumen modul yang relevan
3. Skim modul lain yang berhubungan (lihat tabel Producer–Consumer di Bagian 6 Global Architecture)

---

## Ringkasan Aplikasi

### Apa yang Dibangun

Aplikasi web mobile-first untuk mengelola keuangan pribadi, fitur utama:

- **Multi-wallet** — pengguna bisa punya banyak wallet (bank, e-wallet, investasi, tabungan, aset digital, dll)
- **Pencatatan transaksi** — income, expense, transfer antar wallet
- **Utang-piutang** — pencatatan loan dengan teman/keluarga, dengan auto-offset & paid off
- **Laporan keuangan** — realtime, per bulan, dan custom range, dengan visualisasi donut chart kategori expense

### Arsitektur Fase 1

- **Frontend-only**, tidak ada backend
- Semua data di **`localStorage`** browser
- Pengguna anonim, diidentifikasi via UUID v4 di key `anon_id`
- Struktur data dirancang **migration-ready** ke Fase 2 (backend + akun)

### Total Halaman: 18 routes

Tersebar di 4 modul utama. Detail di Global Architecture Bagian 2.2.

### Total Key di localStorage: 7 keys

| Key | Pemilik |
|-----|---------|
| `anon_id` | Global |
| `wallets` | Wallet |
| `wallet_balance_history` | Wallet |
| `transactions` | Transactions |
| `loan_counterparties` | Loan |
| `loan_entries` | Loan |
| `custom_reports` | Report |

---

## Catatan Final

### Status Asumsi

Setiap dokumen modul memiliki bagian "Asumsi yang Perlu Dikonfirmasi". Konsolidasi seluruh asumsi tersebut ada di **Global Architecture Bagian 10**. Tim diharapkan me-review bagian ini sebelum atau di awal fase development untuk memvalidasi atau menyesuaikan asumsi.

### Modul yang Tidak Termasuk Scope

**Settings module** sudah didiskusikan namun **dikeluarkan dari scope**. Jika di kemudian hari diperlukan, akan dibuat dokumen terpisah.

### Bottom Navigation

Bottom navigation aplikasi terdiri dari **4 tab** (bukan 5 seperti di gambar awal): Transactions · Wallet · Report · Loan. Tab Settings di gambar awal tidak diimplementasikan.

---

## Perubahan dari Iterasi Sebelumnya

Sebelum mencapai versi final ini, dokumentasi mengalami beberapa iterasi:

- **v1 (monolithic)** — semua dijadikan satu dokumen, masih ada code blocks, masih anggap akan ada autentikasi & backend dari awal
- **v2 (modular per modul)** — dokumen mulai dipecah per modul, beralih ke arsitektur anonymous + localStorage
- **v3 (analyst-only, tanpa code)** — semua kode di-strip, fokus pada perspektif system analyst
- **Final** — finalisasi setelah semua modul lengkap dianalisa, ditambah Global Architecture sebagai dokumen induk

---

*— End of README —*
