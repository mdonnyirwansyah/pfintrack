# Copy Audit — PFinTrack UI Text
**Tanggal**: 13 Mei 2026  
**Scope**: Semua string user-facing di `messages/id.json`, `messages/en.json`, dan hard-coded text di komponen TSX  
**Status**: Proposal saja — tidak ada file yang diubah

---

## Ringkasan Eksekutif

Total temuan: **62 item**

| Kategori | Jumlah |
|---|---|
| MUST FIX — salah arti / membingungkan / inkonsistensi istilah | 18 |
| MUST FIX — teks hard-coded (bypass i18n) | 8 |
| NICE TO HAVE — tone terlalu formal / kaku | 21 |
| NICE TO HAVE — microcopy bisa lebih ringkas / lebih hidup | 15 |

**Top 3 masalah paling kritis:**
1. Terminologi Loan yang ambigu — "Give/Keluar" vs "Get/Masuk" tidak intuitif, mismatch dengan glosarium yang seharusnya pakai konteks siapa yang melakukan aksi.
2. Hard-coded English text di halaman Offline dan komponen LoanEntryForm yang tidak lewat i18n sama sekali.
3. Empty state "Tidak ada data" di Transactions terlalu generik dan tidak actionable.

---

## MODUL 1 — Transactions

### 1.1 Empty States

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `transactions.noData` | "Tidak ada data" | "Belum ada transaksi hari ini" | "Tidak ada data" terlalu teknis dan tidak kontekstual. Versi saat ini malah sudah ada di `noDataDesc`, tapi `noData` sendiri tetap perlu lebih spesifik. | MUST FIX |
| `transactions.noDataDesc` | "Belum ada transaksi hari ini. Ketuk + untuk menambah." | "Ketuk + buat catat yang pertama." | Title sudah baru bilang "hari ini", desc jangan ulangi. Lebih ringkas, lebih actionable. | NICE TO HAVE |
| `transactions.noHistory` | "Belum ada transaksi" | "Riwayat masih kosong" | Lebih deskriptif konteks History page, bukan halaman utama. | NICE TO HAVE |
| `transactions.noHistoryDesc` | "Tambah transaksi pertama Anda menggunakan tombol +." | "Transaksi yang kamu catat akan muncul di sini." | Pakai "kamu" bukan "Anda". Di History page user tidak bisa langsung tambah via +, jadi instruksi ke tombol + bisa menyesatkan. | MUST FIX |
| `transactions.noResults` | "Tidak ditemukan" | "Hasil pencarian kosong" | Lebih jelas bahwa ini hasil search, bukan error. | NICE TO HAVE |
| `transactions.noResultsDesc` | "Tidak ada transaksi yang sesuai pencarian." | "Coba kata kunci lain atau ubah filter." | Tambah petunjuk apa yang bisa dilakukan, bukan cuma status. | NICE TO HAVE |

### 1.2 Form & Validation

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `transactions.form.titlePlaceholder` | "Masukkan judul (opsional)" | "Nama singkat, misal: Makan siang" | Lebih konkret, user langsung tahu contohnya. | NICE TO HAVE |
| `transactions.form.descriptionPlaceholder` | "Masukkan deskripsi (opsional)" | "Catatan tambahan (opsional)" | "Deskripsi" terasa berat. "Catatan" lebih natural. | NICE TO HAVE |
| `transactions.form.categoryPlaceholder` | "Ketik kategori baru" | "Misal: Makan, Transport, Hiburan" | Placeholder yang kasih contoh jauh lebih helpful dari instruksi generik. | NICE TO HAVE |
| `transactions.validation.walletRequired` | "Pilih dompet terlebih dahulu" | "Dompet belum dipilih nih." | Tone lebih ringan, tidak terasa menggurui. | NICE TO HAVE |
| `transactions.validation.sameWallet` | "Dompet asal dan tujuan tidak boleh sama" | "Dompet asal dan tujuan harus berbeda." | Versi saat ini pakai "tidak boleh" yang terasa melarang — ubah jadi klarifikasi positif. | NICE TO HAVE |
| `transactions.validation.amountInvalid` | "Nominal harus lebih dari 0" | "Nominal harus lebih dari Rp 0." | Tambah "Rp" supaya jelas satuan. | NICE TO HAVE |
| `transactions.form.insufficientBalance` | "Saldo dompet tidak mencukupi" | "Saldo tidak cukup untuk transfer ini." | Lebih spesifik konteksnya (transfer), dan lebih conversational. | NICE TO HAVE |

