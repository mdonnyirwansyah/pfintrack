# Changelog

All notable changes to PFinTrack are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.1] — 2026-05-14

### Fixed
- Tombol tour tidak lagi memunculkan tooltip bawaan browser yang mengganggu
- Dialog konfirmasi kini menggunakan elemen `<dialog>` native sehingga lebih accessible di semua perangkat

### Improved
- Navigasi antar tab di halaman Report lebih cepat (tidak reload ulang data)
- Tampilan list Loan dan Wallet lebih responsif saat scroll panjang

---

## [1.0.0] — 2026-04-01

### Added
- Initial release
- Wallet — CRUD, edit saldo manual, riwayat perubahan saldo
- Transaksi — pemasukan / pengeluaran / transfer antar wallet
- Pinjaman — pencatatan give/get, manajemen kontak, deteksi lunas otomatis
- Laporan — tab Realtime / Bulanan / Kustom, donut chart, drill-down kategori
- Pengaturan — ekspor/impor backup, tema, bahasa, data demo
- Product tour — panduan onboarding interaktif
- PWA — dapat diinstall dan digunakan offline

[1.0.1]: https://github.com/mdonnyirwansyah/pfintrack/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mdonnyirwansyah/pfintrack/releases/tag/v1.0.0
