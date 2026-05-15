# FAQ Content Draft — PROP-0005

**Status:** Draft — menunggu review
**Dibuat:** 2026-05-15
**Konteks:** Konten 14 pertanyaan bilingual (id + en) untuk halaman `/settings/faq`.
Setelah disetujui, integrasikan ke `messages/id.json` dan `messages/en.json` di namespace `faq`.

---

## Kategori A: Privasi & Data

### A1
- **Q (id):** Data saya tersimpan di mana?
- **Q (en):** Where is my data stored?
- **A (id):** Semua data keuanganmu — dompet, transaksi, pinjaman — tersimpan langsung di perangkatmu, di penyimpanan lokal browser. PFinTrack tidak punya server dan tidak pernah mengirim datamu ke mana pun. Data kamu, di perangkat kamu, titik.
- **A (en):** All your financial data — wallets, transactions, loans — is stored locally on your device, inside your browser's storage. PFinTrack has no server and never sends your data anywhere. It's yours, on your device, full stop.

---

### A2
- **Q (id):** Apa yang terjadi kalau saya ganti atau kehilangan HP?
- **Q (en):** What happens if I switch phones or lose my device?
- **A (id):** Karena data tersimpan di perangkat, ganti HP tanpa backup = data hilang. Solusinya sederhana: buka Settings → Data & Storage → Export sebelum pindah. File backup-nya bisa kamu simpan ke Google Drive, galeri, atau mana pun. Nanti tinggal import di HP baru.
- **A (en):** Since your data lives on your device, switching phones without a backup means losing it. The fix is simple: go to Settings → Data & Storage → Export before you switch. Save the backup file somewhere safe — Google Drive, your gallery, anywhere. Then import it on your new device.

---

### A3
- **Q (id):** Apakah PFinTrack bisa melihat data keuangan saya?
- **Q (en):** Can PFinTrack see my financial data?
- **A (id):** Tidak. PFinTrack tidak punya akun, tidak ada login, dan tidak ada koneksi ke server apa pun. Data kamu 100% ada di perangkatmu dan tidak bisa diakses siapa pun selain kamu — termasuk tim PFinTrack. Kami bahkan tidak tahu kamu ada.
- **A (en):** No. PFinTrack has no accounts, no login, and no server connection. Your data is 100% on your device and can't be accessed by anyone else — including the PFinTrack team. We don't even know you exist.

---

### A4
- **Q (id):** Bagaimana cara backup dan restore data?
- **Q (en):** How do I back up and restore my data?
- **A (id):** Buka Settings → Data & Storage. Di sana kamu bisa Export data ke file `.json` atau `.gz`, dan Import untuk mengembalikannya. Lakukan backup rutin terutama sebelum ganti HP atau update browser besar.
- **A (en):** Go to Settings → Data & Storage. From there you can Export your data as a `.json` or `.gz` file, and Import to restore it. It's a good habit to back up regularly, especially before switching phones or doing a major browser update.

---

### A5
- **Q (id):** Bagaimana cara hapus semua data saya?
- **Q (en):** How do I delete all my data?
- **A (id):** Buka Settings → Data & Storage → pilih opsi hapus semua data. Ini akan menghapus seluruh dompet, transaksi, dan catatan pinjaman secara permanen. Tidak bisa di-undo, jadi pastikan kamu sudah backup kalau masih butuh datanya.
- **A (en):** Go to Settings → Data & Storage and choose the option to delete all data. This permanently removes all your wallets, transactions, and loan records. It can't be undone, so make sure you've exported a backup first if you might need it later.

---

## Kategori B: Fitur & Cara Kerja

### B1
- **Q (id):** Apa perbedaan Give dan Get di modul Loan?
- **Q (en):** What's the difference between Give and Get in the Loan module?
- **A (id):** Give = kamu yang kasih pinjaman ke orang lain, jadi mereka yang punya utang ke kamu. Get = kamu yang terima uang dari orang itu, bisa berupa pelunasan utang mereka atau kamu yang balik utang ke mereka. Semua dicatat per nama orang biar gampang dipantau.
- **A (en):** Give means you lent money to someone — they owe you. Get means you received money from them — either they're paying you back, or you're the one paying off a debt. Everything is grouped by person so you can track it in one place.

---

### B2
- **Q (id):** Kenapa Transfer tidak masuk sebagai pengeluaran?
- **Q (en):** Why doesn't a Transfer count as an expense?
- **A (id):** Transfer hanya memindahkan uang antar dompetmu sendiri — total kekayaanmu tidak berkurang. Beda dengan pengeluaran yang betul-betul keluar dari kantong. Kalau ditampilkan sebagai pengeluaran, laporan keuanganmu akan kelihatan jelek padahal sebenarnya tidak ada yang berubah.
- **A (en):** A transfer just moves money between your own wallets — your total net worth stays the same. It's different from an expense, where money actually leaves your pocket. Counting it as an expense would make your reports look worse than they actually are.

---

### B3
- **Q (id):** Apa itu "Balance Correction" di daftar transaksi?
- **Q (en):** What is "Balance Correction" in my transaction list?
- **A (id):** Ini catatan otomatis yang muncul saat kamu mengedit saldo dompet secara manual. Misalnya, saldo BCA kamu ubah dari Rp 500.000 jadi Rp 750.000 — PFinTrack akan otomatis mencatat selisih Rp 250.000 sebagai Balance Correction supaya jejak perubahannya tetap terlacak.
- **A (en):** This is an automatic entry that appears when you manually edit a wallet's balance. For example, if you change your BCA balance from Rp 500,000 to Rp 750,000, PFinTrack records the Rp 250,000 difference as a Balance Correction so the change is always traceable.