### 1.3 Konfirmasi & Toast

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `transactions.deleteConfirm.description` | "Transaksi ini akan dihapus dan saldo dompet akan disesuaikan." | "Saldo dompet kamu juga akan ikut dikoreksi." | Lebih ringkas dan pakai "kamu". | NICE TO HAVE |
| `transactions.deleteUndo.message` | "Transaksi dihapus" | "Transaksi dihapus." | Minor: perlu titik untuk konsistensi kalimat. | NICE TO HAVE |

### 1.4 Hard-coded Text (BYPASS I18N)

| Lokasi | Hard-coded Text | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `transactions/page.tsx` (aria-label) | `"Export to Excel"` | Harus masuk i18n, misal `t("exportAriaLabel")` = "Ekspor ke Excel" | Tidak bisa dilokalisasi sama sekali saat ini. | MUST FIX |
| `transactions/page.tsx` (aria-label) | `"Transaction history"` | Masuk i18n = "Riwayat transaksi" | Sama — akses tidak bisa dilokalisasi. | MUST FIX |

### 1.5 Summary Bar Labels

| Key | Current (ID) | Catatan |
|---|---|---|
| `transactions.summary.balance` | "Saldo" | OK — konsisten dengan glosarium. |
| `transactions.summary.income` | "Pemasukan" | OK. |
| `transactions.summary.expenses` | "Pengeluaran" | OK. |

---

## MODUL 2 — Wallet

### 2.1 Empty States & Feedback

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `wallet.noWalletsDesc` | "Tambah dompet pertama Anda menggunakan tombol +." | "Ketuk + buat bikin dompet pertama kamu." | Pakai "kamu" bukan "Anda". "bikin" lebih natural dari "tambah" untuk konteks membuat baru. | MUST FIX |
| `wallet.cannotDeleteInUse` | "Dompet sedang digunakan dalam transaksi/pinjaman dan tidak dapat dihapus." | "Dompet ini masih dipakai di transaksi atau pinjaman, jadi belum bisa dihapus." | Versi saat ini terlalu formal dan slash "/" tidak elegan. | MUST FIX |
| `wallet.deleteConfirm.description` | "Dompet {name} akan dihapus. Tindakan ini tidak dapat dibatalkan." | "Hapus dompet \"{name}\"? Data transaksinya tetap tersimpan, tapi dompetnya tidak bisa dipulihkan." | Versi saat ini menakut-nakuti tanpa memberi konteks bahwa data transaksi aman. | NICE TO HAVE |

### 2.2 Form Labels & Validation

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `wallet.form.namePlaceholder` | "Masukkan nama" | "Misal: BCA, Cash, GoPay" | Contoh spesifik jauh lebih helpful. | NICE TO HAVE |
| `wallet.form.balancePlaceholder` | "Masukkan saldo" | "0" | Placeholder numerik dengan "0" lebih clean untuk field angka. | NICE TO HAVE |
| `wallet.validation.nameRequired` | "Nama dompet tidak boleh kosong" | "Nama dompet belum diisi." | Tone lebih ringan. | NICE TO HAVE |
| `wallet.validation.nameTaken` | "Nama dompet sudah digunakan" | "Nama ini sudah ada, coba nama lain." | Lebih actionable dan tidak menyalahkan. | NICE TO HAVE |
| `wallet.validation.balanceInvalid` | "Saldo harus berupa angka positif" | "Saldo harus angka positif ya." | Lebih santai. | NICE TO HAVE |
| `wallet.validation.balanceExceeds` | "Saldo melebihi batas maksimum" | "Nominal terlalu besar." | Lebih ringkas. | NICE TO HAVE |

### 2.3 Hard-coded Text

| Lokasi | Hard-coded Text | Suggested | Priority |
|---|---|---|---|
| `wallet/page.tsx` (aria-label FAB) | `"Add wallet"` | Masuk i18n — `t("addAriaLabel")` = "Tambah dompet" | MUST FIX |
| `components/loan/LoanEntryForm.tsx` (line 268) | `"Balance: {formatIDR(...)}"` | Masuk i18n — `t("currentBalance")` = "Saldo:" | English di UI berbahasa Indonesia. MUST FIX. |

---

## MODUL 3 — Loan (Pinjaman)

### 3.1 Masalah Terminologi Kritis

Ini area paling bermasalah. Terminologi "Give/Keluar" dan "Get/Masuk" tidak intuitif bagi pengguna awam.

**Konteks masalah:**
- "Give" = kamu kasih pinjam ke orang (piutang kamu) 
- "Get" = kamu terima pinjaman dari orang (utang kamu)
- Di FAB, label yang muncul cuma "Keluar" dan "Masuk" — tanpa konteks siapa subjeknya

**Current confusion:** User bisa salah interpretasi "Masuk" sebagai uang masuk ke kantong mereka (padahal itu berarti mereka BERHUTANG ke orang).

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `nav.loan` | "Pinjaman" | "Pinjam" atau tetap "Pinjaman" | "Pinjaman" ambigu (bisa give atau get). Tapi karena bottom nav punya keterbatasan karakter, tetap "Pinjaman" masih OK. Pertimbangkan tooltip/header yang lebih jelas. | NICE TO HAVE |
| `loan.addGive` | "Tambah Pinjam Keluar" | "Pinjamkan ke Orang" | Lebih jelas siapa yang melakukan aksi. | MUST FIX |
| `loan.addGet` | "Tambah Pinjam Masuk" | "Catat Utang ke Orang" | Jauh lebih jelas. Tidak ada ambiguitas. | MUST FIX |
| `loan.fab.give` | "Keluar" | "Pinjamkan" | Di FAB, "Keluar" bisa disalahartikan sebagai "uang keluar untuk bayar hutang". "Pinjamkan" jauh lebih clear. | MUST FIX |
| `loan.fab.get` | "Masuk" | "Catat Utang" | "Masuk" ambigu. | MUST FIX |
| `loan.summary.give` | "Keluar" | "Dipinjamkan" | Label di Summary Bar untuk total yang dipinjamkan. | MUST FIX |
| `loan.summary.get` | "Masuk" | "Hutang kamu" | Total yang kamu utang ke orang. | MUST FIX |
| `loan.editGive` | "Edit Pinjam Keluar" | "Edit Pinjaman ke Orang" | Konsisten dengan addGive. | MUST FIX |
| `loan.editGet` | "Edit Pinjam Masuk" | "Edit Utang ke Orang" | Konsisten dengan addGet. | MUST FIX |
| `loan.noCounterparties` | "Belum ada rekanan" | "Belum ada catatan pinjam" | "Rekanan" terlalu bisnis/formal. User awam tidak akan tahu artinya. | MUST FIX |
| `loan.noCounterpartiesDesc` | "Ketuk + untuk mencatat pinjam keluar atau masuk" | "Ketuk + untuk catat pinjaman atau utangmu." | Lebih jelas, pakai "kamu". | MUST FIX |
| `loan.counterpartyNotFound` | "Rekanan tidak ditemukan" | "Orang ini tidak ditemukan" | "Rekanan" terlalu formal. | MUST FIX |
| `loan.counterpartyNotFoundDesc` | "Orang ini mungkin telah dihapus." | "Mungkin sudah dihapus sebelumnya." | Lebih ringkas. | NICE TO HAVE |
| `loan.withoutExplanation` | "Tanpa keterangan" | "Tidak ada catatan" | Lebih natural. | NICE TO HAVE |
| `loan.markPaidOffDesc` | "Ini akan menutup semua catatan pinjaman yang belum diselesaikan dengan orang ini. Anda tetap bisa menambah transaksi baru kapan saja." | "Semua catatan pinjaman yang belum lunas dengan orang ini akan ditutup. Kamu tetap bisa tambah catatan baru nanti." | Pakai "kamu", bukan "Anda". Lebih ringkas. | MUST FIX |
| `loan.deleteCounterpartyConfirm.description` | "Semua entri pinjaman untuk {name} juga akan dihapus." | "Semua catatan pinjaman dengan {name} ikut terhapus." | Lebih natural. | NICE TO HAVE |