---

### B4
- **Q (id):** Apa itu Saving Rate dan bagaimana cara menghitungnya?
- **Q (en):** What is Saving Rate and how is it calculated?
- **A (id):** Saving Rate menunjukkan berapa persen dari pemasukanmu yang berhasil kamu simpan dalam suatu periode. Rumusnya: (Pemasukan − Pengeluaran) ÷ Pemasukan × 100%. Kalau pemasukanmu Rp 10 juta dan pengeluaran Rp 7 juta, Saving Rate-mu 30%. Makin tinggi, makin bagus.
- **A (en):** Saving Rate shows what percentage of your income you actually kept during a period. The formula is: (Income − Expenses) ÷ Income × 100%. If your income is Rp 10 million and expenses Rp 7 million, your Saving Rate is 30%. Higher is better.

---

### B5
- **Q (id):** Mengapa saldo dompet bisa bernilai negatif?
- **Q (en):** Why can my wallet balance go negative?
- **A (id):** Ini bisa terjadi kalau kamu mencatat pengeluaran atau pinjaman yang lebih besar dari saldo yang tersedia di dompet itu. PFinTrack tidak memblokir ini karena realitanya memang begitu — bisa saja kartu kredit atau tabunganmu memang minus. Saldo negatif bukan error, itu data yang valid.
- **A (en):** This can happen when you record an expense or loan that exceeds a wallet's available balance. PFinTrack doesn't block it because that's how real life works — credit cards and overdraft accounts can genuinely go negative. A negative balance isn't a glitch, it's valid data.

---

## Kategori C: Teknis & Operasional

### C1
- **Q (id):** Apakah PFinTrack bisa digunakan tanpa koneksi internet?
- **Q (en):** Can I use PFinTrack without an internet connection?
- **A (id):** Ya, sepenuhnya. PFinTrack adalah PWA (Progressive Web App) yang bisa diinstall dan dipakai 100% offline. Semua fitur — catat transaksi, lihat laporan, kelola dompet — tetap jalan tanpa internet. Koneksi hanya diperlukan saat pertama kali membuka app.
- **A (en):** Yes, completely. PFinTrack is a PWA (Progressive Web App) that can be installed and used 100% offline. All features — logging transactions, viewing reports, managing wallets — work without internet. You only need a connection the very first time you open the app.

---

### C2
- **Q (id):** Apa itu "Data Sampel / Demo Mode"?
- **Q (en):** What is "Demo Mode" (Sample Data)?
- **A (id):** Demo Mode mengisi app dengan data contoh — dompet, transaksi, dan pinjaman palsu — supaya kamu bisa eksplorasi semua fitur tanpa harus input data asli dulu. Aktifkan dari Settings, dan hapus kapan saja lewat tombol merah di Settings saat kamu siap mulai dengan data sendiri.
- **A (en):** Demo Mode fills the app with sample data — fake wallets, transactions, and loans — so you can explore all features without entering real data first. Turn it on from Settings, and clear it anytime using the red button in Settings when you're ready to start fresh with your own data.

---

### C3
- **Q (id):** Bagaimana cara memulai ulang tur panduan?
- **Q (en):** How do I restart the guided tour?
- **A (id):** Buka Settings → scroll ke section Help → tap "View Tutorial". Tur akan mulai dari awal dan memandu kamu lewat semua fitur utama lagi. Berguna banget kalau kamu baru saja reset data atau ingin refresh ingatan.
- **A (en):** Go to Settings → scroll to the Help section → tap "View Tutorial". The tour will restart from the beginning and walk you through all the main features again. Handy if you just reset your data or want a quick refresher.

---

### C4
- **Q (id):** Apakah aplikasi ini gratis selamanya?
- **Q (en):** Is this app free forever?
- **A (id):** Ya. PFinTrack gratis sepenuhnya — tidak ada versi premium, tidak ada langganan, tidak ada iklan, tidak ada in-app purchase. Semua fitur yang ada sekarang dan yang akan datang di Fase 1 ini gratis untuk semua orang.
- **A (en):** Yes. PFinTrack is completely free — no premium tier, no subscription, no ads, no in-app purchases. Every feature available now and in future Fase 1 updates is free for everyone.

---

## Catatan untuk Implementasi

- **Istilah yang perlu konsisten dengan glosarium:** "dompet" (bukan "wallet" di teks id), "pemasukan/pengeluaran" (bukan income/expense di teks id), "pinjaman" (bukan loan di teks id kecuali di nama fitur "modul Loan")
- **A2 dan A4** menyebut path "Settings → Data & Storage" — pastikan path ini sesuai label aktual di Settings saat implementasi
- **C3** menyebut path "Settings → Help → View Tutorial" — pastikan sesuai label section Help di Settings
- **B3** menggunakan contoh angka Rp — format sudah ikut locale id-ID (titik ribuan). Di teks EN, formatnya beda (koma ribuan) tapi karena target audience Indonesia, contoh angka di EN sengaja tidak dikonversi agar tidak membingungkan
- **Accordion single-open** sesuai rekomendasi PROP-0005 §7 — tidak ada perubahan rekomendasi ini
- **Open Question §11 terjawab oleh draft ini:** Konten 14 jawaban bilingual sudah tersedia di file ini