### 3.2 Form

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `loan.form.saveGive` | "Simpan Keluar" | "Simpan Pinjaman" | "Simpan Keluar" tidak ada di kamus manapun sebagai frase yang masuk akal. | MUST FIX |
| `loan.form.saveGet` | "Simpan Masuk" | "Simpan Utang" | Sama — frasenya tidak natural sama sekali. | MUST FIX |
| `loan.form.clearWallet` | "Hapus" | "Batal pilih" | Di konteks wallet picker, "Hapus" ambigu — bisa dikira hapus dompetnya. | MUST FIX |
| `loan.form.noteOptional` | "Catatan (opsional)" | "Catatan" | Label field. Kalau placeholder juga bilang "(opsional)", jangan dobel di label juga. | NICE TO HAVE |
| `loan.rename.title` | "Ubah Nama" | "Ganti Nama" | "Ganti" lebih conversational. | NICE TO HAVE |
| `loan.validation.walletRequired` | "Pilih dompet terlebih dahulu" | "Pilih dompet dulu ya." | Tone lebih ringan. | NICE TO HAVE |
| `loan.validation.renameTaken` | "Nama sudah dipakai" | "Nama ini sudah ada." | Lebih jelas bahwa itu duplikat nama. | NICE TO HAVE |

### 3.3 Hard-coded Text di LoanEntryForm

| Lokasi | Hard-coded Text | Suggested | Priority |
|---|---|---|---|
| `components/loan/LoanEntryForm.tsx` line 468 | `{t("deleteEntryConfirm.confirm")} Entry` | Jadikan satu key: `t("deleteEntry")` = "Hapus Catatan Ini" | Ini hard-coded mixing i18n + raw string. Tidak bisa dilokalisasi dengan benar. | MUST FIX |
| `components/loan/LoanEntryForm.tsx` line 268 | `"Balance: {formatIDR(...)}"` | Masuk i18n key `wallet.currentBalance` = "Saldo:" | English di form berbahasa Indonesia. | MUST FIX |

---

## MODUL 4 — Report (Laporan)

### 4.1 Tab Labels

| Key | Current (ID) | Catatan |
|---|---|---|
| `report.tabs.realtime` | "Realtime" | Flag: kata bahasa Inggris di antara label bahasa Indonesia. Pertimbangkan "Sekarang" atau "Langsung". NICE TO HAVE. |
| `report.tabs.monthly` | "Bulanan" | OK. |
| `report.tabs.custom` | "Kustom" | OK — "Kustom" sudah lazim di produk Indonesia. |

### 4.2 Empty States

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `report.realtime.noExpenses` | "Tidak ada pengeluaran bulan ini" | "Belum ada pengeluaran bulan ini" | "Belum ada" lebih optimistis dan akurat (bisa berubah). | NICE TO HAVE |
| `report.realtime.noExpensesDesc` | "Transaksi yang ditandai sebagai pengeluaran akan muncul di sini." | "Transaksi pengeluaran kamu akan tampil di sini." | Lebih ringkas dan pakai "kamu". | NICE TO HAVE |
| `report.realtime.noIncome` | "Tidak ada pemasukan periode ini" | "Belum ada pemasukan periode ini" | Sama — "belum ada" lebih baik. | NICE TO HAVE |
| `report.custom.noReports` | "Belum ada laporan kustom" | "Belum ada laporan buatanmu" | Lebih manusiawi, sesuai glosarium "laporan bikinan kamu". | NICE TO HAVE |
| `report.custom.noReportsDesc` | "Ketuk + untuk membuat laporan untuk rentang tanggal apa pun." | "Ketuk + buat laporan dengan rentang tanggal sendiri." | Lebih ringkas, aktif voice. | NICE TO HAVE |
| `report.monthly.noTransactionsDesc` | "Tambah transaksi pertama Anda untuk melihat laporan bulanan." | "Catat transaksimu dulu, laporan bulanan akan muncul sendiri." | Pakai "kamu". Sedikit lebih fun. | NICE TO HAVE |

### 4.3 Summary & Labels

| Key | Current (ID) | Catatan | Priority |
|---|---|---|---|
| `report.loanSummary.receivable` | "Piutang" | OK — sesuai glosarium formal. Tapi pertimbangkan "Dipinjamkan" untuk konsistensi dengan loan module. NICE TO HAVE. | |
| `report.loanSummary.payable` | "Hutang" | OK — tapi perhatikan ejaan baku "Utang" (bukan "Hutang"). Ini typo minor. | MUST FIX |
| `report.loanSummary.empty` | "Tidak ada pinjaman aktif" | "Semua lunas!" | Lebih positif dan manusiawi — empty state yang fun. | NICE TO HAVE |
| `report.netWorth.insufficient` | "Butuh minimal 2 bulan data" | "Perlu minimal 2 bulan data untuk tampil." | Lebih jelas. | NICE TO HAVE |
| `report.savingRate.benchmark` | "Target sehat: ≥ 20%" | "Target ideal: tabung ≥ 20% penghasilan" | Lebih informatif, user langsung paham konteks apa yang dimaksud "20%". | NICE TO HAVE |

### 4.4 Insight Card Messages

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `report.insight.lowSavingRate` | "Pengeluaran bulan ini melebihi 90% penghasilan" | "Pengeluaranmu sudah di atas 90% pemasukan bulan ini." | Pakai "kamu" (possessive). Lebih personal. | NICE TO HAVE |
| `report.insight.noIncome` | "Belum ada pemasukan bulan ini" | "Belum catat pemasukan bulan ini." | Lebih actionable — mengisyaratkan bahwa ini bisa diubah. | NICE TO HAVE |
| `report.insight.expenseDown` | "Pengeluaran turun {percent}% — lebih hemat dari bulan lalu" | "Pengeluaranmu turun {percent}% dari bulan lalu. Mantap!" | Pakai "kamu" dan tambah validasi positif ringan. | NICE TO HAVE |

### 4.5 Detail Page

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `report.detail.loanGive` | "Pinjam Keluar" | "Dipinjamkan" | Konsisten dengan saran perbaikan loan module. | MUST FIX |
| `report.detail.loanGet` | "Pinjam Masuk" | "Utang Diterima" | Lebih jelas. | MUST FIX |
| `report.detail.noTransactionsDesc` | `"Tidak ada transaksi pengeluaran untuk \"{category}\"."` | `"Belum ada pengeluaran di kategori \"{category}\"."` | "Belum ada" lebih akurat. | NICE TO HAVE |

---

## MODUL 5 — Settings (Pengaturan)

### 5.1 Data & Storage

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `settings.data.persistTitle` | "Penyimpanan Terlindungi" | "Data Terlindungi" | Lebih simpel. "Penyimpanan" teknis. | NICE TO HAVE |
| `settings.data.persistDesc` | "Data terlindungi dari pembersihan otomatis browser" | "Data kamu aman dari pembersihan otomatis browser." | Pakai "kamu". | NICE TO HAVE |
| `settings.data.persistNotGranted` | "Belum terlindungi — ketuk untuk meminta izin" | "Belum aktif. Ketuk untuk mengaktifkan." | Lebih ringkas dan tidak teknis. | NICE TO HAVE |
| `settings.data.importConfirmDesc` | "Semua data saat ini akan diganti permanen dengan isi file backup. Tindakan ini tidak bisa dibatalkan." | "Data kamu sekarang akan diganti total dengan isi file backup. Tidak bisa dibatalkan." | Lebih ringkas, pakai "kamu". | NICE TO HAVE |
| `settings.data.deleteAllDesc` | "Ini akan menghapus permanen semua dompet, transaksi, pinjaman, dan laporan. Tindakan ini tidak bisa dibatalkan." | "Semua dompet, transaksi, pinjaman, dan laporan akan dihapus permanen. Tidak bisa dibatalkan." | Hilangkan "Ini akan" yang pasif. | NICE TO HAVE |
| `settings.data.deleteAllSuccess` | "Semua data telah dihapus" | "Semua data sudah dihapus." | Gaya aktif, titik konsisten. | NICE TO HAVE |
| `settings.data.importSuccess` | "Data berhasil dipulihkan" | "Data berhasil dipulihkan." | Titik untuk konsistensi kalimat. | NICE TO HAVE |
| `settings.data.importError` | "Gagal memulihkan: file tidak valid atau tidak didukung" | "Gagal. File tidak valid atau tidak didukung." | Lebih mudah dibaca — pisah kalimatnya. | NICE TO HAVE |

### 5.2 Demo Section

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `demo.banner.message` | "Anda sedang mengeksplorasi data sampel." | "Kamu lagi lihat data contoh." | Pakai "kamu", tidak perlu "sedang mengeksplorasi" yang berat. | MUST FIX |
| `demo.welcome.description` | "Mulai catat keuanganmu dari nol, atau jelajahi fitur aplikasi dengan data sampel realistis terlebih dahulu." | "Mau langsung mulai atau lihat-lihat dulu dengan data contoh?" | Lebih ringkas, conversational, tidak perlu "realistis terlebih dahulu". | NICE TO HAVE |
| `demo.welcome.exploreButton` | "Eksplorasi dengan Data Sampel" | "Coba dengan Data Contoh" | "Eksplorasi" terlalu panjang untuk button. "Coba" lebih fun dan singkat. | NICE TO HAVE |
| `demo.welcome.startFreshButton` | "Mulai dari Nol" | "Mulai Sendiri" | "Dari Nol" terasa agak berat. "Mulai Sendiri" lebih positif. | NICE TO HAVE |
| `settings.demo.clearDesc` | "Hapus semua data demo dan mulai dari nol" | "Hapus data contoh dan mulai dari awal." | Pakai "data contoh" konsisten, bukan "demo". | NICE TO HAVE |

### 5.3 Report Visibility Labels

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `settings.report.showSavingRateCard` | "Kartu Saving Rate" | "Kartu Tingkat Tabungan" | "Saving Rate" adalah English di antara teks Indonesia. Padahal di report sudah ada terjemahan "Tingkat Menabung". Inkonsistensi. | MUST FIX |
| `settings.report.showLoanOutstanding` | "Seksi pinjaman" | "Bagian pinjaman aktif" | "Seksi" adalah Indonesiasasi canggung dari "section". Pakai "Bagian". | MUST FIX |
| `settings.report.showInsightCard` | "Insight pengeluaran" | "Kartu insight pengeluaran" | Lebih lengkap, konsisten dengan "Kartu Tingkat Tabungan" di atas. | NICE TO HAVE |
| `settings.report.visibilitySettings` | "Visibilitas seksi" | "Tampilkan atau sembunyikan bagian" | "Visibilitas seksi" adalah bahasa terjemahan langsung yang tidak natural. | MUST FIX |

### 5.4 Hard-coded Text di Settings

| Lokasi | Hard-coded Text | Suggested | Priority |
|---|---|---|---|
| `settings/page.tsx` line 537 | `"Bantuan"` (section header) | Masuk i18n — `t("help")` = "Bantuan" | Konsistensi — semua section header lain sudah via i18n. | MUST FIX |
| `settings/page.tsx` line 552 | `"Lihat Tutorial"` | Masuk i18n — `t("viewTutorial")` = "Lihat Tutorial" | Sama — harus i18n. EN: "View Tutorial". | MUST FIX |

---

## MODUL 6 — Halaman Offline (`~offline/page.tsx`)

Seluruh halaman ini tidak pakai i18n sama sekali. Semua teks hard-coded dalam bahasa Inggris.

| Lokasi | Current | Suggested (ID) | Priority |
|---|---|---|---|
| Heading | "You're offline" | "Kamu sedang offline" | MUST FIX |
| Description | "Cached pages are still accessible below." | "Halaman yang tersimpan masih bisa dibuka." | MUST FIX |
| Button | "Retry" | "Coba Lagi" | MUST FIX |
| Module labels | "Transactions", "Wallet", "Loan", "Report", "Settings" | Harus gunakan sama dengan `nav.*` keys dari i18n | MUST FIX |

**Catatan**: Karena ini PWA offline page, kemungkinan besar locale tidak tersedia saat offline. Solusi: hard-code dalam ID saja karena ID adalah default locale, atau gunakan fallback string ID.

---

## MODUL 7 — Tour / Onboarding

### 7.1 Tour Steps

| Key | Current (ID) | Issue | Priority |
|---|---|---|---|
| `tour.steps.wl1` | "Wallet adalah rekening atau dompetmu. Semua transaksi terhubung ke wallet. Tap tab ini untuk melanjutkan." | Mixing "wallet" (EN) dengan "dompet" (ID) dalam satu kalimat. Pilih satu: pakai "Dompet" konsisten. | MUST FIX |
| `tour.steps.ln2` | "'Masuk': kamu berhutang ke orang atau orang melunasi piutangnya ke kamu. 'Keluar': kamu meminjamkan uang ke orang atau kamu melunasi hutangmu." | Penjelasan ini membingungkan. "Masuk" dan "Keluar" adalah label yang sudah problematis (lihat §3.1). Jika label diubah, step ini harus ikut berubah. | MUST FIX |
| `tour.steps.end` | "Selesai! Kamu sudah mengenal fitur utama PFinTrack. Mulai catat keuanganmu sekarang." | OK tapi "Mulai catat keuanganmu sekarang" terasa instruksi. Bisa lebih fun: "Selesai! Sekarang kamu udah kenal PFinTrack. Yuk mulai catat!" | NICE TO HAVE |

### 7.2 Skip Dialog

| Key | Current (ID) | Suggested (ID) | Alasan | Priority |
|---|---|---|---|---|
| `tour.skipTitle` | "Lewati bagian {module}?" | "Lewati bagian {module}?" | OK. |  |
| `tour.skipDescription` | "Kamu belum membuka tab {module}. Lewati bagian ini dan lanjut ke modul berikutnya?" | "Tab {module} belum dibuka. Mau langsung lanjut ke bagian berikutnya?" | Lebih ringkas. | NICE TO HAVE |
| `tour.backToTour` | "Kembali ke Tour" | "Balik ke Tour" | "Balik" lebih casual, sesuai tone. Atau tetap "Kembali" untuk konsistensi dengan `common.back`. | NICE TO HAVE |

---

## MODUL 8 — Shared Components

### 8.1 ConfirmDialog Default Labels

| Lokasi | Current | Issue | Priority |
|---|---|---|---|
| `ConfirmDialog.tsx` props default | `confirmLabel = "Confirm"`, `cancelLabel = "Cancel"` | Default dalam bahasa Inggris. Kalau locale ID aktif dan ada komponen yang lupa pass label, ini akan muncul dalam EN. | MUST FIX |

**Suggested fix**: Default harus ambil dari i18n (`t("common.confirm")`, `t("common.cancel")`), bukan hard-coded string.

### 8.2 InsightCard Dismiss Button

| Lokasi | Current | Issue | Priority |
|---|---|---|---|
| `InsightCard.tsx` | `aria-label="Dismiss"` | Hard-coded EN. Harus i18n. | MUST FIX |

### 8.3 SplashScreen Tagline

| Key | Current (ID) | Current (EN) | Catatan |
|---|---|---|---|
| `splash.tagline` | "Pelacak Keuangan Pribadi" | "Personal Finance Tracker" | OK — akurat. Bisa lebih punchy: "Keuanganmu, dalam genggaman." tapi ini opini. NICE TO HAVE. |

---

## INKONSISTENSI YANG PERLU DISERAGAMKAN

### A. "Anda" vs "kamu"

File `messages/id.json` masih memakai "Anda" di beberapa tempat padahal gaya yang ditetapkan adalah "kamu":

- `wallet.noWalletsDesc` — "Tambah dompet pertama **Anda**"
- `transactions.noHistoryDesc` — "Tambah transaksi pertama **Anda**"
- `report.monthly.noTransactionsDesc` — "Tambah transaksi pertama **Anda**"
- `loan.markPaidOffDesc` — "**Anda** tetap bisa menambah"
- `demo.banner.message` — "**Anda** sedang mengeksplorasi"

Semua harus diganti ke "kamu".

### B. Ejaan "Hutang" vs "Utang"

- `report.loanSummary.payable` menggunakan "Hutang" — ejaan baku adalah "Utang" (KBBI).
- Cek juga `loan.markPaidOffDesc` ("melunasi **hutang**mu") — harus "utangmu".

### C. Mixing Bahasa di Satu Konteks

- Tour step `wl1`: "Wallet adalah rekening atau dompetmu. Semua transaksi terhubung ke **wallet**." — pakai konsisten satu istilah.
- `settings.report.showSavingRateCard`: "Kartu **Saving Rate**" — pakai "Tingkat Tabungan".
- `settings.report.showLoanOutstanding`: "**Seksi** pinjaman" — pakai "Bagian".

### D. Inkonsistensi Label Loan di Berbagai Konteks

| Konteks | Label Saat Ini | Seharusnya Konsisten |
|---|---|---|
| FAB label | "Keluar" / "Masuk" | "Pinjamkan" / "Catat Utang" |
| Summary bar | "Keluar" / "Masuk" | "Dipinjamkan" / "Utangku" |
| Form save button | "Simpan Keluar" / "Simpan Masuk" | "Simpan Pinjaman" / "Simpan Utang" |
| Page title | "Tambah Pinjam Keluar" / "Tambah Pinjam Masuk" | "Pinjamkan ke Orang" / "Catat Utang ke Orang" |
| Report detail | "Pinjam Keluar" / "Pinjam Masuk" | "Dipinjamkan" / "Utang Diterima" |

### E. Inkonsistensi "data sampel" vs "data demo" vs "data contoh"

- `settings.demo.sectionTitle`: "Data Sampel"
- `demo.banner.message`: "data sampel"
- `settings.demo.clearDesc`: "data demo"
- Saran: seragamkan jadi "data contoh" (paling natural) atau "data sampel" (sudah banyak dipakai). Hindari "data demo".

---

## ENGLISH VERSION — AUDIT SINGKAT

Mayoritas EN copy sudah OK. Beberapa catatan:

| Key | Current (EN) | Suggested (EN) | Priority |
|---|---|---|---|
| `transactions.noData` | "There is no data" | "Nothing here yet" | Lebih natural. "There is no data" terasa seperti error database. | NICE TO HAVE |
| `loan.addGive` | "Add Give" | "Lend to Someone" | "Add Give" is grammatically awkward. | MUST FIX |
| `loan.addGet` | "Add Get" | "Record a Debt" | Same issue. | MUST FIX |
| `loan.fab.give` | "Give" | "Lend" | More natural verb for the action. | MUST FIX |
| `loan.fab.get` | "Get" | "Borrow" | More natural. | MUST FIX |
| `loan.form.saveGive` | "Save Give" | "Save Loan" | "Save Give" is not idiomatic English. | MUST FIX |
| `loan.form.saveGet` | "Save Get" | "Save Debt" | Same. | MUST FIX |
| `loan.noCounterparties` | "No counterparties yet" | "No records yet" | "Counterparty" is financial jargon. | MUST FIX |
| `loan.noCounterpartiesDesc` | "Tap + to record a Give or Get loan" | "Tap + to record a loan or debt." | Cleaner. | MUST FIX |
| `settings.report.showLoanOutstanding` | "Loan section" | "Active loans section" | More specific. | NICE TO HAVE |
| `settings.report.visibilitySettings` | "Section visibility" | "Show or hide sections" | More action-oriented. | NICE TO HAVE |
| `report.tabs.realtime` | "Realtime" | "Live" | Shorter, more modern. | NICE TO HAVE |
| `demo.banner.message` | "You are exploring sample data." | "You're viewing sample data." | Contraction is friendlier. | NICE TO HAVE |
| `loan.summary.get` | "Get" | "Owed" | Clearer financial meaning. | MUST FIX |
| `loan.summary.give` | "Give" | "Lent" | Clearer. | MUST FIX |

---

## PRIORITAS IMPLEMENTASI

### Fase 1 — Must Fix (blok kualitas)
1. Semua hard-coded text yang tidak lewat i18n (Offline page, LoanEntryForm "Balance:", aria-labels)
2. Terminologi Loan yang ambigu ("Give/Keluar" → "Pinjamkan", "Get/Masuk" → "Catat Utang")
3. "Anda" → "kamu" di seluruh `messages/id.json`
4. Ejaan "Hutang" → "Utang"
5. ConfirmDialog default labels (EN fallback)
6. `settings.report.showSavingRateCard` → hilangkan "Saving Rate" — pakai "Tingkat Tabungan"
7. `settings.report.visibilitySettings` → "Tampilkan atau sembunyikan bagian"
8. `settings.report.showLoanOutstanding` → "Bagian pinjaman aktif"

### Fase 2 — Nice to Have (polish)
1. Empty state descriptions yang lebih actionable
2. Validation error messages yang lebih ringan
3. Tour step `wl1` — seragamkan "wallet" vs "dompet"
4. Demo section copy yang lebih fun
5. Insight card messages yang lebih personal
6. EN version: "realtime" → "Live", "you are" → "you're"
