# Technical Specification Document
## Module: Report

**Aplikasi:** PFinTrack — Personal Finance Tracker
**Versi Dokumen:** 2.1
**Tanggal:** 2026-05-13
**Platform:** Web App · Mobile-First · Next.js (App Router)
**Mode:** Anonymous (No Auth) · Migration-Ready ke Auth

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan Utama |
|-------|---------|----------------|
| **2.1** | **2026-05-13** | **Sinkronisasi: (1) Asumsi #5 diperbarui: ikon ⚙️ di header Report sudah diimplementasikan — navigasi ke `/settings/report` (bukan "tidak diimplementasikan"). (2) Tidak ada perubahan skema data.** |
| 2.0 | 2026-05-07 | Formalisasi PROP-0002: Gelombang 1 (B1 Saving Rate, C1 Income Donut Toggle, A1-beta 6-Month Bar Chart), Gelombang 2 (E1 Daily Bar Chart, C2 Net Worth Line Chart, B2 Insight Card), Gelombang 3 (A2 Category Trend, D1 Loan Aging). Tambah §11 Fitur Analitik Baru, update §1 Tab Realtime dan §2 flow, update §4 kalkulasi (calcCategoryBreakdown signature, savingRate, calcCategoryBreakdownIncome), update §6 route map, update §8 Catatan Developer. Tidak ada perubahan skema data atau localStorage key. |
| 1.4 | 2026-05-05 | Tambah Known Implementation Issues (Bug 1: locale di Add Custom Report, Bug 2: hardcoded string di CustomReportSection). Sinkronisasi DailySummarySection: default mode Calendar, multi-month navigation, Sort pill hanya di mode List. |

---

> **Catatan Scope:**
> Dokumen ini mencakup **Module Report** (laporan keuangan), terdiri dari 4 tampilan utama yang sudah ada:
> Realtime Report, Monthly Report, Custom Report, dan Add/Edit Custom Report —
> ditambah fitur analitik baru dari PROP-0002: Saving Rate, Income Donut Toggle,
> 6-Month Bar Chart, Daily Bar Chart, Net Worth Line Chart, Insight Card,
> Category Trend Drill-down, dan Loan Aging Summary.
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
| 12 | **Donut chart** di Realtime menampilkan dua mode: **Expense by Category** (default) dan **Income by Category** (via toggle). Toggle state disimpan di `sessionStorage` (bukan localStorage) agar tidak melanggar 7-key contract. |
| 13 | **Saving Rate** dihitung on-the-fly dari `income` dan `expenses` yang sudah tersedia — tidak disimpan ke storage. Formula: `((Income − Expenses) / Income) × 100`. Jika Income = 0, tampilkan "N/A". |
| 14 | **6-Month Bar Chart** di tab Monthly adalah section kolapsibel di atas list bulanan — bukan tab baru. Data: 6 bulan terakhir dari hari ini, dihitung via `calcIncome` + `calcExpenses` per bulan. Dimemoize dengan `useMemo([transactions])`. |
| 15 | **Net Worth** per bulan = `calculateMonthlySummary().endBalance` untuk bulan tersebut. Loan cash flow sudah tercakup dalam `endBalance` sesuai formula §4.8. |
| 16 | **Insight Card** dismiss state disimpan ke `sessionStorage` dengan key `"dismissed_insight_{YYYY-MM}"`. Reset setiap sesi baru — bukan data finansial, tidak masuk localStorage. |
| 17 | **Fitur analitik baru** (B1, C1, A1, E1, C2, B2, A2, D1) semuanya **computed-on-the-fly** dari data existing. Tidak ada key IndexedDB/localStorage baru. Tidak ada field baru pada record yang ada. |

---

## 1. UI Component Breakdown

### Screen 1 — Report (`/report`)

> Halaman utama Module Report. Berisi 3 tab yang menampilkan jenis report berbeda.

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Background biru `#2196F3`. Teks "Report" rata tengah, warna putih. Ikon ⚙️ Settings di kanan → shortcut ke `/settings`. |
| **Tab Switcher** | Interaktif | Tiga pill button bersebelahan: **Realtime** · **Monthly** · **Custom**. Tab aktif: background biru, teks putih, shadow `0 2px 8px rgba(91,141,239,0.35), 0 1px 3px rgba(0,0,0,0.12)`. Tab non-aktif: background transparan, teks redup. Container pill mendapat inset shadow: `inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0.5px 1px rgba(0,0,0,0.04)`. |
| **Tab Content** | Dinamis | Konten berubah sesuai tab aktif. Lihat sub-screen di bawah. |
| **Bottom Navigation** | Shared · Statis | 5 tab. Tab **Report** dalam keadaan aktif/biru. *(Komponen shared, lihat Global Architecture.)* |

---

### Tab 1 — Realtime

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Period Label** | Dinamis | Teks rata tengah menampilkan range periode bulan berjalan, format: `01 May 2026 - 31 May 2026`. Otomatis update tiap bulan. |
| **Saving Rate Card** **(BARU di v2.0)** | Dinamis | Card di bawah Period Label. Tampil selalu (bukan hanya jika ada expense). Lihat §SavingRateCard di bawah. |
| **Insight Card** **(BARU di v2.0)** | Dinamis (kondisional) | Card otomatis di bawah Saving Rate Card. Tampil hanya jika ada insight yang applicable — jika tidak ada, tidak ada empty state. Bisa di-dismiss oleh user. Lihat §InsightCard di bawah. |
| **Donut Toggle Pill** **(BARU di v2.0)** | Interaktif | Dua tombol pill di atas donut chart: **"Expense"** (default) · **"Income"**. Toggle aktif: background biru, teks putih. Toggle non-aktif: background transparan, teks redup. Tap target minimal 44×44px. State disimpan ke `sessionStorage["report_donut_mode"]` saat berubah. |
| **Donut Chart (mode Expense)** | Dinamis | Chart melingkar distribusi expense per kategori untuk periode bulan berjalan (perilaku existing — tidak berubah). Hanya menampilkan transaksi tipe `expense` aktif. Transfer wajib dikecualikan. Lihat §DonutChart Enhancements di bawah. |
| **Donut Chart (mode Income)** **(BARU di v2.0)** | Dinamis | Chart melingkar distribusi income per kategori untuk periode bulan berjalan. Hanya menampilkan transaksi tipe `income` aktif. Transfer wajib dikecualikan. Center label: "Total Income" + grand total. Lihat §DonutChart Enhancements di bawah. |
| **Empty State Donut** | Dinamis | Mode Expense: jika tidak ada expense di periode → teks *"Belum ada pengeluaran bulan ini"*. Mode Income **(BARU di v2.0)**: jika tidak ada income → teks *"Belum ada pemasukan bulan ini"*. |
| **Category Legend List** | Dinamis | Daftar kategori di bawah chart. Konten menyesuaikan mode toggle (expense atau income). Setiap baris: color dot + nama kategori + persentase + total nominal. Row aktif mendapat background berwarna tint + outline ring + glowing dot. Urut berdasarkan nominal DESC. |
| **Loan Outstanding Section** **(BARU di v2.0 — Gelombang 3)** | Dinamis (kondisional) | Section di bawah chart, tampil hanya jika ada counterparty dengan `outstanding ≠ 0`. Lihat §LoanOutstandingSection di bawah. |
| **Transaction List** | Dinamis | Selalu tampil di bawah donut chart. Default (tidak ada kategori dipilih): "All Transactions" — semua transaksi sesuai mode toggle aktif (expense atau income), urut tanggal DESC (default). Saat mode Income aktif: menampilkan semua transaksi income bulan berjalan, nominal hijau dengan prefix `+`. Saat kategori dipilih: difilter ke kategori tersebut. Jumlah item di samping header. **Sort control** (SortPill) di kanan header: Newest first (default) · Oldest first · Highest amount · Lowest amount. Semua baris dalam container `.glass` dengan divider. |

**SavingRateCard (BARU di v2.0 — Gelombang 1 / B1):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | `src/components/report/SavingRateCard.tsx` (komponen baru) |
| **Formula** | `savingRate = ((income - expenses) / income) * 100`. Jika `income === 0` → tampilkan `"N/A"` (bukan `0%` atau angka). Jika `expenses > income && income > 0` → negatif, tampilkan sebagai bilangan negatif merah. |
| **Progress bar** | Horizontal, lebar penuh container. Rentang: 0% = kiri, 100% = kanan. Nilai melebihi 100% di-cap di 100% untuk progress bar (angka tetap ditampilkan apa adanya). |
| **Warna progress bar** | `>= 20%` → `var(--color-positive)` · `>= 10% dan < 20%` → `var(--color-accent)` (kuning-oranye) · `< 10%` → `var(--color-negative)` · `N/A` → `var(--bg-secondary)` (abu) |
| **Warna angka** | Mengikuti warna progress bar |
| **Teks benchmark** | Teks kecil di bawah bar (fixed, tidak bisa dikonfigurasi user): *"Target sehat: ≥ 20%"*. i18n key: `report.savingRate.benchmark` |
| **Tampilan angka** | Format persentase: `"38%"` (bukan `"38,00%"` — tidak perlu desimal). Khusus N/A: teks `"N/A"` tanpa satuan. |
| **Baris income/saved** | Di bawah progress bar: teks tertiary `"Income {formatIDR(income)}"` dan `"Saved {formatIDR(income - expenses)}"`. |
| **Interaksi** | Tidak ada (informational only). Tidak navigasi ke halaman lain. |
| **i18n keys yang diperlukan** | `report.savingRate.title`, `report.savingRate.benchmark`, `report.savingRate.na`, `report.savingRate.income`, `report.savingRate.saved` |
| **Backward compatibility** | Tidak ada breaking change — ini adalah komponen baru yang diinsert di bawah Period Label. |

**InsightCard (BARU di v2.0 — Gelombang 2 / B2):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | `src/components/report/InsightCard.tsx` (komponen baru) |
| **Kondisi tampil** | Hanya jika ada satu insight yang applicable (lihat §tabel insight). Jika tidak ada → komponen tidak di-render (bukan empty state). |
| **Dismiss** | Ikon `×` di sudut kanan atas. Tap → card tersembunyi. State dismiss disimpan ke `sessionStorage["dismissed_insight_{YYYY-MM}"]` di mana `YYYY-MM` = bulan berjalan. Reset otomatis tiap awal bulan atau sesi baru (sessionStorage bukan localStorage — tidak melanggar 7-key contract). |
| **Prioritas insight** | Tampilkan hanya **1 insight** paling relevan berdasarkan severity score. Urutan prioritas (tinggi → rendah): anomali kategori naik (1) → saving rate < 10% (2) → satu kategori dominan (3) → pengeluaran turun (4) → tidak ada income (5). |
| **Computational dependency** | Membutuhkan data bulan lalu: `calcExpenses(transactions, lastMonthStart, lastMonthEnd)` dan `calcCategoryBreakdown` untuk bulan lalu. Memoize semua via `useMemo`. |

**Tabel jenis insight yang dihasilkan (B2):**

| Kondisi | Teks Insight | i18n Key |
|---------|-------------|----------|
| Kategori X naik ≥ 30% dari bulan lalu | "Pengeluaran [Kategori] naik [N]% dari bulan [BulanLalu]" | `report.insight.categoryUp` |
| Saving rate < 10% | "Pengeluaran bulan ini melebihi 90% penghasilan" | `report.insight.lowSavingRate` |
| Satu kategori > 50% total expense | "[Kategori] mendominasi [N]% pengeluaranmu" | `report.insight.categoryDominant` |
| Expense bulan ini < bulan lalu (semua kategori gabung) | "Pengeluaran turun [N]% — lebih hemat dari bulan lalu" | `report.insight.expenseDown` |
| Tidak ada income bulan ini | "Belum ada pemasukan bulan ini" | `report.insight.noIncome` |

**Edge case InsightCard:**
- Jika bulan lalu tidak ada data transaksi sama sekali → insight tipe comparison (kategori naik/turun) tidak ditampilkan, fallback ke insight berikutnya yang applicable.
- Threshold kenaikan kategori: `≥ 30%` (hardcoded, tidak bisa dikonfigurasi user di Fase 1).

**DonutChart Enhancements:**

| Aspek | Spesifikasi |
|-------|-------------|
| **Center label (mode Expense)** | Default: "Total" + sum seluruh expense. Saat kategori dipilih: nama kategori + nominalnya, teks berwarna sesuai warna kategori tersebut. |
| **Center label (mode Income) (BARU)** | Default: "Total Income" + sum seluruh income. Saat kategori dipilih: nama kategori + nominalnya. |
| **Segment aktif** | `outerRadius +6`, `innerRadius -2` (segment mengembang). Di belakang segment aktif ditambahkan glow layer: opacity `0.20`, `outerRadius +10`. |
| **Interaksi kategori** | Tap legend/segment → toggle pilih kategori. Tidak navigasi ke halaman lain — list transaksi diperbarui in-place di bawah chart. Saat toggle Expense/Income berubah: `selectedCategory` direset ke `null`. |
| **Transfer exclusion** | Wajib dikecualikan dari KEDUA mode. Filter: `type !== 'transfer'` sebelum agregasi. |

**LoanOutstandingSection (BARU di v2.0 — Gelombang 3 / D1):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | `src/components/report/LoanOutstandingSection.tsx` (komponen baru) |
| **Kondisi tampil** | Hanya jika ada minimal 1 counterparty dengan `outstanding ≠ 0` dan status bukan `paid off`. Jika tidak ada → section tidak di-render sama sekali. |
| **Data source** | `loan_counterparties` (aktif) + `loan_entries` (aktif). Gunakan formula outstanding dari §4.4 Module Loan: `total_give − total_get` per counterparty. |
| **Jumlah ditampilkan** | Maksimum 3 counterparty. Jika lebih dari 3 outstanding → tampilkan 3 teratas (by `Math.abs(outstanding)` DESC) + tombol "Lihat semua ›". |
| **Format baris** | Nama counterparty + outstanding dengan warna dan prefix sesuai konvensi Loan module (merah prefix `"- "` jika outstanding > 0, hijau prefix `"+ "` jika outstanding < 0) + **aging dalam hari** (contoh: `28d`). |
| **Kalkulasi aging** | `agingDays = floor((today - max(transaction_date dari entry outstanding)) / 86400000)`. Aging per counterparty dihitung dari entry aktif terakhir yang berkontribusi pada outstanding — bukan dari `created_at` counterparty. |
| **Tombol "Lihat semua ›"** | Navigate ke `/loan`. Tap target ≥ 44px. |
| **i18n keys** | `report.loanOutstanding.title`, `report.loanOutstanding.viewAll`, `report.loanOutstanding.days` |

---

### Tab 2 — Monthly

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **6-Month Overview Chart** **(BARU di v2.0)** | Dinamis | Section pertama di tab Monthly, di atas list bulanan. Berisi bar chart grouped income/expense untuk 6 bulan terakhir. Lihat §MonthlyOverviewChart di bawah. |
| **Net Worth Trend Chart** **(BARU di v2.0 — Gelombang 2)** | Dinamis | Section kedua di tab Monthly, di bawah 6-Month Overview Chart dan di atas list bulanan. Berisi line chart `endBalance` per bulan selama 12 bulan terakhir. Lihat §NetWorthChart di bawah. |
| **Monthly Section** | Dinamis | Per bulan, ditampilkan satu blok dengan format konsisten (lihat di bawah). Section diurutkan dari bulan terbaru ke belakang. |
| **Section Header** | Statis | Teks rata tengah dengan format range: `01 May 2026 - 31 May 2026`. Tap → drill-down ke detail periode. |
| **Summary Rows** | Dinamis | Daftar baris kunci-nilai untuk bulan tersebut (urut dari atas ke bawah): <br>• **Start Balance** — saldo kumulatif sebelum bulan ini (netral) <br>• *divider* <br>• **Expenses** (merah, prefix `"- "` jika > 0) <br>• **Income** (hijau, prefix `+`) <br>• *divider* (antara Income dan Balance) <br>• **Balance** (hijau/merah/netral, prefix `+`/`-`) <br>• **Loan** (hijau/merah) — tampil hanya jika ada loan_entry aktif di bulan tersebut <br>• **Balance Correction** (hijau/merah) — tampil hanya jika ada perubahan balance wallet di bulan tersebut <br>• *divider* <br>• **Saving Rate** (BARU di v2.0) — `((income - expenses) / income) × 100`. Warna sesuai threshold: hijau ≥ 20%, kuning 10–19%, merah < 10%. Tampil `"N/A"` jika income = 0. Tampil selalu (tidak kondisional). <br>• **End Balance** — `Start Balance + Balance + Balance Correction` (bold, hijau/merah/netral) |
| **Section Chevron** | Interaktif | Ikon `›` di kanan section header. Tap → navigasi ke screen detail breakdown per kategori. |
| **Auto-load (Infinite Scroll)** | Dinamis | Saat user scroll ke bawah, sistem menambahkan section bulan-bulan sebelumnya yang masih punya data. Berhenti otomatis saat sudah mencapai bulan transaksi paling lama. Load awal: 6 bulan. Load tambahan: 6 bulan per scroll. |

**MonthlyOverviewChart (BARU di v2.0 — Gelombang 1 / A1-beta):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | `src/components/report/MonthlyOverviewChart.tsx` (komponen baru) |
| **Library** | Recharts `BarChart` + `Bar` + `ResponsiveContainer` (sudah tersedia sebagai dependency). Tidak perlu dependency baru. |
| **Data** | 6 bulan terakhir dihitung mundur dari bulan berjalan (inklusif). Per bulan: `income = calcIncome(transactions, start, end)`, `expenses = calcExpenses(transactions, start, end)`. |
| **Memoization** | `useMemo` dengan dependency `[transactions]`. Tidak re-compute saat state lain berubah. |
| **Tampilan bar** | Grouped bar per bulan: income (warna `var(--color-positive)`) di kiri, expense (warna `var(--color-negative)`) di kanan. |
| **X-axis** | Label bulan dalam format singkat locale-aware: `"May"` (EN) atau `"Mei"` (ID). Gunakan `date-fns` locale untuk format. |
| **Y-axis** | Tidak ditampilkan (terlalu sempit di 375px). Nilai numerik cukup dari tooltip. |
| **Tooltip** | Muncul saat tap/hover bar. Tampilkan: bulan penuh + income + expense. Format nilai: `formatIDR()`. |
| **Interaksi tap bar** | Tap bar mana saja → navigasi ke `/report/detail?start={YYYY-MM-01}&end={YYYY-MM-akhir}`. |
| **Viewport** | Wajib tidak overflow di 375px / 390px / 430px. Gunakan `<ResponsiveContainer width="100%" height={160}>`. |
| **Empty/partial** | Jika hanya ada 1 bulan data → tampilkan 1 bar. Jika bulan tertentu tidak ada transaksi → nilai 0 (bar tidak muncul, tapi slot X-axis tetap ada). |
| **i18n keys** | `report.monthlyOverview.title` |
| **Posisi di tab** | Di atas seluruh list `MonthlySection`. Di bawah section ini: Net Worth Trend Chart (jika ada), kemudian list bulanan. |

**NetWorthChart (BARU di v2.0 — Gelombang 2 / C2):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | `src/components/report/NetWorthChart.tsx` (komponen baru) |
| **Library** | Recharts `LineChart` + `Line` + `ResponsiveContainer` (sudah tersedia). |
| **Data** | 12 bulan terakhir. Per bulan: `endBalance = calculateMonthlySummary(...).endBalance`. Loan cash flow sudah tercakup dalam `endBalance` — tidak perlu formula terpisah. |
| **Memoization** | `useMemo` dengan dependency `[transactions, loanEntries, balanceHistory]`. |
| **Tampilan garis** | Single line chart. Warna garis: `var(--color-brand)`. Titik (dot) aktif pada hover/tap. |
| **Nilai ringkasan** | Di bawah chart: teks "Sekarang: {formatIDR(endBalanceBulanIni)}" dan "+{formatIDR(delta)} dari {bulanTermawal}" (atau nilai negatif jika turun). |
| **X-axis** | Label bulan singkat locale-aware (sama dengan MonthlyOverviewChart). |
| **Viewport** | `<ResponsiveContainer width="100%" height={120}>`. Tidak overflow di 375px. |
| **Edge case** | Jika hanya 1 bulan data → tampilkan 1 titik, bukan garis. Jika semua bulan `endBalance = 0` → chart tetap ditampilkan dengan garis mendatar di 0. |
| **i18n keys** | `report.netWorth.title`, `report.netWorth.now`, `report.netWorth.from` |

---

### Tab 3 — Custom

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **Custom Report Section** | Dinamis | Per custom report, ditampilkan satu blok serupa dengan Monthly, ditambah **nama** report (mis. "2026", "All Time", "2025") di bagian atas section. |
| **Section Header** | Dinamis | Dua baris rata tengah: <br>• Baris atas: **nama report** (bold) <br>• Baris bawah: range periode `01 Jan 2026 - 31 Dec 2026` |
| **Section Edit Action** | Interaktif | Ikon ✏️ di sudut kanan atas setiap section. Tap → membuka screen Edit Custom Report (rename, ubah range, atau delete). |
| **Section Chevron** | Interaktif | Ikon `›` di kanan section. Tap → navigasi ke screen detail breakdown per kategori untuk periode custom tersebut. |
| **Summary Rows** | Dinamis | **Identik dengan tab Monthly**: Start Balance · Expenses (merah, prefix `"- "` jika > 0) · Income · *divider* · Balance · Loan (opsional) · Balance Correction (opsional) · End Balance. |
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
| **Donut Chart (Expense by Category)** | Dinamis | Sama persis dengan tab Realtime (termasuk DonutChart Enhancements), tetapi data difilter sesuai periode terpilih. |
| **Category Legend List** | Dinamis | Sama dengan Realtime. Tap kategori → toggle pilih, list transaksi di bawah difilter in-place. |
| **Daily Summary Section** | Dinamis | Blok ringkasan per hari, tampil di bawah Donut Chart **jika ada data expense** pada periode tersebut. Lihat DailySummarySection di bawah. |
| **Sort Control** | Interaktif | Pill button di kanan atas transaction list (hanya muncul jika ada expense). Komponen reusable `SortPill`. Opsi: **Newest first** (default) · **Oldest first** · **Highest amount** · **Lowest amount**. |
| **Transaction List** | Dinamis | Tampil di bawah Daily Summary. Default (tidak ada kategori dipilih atau tidak ada param `?category=`): header "All Transactions" + jumlah item + semua expense aktif periode tersebut, diurutkan sesuai `sortKey` aktif. Saat kategori dipilih: header "CategoryName — Transactions" + item count + list difilter ke kategori itu. Setiap baris: judul (atau fallback nama kategori) + "kategori · tanggal" subtitle + nominal negatif. Semua baris dalam container `.glass` dengan divider. |
| **Pre-selected Category** | Dinamis | Halaman ini mendukung param URL `?category=NamaKategori`. Jika ada, list langsung difilter ke kategori tersebut saat mount. |

**DailySummarySection:**

| Aspek | Spesifikasi |
|-------|-------------|
| **Toggle View** | Tiga tombol di kanan header section: **List** · **Calendar** · **Chart** **(BARU di v2.0 — Gelombang 2 / E1)**. **Default: Calendar.** |
| **Mode List** | Daftar hari yang memiliki transaksi pada periode terpilih. Setiap baris: format hari (mis. "Thu, 01 May") + **income hari itu (hijau, `+amount`)** jika ada + **total expense hari itu (merah, `-amount`)** jika ada. **Sort control** (SortPill) tampil di kanan header saat mode list aktif. Default sort: Newest first. |
| **Mode Calendar** | Kalender grid per bulan. Setiap sel: tanggal + **income hari itu (hijau, `+abbr`)** jika ada + **expense hari itu (merah, `-abbr`)** jika ada. Angka disingkat otomatis: `1.200.000 → "1.2M"`, `50.000 → "50K"`. Hari tanpa transaksi: hanya tanggal. Hari di luar bulan saat ini: opacity 0.2. |
| **Mode Chart (BARU di v2.0)** | Bar chart grouped per hari: income (hijau) dan expense (merah). Menggunakan data yang sama dengan Mode List (dari `buildDailySummaries`). Tap bar → scroll ke transaksi hari tersebut di Transaction List di bawah. Lihat §DailyBarChart di bawah. |
| **Multi-month Navigation** | Jika periode mencakup lebih dari satu bulan (custom report): header kalender memiliki tombol `‹` (bulan sebelumnya) dan `›` (bulan berikutnya). Tombol `‹` di-disable pada bulan pertama range, `›` di-disable pada bulan terakhir range. |
| **State `currentMonth`** | Dimulai dari bulan pertama periode (`startOfMonth(start)`). Navigasi prev/next menggunakan `subMonths`/`addMonths` dari `date-fns`. |

**DailyBarChart (BARU di v2.0 — Gelombang 2 / E1):**

| Aspek | Spesifikasi |
|-------|-------------|
| **File** | Diimplementasikan di dalam `DailySummarySection.tsx` sebagai case ketiga pada view toggle. Tidak perlu file komponen baru. |
| **Library** | Recharts `BarChart` grouped. Gunakan data yang sudah dihitung oleh `buildDailySummaries()` — data yang sama dengan Mode List dan Mode Calendar. Tidak ada kalkulasi tambahan. |
| **X-axis** | Label tanggal (angka saja, mis. `"1"`, `"5"`, `"10"`). Jika periode > 20 hari, tampilkan setiap 5 hari agar tidak berdesakan di 375px. |
| **Y-axis** | Tidak ditampilkan (sempit). Nilai via tooltip. |
| **Grouped bar** | Income (kiri, `var(--color-positive)`) dan Expense (kanan, `var(--color-negative)`) per hari. |
| **Tooltip** | Tap/hover: tanggal + income + expense. |
| **Interaksi tap** | Tap bar hari X → scroll ke section hari X di Transaction List di bawah DailySummarySection. Gunakan anchor ID berformat `day-{YYYY-MM-DD}`. |
| **Viewport** | `<ResponsiveContainer width="100%" height={160}>`. Tidak overflow di 375px. |
| **Backward compatibility** | View toggle yang sebelumnya `"list" | "calendar"` diperluas menjadi `"list" | "calendar" | "chart"`. Default tetap `"calendar"`. Tidak ada breaking change. |
| **i18n keys** | `report.daily.chartView` (label tombol toggle Chart) |

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
   Untuk setiap bulan dalam viewport, hitung calculateMonthlySummary():
     1. Start Balance = SUM(income sebelum bulan ini)
                       − SUM(expense sebelum bulan ini)
                       + SUM(wallet_balance_history.delta sebelum bulan ini)
     2. Income       = SUM(amount) where type='income' aktif di bulan itu
     3. Expenses     = SUM(amount) where type='expense' aktif di bulan itu
     4. Balance      = Income − Expenses
     5. Loan         = SUM(get.amount) − SUM(give.amount)
                       dari loan_entries aktif di bulan itu
                       (null / tidak tampil jika tidak ada entry)
     6. Balance Correction = SUM(wallet_balance_history.delta) di bulan itu
                             (null / tidak tampil jika tidak ada)
     7. End Balance  = Start Balance + Balance + (Balance Correction ?? 0)
              ↓
   Render section per bulan (urutan baris: Start Balance → ... → End Balance)
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
   Untuk setiap custom report, hitung calculateMonthlySummary()
   menggunakan filter date range dari report tersebut
   (Start Balance, Income, Expenses, Balance, Loan, Correction, End Balance)
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
   Render donut chart + legend list + DailySummarySection + transaction list
   (UI sama persis dengan tab Realtime, hanya data berbeda)
              ↓
   Header: tampilkan range periode atau nama custom report
              ↓
   Default: "All Transactions" — semua expense aktif periode terpilih
   User tap legend/segment →
     URL param ?category= diperbarui (atau state lokal)
     List difilter ke kategori tersebut in-place
     Header berubah menjadi "CategoryName — Transactions"
```

### Flow: Interaksi Kategori di Tab Realtime

```
User tap segment atau baris legend di tab Realtime
              ↓
   Toggle selectedCategory (set atau reset)
              ↓
   Center label donut diperbarui: nama kategori + nominal (berwarna)
   Segment aktif: mengembang (outerRadius+6, innerRadius-2) + glow layer
   Row legend aktif: tinted background + color outline + glowing dot
              ↓
   Transaction list di bawah chart diperbarui in-place:
     - Kategori dipilih → filter ke kategori tersebut
       Header: "CategoryName — Transactions"
     - Tidak ada pilihan → tampilkan semua expense/income bulan ini
       (sesuai mode toggle aktif)
       Header: "All Transactions"
   (Tidak ada navigasi ke /report/detail)
```

---

### Flow: Toggle Expense/Income di Tab Realtime (BARU di v2.0)

```
User tap toggle "Income" di atas donut chart
              ↓
   State donut_mode = 'income'
   Simpan ke sessionStorage["report_donut_mode"]
              ↓
   selectedCategory direset ke null
              ↓
   Donut chart di-rerender:
     Data: calcCategoryBreakdown(transactions, start, end, 'income')
     Center label: "Total Income" + grand total income
     Legend: kategori income DESC
              ↓
   Transaction list di bawah diperbarui in-place:
     Filter: type='income', is_active=true, periode bulan berjalan
     Nominal: hijau + prefix "+"
              ↓
   Jika tidak ada income → Empty State "Belum ada pemasukan bulan ini"
              ↓
User tap toggle "Expense" (kembali ke default)
              ↓
   State donut_mode = 'expense'
   Simpan ke sessionStorage
   selectedCategory direset ke null
   Donut chart + list kembali ke mode expense (perilaku existing)
```

---

### Flow: Tap Bar di 6-Month Overview Chart (BARU di v2.0)

```
User tap bar bulan "Apr" di MonthlyOverviewChart
              ↓
   Navigasi ke /report/detail?start=2026-04-01&end=2026-04-30
              ↓
   Report detail terbuka (donut chart expense + DailySummarySection + transaction list)
   Perilaku identik dengan drill-down dari Monthly section
```

---

### Flow: Dismiss Insight Card (BARU di v2.0)

```
User melihat InsightCard di tab Realtime
              ↓
   User tap ikon × di kanan atas card
              ↓
   Card tersembunyi (tidak re-render)
   Simpan ke sessionStorage["dismissed_insight_{YYYY-MM}"]
              ↓
   Sesi baru (reload app) atau bulan baru:
     sessionStorage terhapus → card akan muncul lagi jika insight masih applicable
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
| Positif | Warna hijau (`var(--color-positive)`), prefix `+` (mis. `+ 1.500.000,00`) |
| Nol | `0,00` warna netral (`var(--text-primary)`) |
| Negatif | Warna merah (`var(--color-negative)`), prefix `-` (mis. `- 17.000,00`) |

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
- Jika kategori > 8, sisanya digabungkan menjadi *"Lainnya"*.
- Warna segment deterministik per index urutan (bukan per nama kategori).

---

### 4.7 Start Balance

> **Konsep:** Saldo bersih kumulatif user **sebelum** hari pertama periode. Mencerminkan total uang yang dimiliki pada detik sebelum periode dimulai.

```
Start Balance(periode) =
    SUM(income.amount   WHERE transaction_date < periode.start AND is_active=true)
  − SUM(expense.amount  WHERE transaction_date < periode.start AND is_active=true)
  + SUM(wallet_balance_history.delta
        WHERE corrected_at < periode.start AND is_active=true)
```

**Catatan:**
- `wallet_balance_history` mencakup: (1) saldo awal wallet saat dibuat (balance > 0), (2) manual balance correction.
- Transfer tidak ikut dihitung (konsisten dengan aturan Income/Expenses).
- Start Balance bisa negatif jika total expense historis > total income historis.

---

### 4.8 End Balance

```
End Balance(periode) = Start Balance + Balance + (Balance Correction ?? 0)
```

| Hasil | Tampilan |
|-------|----------|
| Positif | Warna hijau (`var(--color-positive)`), prefix `+` |
| Nol | `0` warna netral |
| Negatif | Warna merah (`var(--color-negative)`), prefix `-` |

**Catatan:** End Balance merepresentasikan total uang yang dimiliki user pada hari terakhir periode.

---

### 4.9 Saving Rate (BARU di v2.0)

```
Saving Rate(periode) = ((Income(periode) − Expenses(periode)) / Income(periode)) × 100
```

| Kondisi | Nilai | Tampilan |
|---------|-------|----------|
| `Income > 0 AND (Income - Expenses) >= 0` | Persentase positif | Format: `"38%"`. Warna sesuai threshold. |
| `Income > 0 AND Expenses > Income` | Persentase negatif | Format: `"-12%"`. Warna: `var(--color-negative)`. |
| `Income == 0` | N/A | Tampilkan string `"N/A"`. Tidak ada progress bar (atau bar abu-abu kosong). |

**Threshold warna:**
- `>= 20%` → `var(--color-positive)` (sehat)
- `>= 10% AND < 20%` → `var(--color-accent)` (perhatian)
- `< 10%` (termasuk negatif) → `var(--color-negative)` (boros)

**Benchmark hardcoded:** "Target sehat: ≥ 20%" — tidak bisa dikonfigurasi user di Fase 1.

**Computed dependency:** Menggunakan `income` dan `expenses` dari `calcPeriodSummary()` atau `calculateMonthlySummary()` yang sudah ada. Tidak ada fungsi baru diperlukan untuk menghitung nilai dasar — hanya formula turunan yang diterapkan di komponen.

**Fase 2 note:** Pure derived metric — tidak perlu disimpan ke database.

---

### 4.10 calcCategoryBreakdown — Perluasan Signature (BARU di v2.0)

Fungsi `calcCategoryBreakdown` di `src/lib/report/calculations.ts` diperluas dengan parameter `type` baru:

```ts
export function calcCategoryBreakdown(
  transactions: Transaction[],
  start: string,
  end: string,
  type: "expense" | "income" = "expense"  // DEFAULT tetap "expense" — backward compatible
): CategoryBreakdown[]
```

**Perubahan internal:**
- Filter `t.type === "expense"` diubah menjadi `t.type === type`
- Filter `t.category !== "Balance Correction"` tetap berlaku untuk KEDUA mode
- Transfer (`type === "transfer"`) wajib dikecualikan dari kedua mode

**Backward compatibility:**
- Semua caller existing yang memanggil `calcCategoryBreakdown(transactions, start, end)` tanpa parameter keempat tetap mendapat perilaku expense yang sama karena default `"expense"`.
- Tidak ada breaking change pada call sites yang ada.

**Call sites yang perlu diperbarui:**
- `src/components/report/RealtimeTab.tsx` — tambah state `donutMode` dan teruskan ke fungsi
- `src/app/report/detail/page.tsx` — tetap memanggil default (tidak perlu diubah)

---

### 4.11 Category Trend Calculation (BARU di v2.0 — Gelombang 3 / A2)

Untuk halaman `/report/category`, dihitung data trend 6 bulan per kategori:

```
Untuk setiap bulan dalam 6 bulan terakhir:
  monthTotal[month] = SUM(amount WHERE category=X AND type='expense'
                          AND is_active=true AND transaction_date IN [start, end])
  avgPerMonth       = SUM(monthTotal[*]) / count(bulan dengan monthTotal > 0)
  highestMonth      = month dengan MAX(monthTotal)
  lowestMonth       = month dengan MIN(monthTotal) di mana monthTotal > 0
```

**Computational complexity:** O(6n) — 6 pass filter `O(n)` masing-masing. Dimemoize via `useMemo([transactions, categoryName])`.

---

### 4.12 Net Worth History Calculation (BARU di v2.0 — Gelombang 2 / C2)

```
Untuk setiap bulan dalam 12 bulan terakhir:
  netWorth[month] = calculateMonthlySummary(transactions, loanEntries,
                    balanceHistory, start, end).endBalance
```

**Catatan:** `endBalance` sudah mencakup loan cash flow via formula §4.8. Tidak ada formula terpisah "net worth tanpa loan".

**Computational complexity:** O(12n) — 12 panggilan `calculateMonthlySummary()` masing-masing O(n). Dimemoize via `useMemo([transactions, loanEntries, balanceHistory])`.

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

> Key ini diperlukan untuk perhitungan **Balance Correction** dan **Start Balance** di Report.
> Ditulis dalam dua kasus: (1) saat wallet **pertama dibuat** dengan balance > 0, (2) saat user **mengedit balance** wallet secara manual.
> Didokumentasikan lengkap di Module Wallet v4.1.

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
| `activeTab` | `'realtime' / 'monthly' / 'custom'` | Dari `sessionStorage["report_active_tab"]`, fallback `'realtime'` | Tab aktif saat ini. **Dipersist ke `sessionStorage`** dengan key `"report_active_tab"` saat berubah. Dibaca saat mount. Ini mempertahankan tab aktif saat user navigasi ke detail dan kembali. |
| `isLoading` | Boolean | `true` | Tampilkan skeleton saat true |
| `transactions` | `Transaction[]` | `[]` | Dimuat sekali saat mount **dan juga di-reload setiap kali tab berubah** untuk memastikan data selalu fresh. |
| `loanEntries` | `LoanEntry[]` | `[]` | Sama — reload on tab change |
| `balanceHistory` | `WalletBalanceHistory[]` | `[]` | Sama — reload on tab change |
| `loanCounterparties` **(BARU di v2.0 — Gelombang 3)** | `LoanCounterparty[]` | `[]` | Dimuat untuk Loan Outstanding Section di Realtime tab. Reload on tab change. Hanya digunakan jika LoanOutstandingSection diimplementasikan (Gelombang 3). |

---

### Tab: Realtime

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `period.start` | String (ISO date) | Tanggal 1 bulan ini | |
| `period.end` | String (ISO date) | Tanggal akhir bulan ini | |
| `categoryBreakdown` | Array of `{category, total, percentage, color}` | `[]` | Data untuk chart + legend (expense atau income tergantung `donutMode`) |
| `grandTotal` | Number | `0` | Total expense atau income periode (tergantung `donutMode`) |
| `donutMode` **(BARU di v2.0)** | `'expense' / 'income'` | Dari `sessionStorage["report_donut_mode"]`, fallback `'expense'` | Mode donut chart aktif. Dipersist ke `sessionStorage` saat berubah. |
| `selectedCategory` | String atau `null` | `null` | Kategori yang dipilih di donut. **Direset ke `null` saat `donutMode` berubah.** |
| `insightDismissed` **(BARU di v2.0)** | Boolean | Dari `sessionStorage["dismissed_insight_{YYYY-MM}"]`, fallback `false` | Flag dismiss Insight Card. Baca dari sessionStorage saat mount. |

---

### Tab: Monthly

| State | Tipe | Kondisi Awal | Keterangan |
|-------|------|-------------|------------|
| `monthlyReports` | Array of `MonthlyReportView` | `[]` | List per bulan, di-load progresif |
| `oldestMonth` | String (ISO date) | Detected dari data | Bulan terlama yang punya transaksi |
| `displayedUntil` | String (ISO date) | Bulan ini | Bulan terakhir yang sudah di-render (untuk infinite scroll) |
| `isLoadingMore` | Boolean | `false` | Loader di bawah saat fetch bulan tambahan |

`MonthlyReportView` shape (`MonthlySummary` interface di `calculations.ts`):
```
{
  startBalance: number,
  income: number,
  expenses: number,
  balance: number,
  loan: number | null,
  balanceCorrection: number | null,
  endBalance: number
}
```

Ada juga interface `PeriodSummary` (internal, digunakan oleh `PeriodSummaryRows` component):
```
{
  expenses: number,
  income: number,
  balance: number,
  loan: number | null,
  balanceCorrection: number | null
}
```
`PeriodSummary` adalah subset dari `MonthlySummary` (tanpa startBalance dan endBalance). Digunakan agar `PeriodSummaryRows` bisa di-reuse antara `MonthlySection` dan `CustomReportSection`.

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
| `/report/category?name={CategoryName}` **(BARU di v2.0 — Gelombang 3 / A2)** | Category Trend | Trend 6 bulan per kategori expense. Accessible dari tap nama kategori di donut chart atau legend. Lihat §CategoryTrendScreen di bawah. |

---

**CategoryTrendScreen (BARU di v2.0 — Gelombang 3 / A2):**

> File: `src/app/report/category/page.tsx` (halaman baru)
> Diakses via: `/report/category?name={CategoryName}`

| Komponen | Sifat | Deskripsi Teknis |
|----------|-------|-----------------|
| **App Header** | Statis | Tombol back `‹`. Judul = nama kategori (dari query param `name`). |
| **6-Month Trend Chart** | Dinamis | Bar chart vertikal per bulan (6 bulan terakhir) untuk kategori ini. Hanya tipe `expense`. Warna bar: `var(--color-negative)`. Library: Recharts `BarChart`. `<ResponsiveContainer width="100%" height={160}>`. |
| **Ringkasan Statistik** | Dinamis | Tiga baris di bawah chart: "Rata-rata per bulan: {formatIDR(avg)}" · "Tertinggi: {bulan} ({formatIDR(max)})" · "Terendah: {bulan} ({formatIDR(min)})" — hanya menampilkan bulan yang memiliki data (bukan bulan dengan nilai 0). |
| **Recent Transactions** | Dinamis | Daftar transaksi expense kategori ini, urut DESC by date. Filter: periode bulan berjalan saja (bukan 6 bulan). Format baris: identik dengan transaction list di Realtime Tab. |

**Navigasi ke Category Trend:**
- Dari Realtime Tab: tidak ada navigasi langsung di gelombang 1. Fitur ini Gelombang 3.
- Dari Report Detail (`/report/detail`): tap nama kategori di legend — tambah link ke `/report/category?name={kategori}`.

---

## 8. Catatan untuk Tim Developer

| Aspek | Catatan |
|-------|---------|
| **Read-Only Module** | Module Report **tidak menulis** data transaksi/loan/wallet. Hanya membaca dari modul-modul tersebut + menulis ke `custom_reports`-nya sendiri. |
| **Computed On-The-Fly** | Semua summary (Expenses, Income, Balance, Loan, Balance Correction) dihitung **on-the-fly** saat report dibuka — tidak di-cache di localStorage. Mencegah desync data jika ada edit/delete transaksi di belakang layar. |
| **Performa Monthly** | Untuk user dengan riwayat panjang, render semua bulan sekaligus bisa lambat. Implementasikan **infinite scroll**: load 6 bulan pertama, lalu load tambahan 6 bulan saat user mendekati bawah list. |
| **Performa Custom** | Saat user banyak punya custom report dengan range besar, tiap section membutuhkan iterasi seluruh transaksi. Pertimbangkan **memoization** hasil kalkulasi per range agar tidak dihitung ulang setiap re-render. |
| **Balance Correction & Start Balance Dependency** | Fitur Balance Correction **dan** Start Balance bergantung pada `wallet_balance_history`. Key ini ditulis oleh Module Wallet dalam dua momen: (1) Add Wallet dengan balance > 0, (2) Edit balance wallet manual. Implementasi sudah ada di `useWalletStore`. |
| **Balance Correction Transactions** | Wallet module membuat transaksi income/expense dengan `category:"Balance Correction"` untuk menjaga `wallet.balance` tetap akurat. Transaksi ini **TIDAK dihitung** di Income, Expenses, Balance, dan donut chart (di Transactions dashboard maupun Report). Balance Correction hanya muncul sebagai baris tersendiri di Monthly/Custom summary, bersumber dari `wallet_balance_history`. Ini mencegah double-counting: saldo awal/koreksi wallet sudah tercermin di baris **Balance Correction** dan **Start Balance**, bukan di Income/Expenses. |
| **Transfer Tidak Dihitung** | Konsisten dengan Module Transactions: tipe `transfer` tidak ikut dalam Income, Expenses, atau Balance. Transfer adalah pemindahan dana internal user, bukan arus keluar/masuk. |
| **Loan vs Income/Expense** | Loan **terpisah** dari Income/Expense. Walaupun Get terlihat seperti income dan Give seperti expense, mereka tidak masuk perhitungan Income/Expense — hanya muncul di baris Loan tersendiri. Ini agar laporan rutin (gaji, belanja) tidak bercampur dengan utang-piutang. |
| **Empty Section** | Jika sebuah bulan tidak punya transaksi & loan & balance correction sama sekali → bulan itu **tidak perlu di-render** di tab Monthly. |
| **Format Tanggal** | Semua tampilan tanggal locale-aware via `formatDateRange(from, to, useLocale())` dan `formatDisplayDate(date, useLocale())`. EN: `"01 May 2026 - 31 May 2026"`. ID: `"01 Mei 2026 - 31 Mei 2026"`. Lihat §4.2 Global Architecture. |
| **Soft Delete Custom Report** | Custom report yang dihapus di-flag `is_active=false`. Tidak menghapus permanen agar konsisten dengan pola modul lain dan memudahkan migrasi Fase 2. |
| **Donut Chart Library** | Implementasi menggunakan **Recharts** (`PieChart`, `Pie`, `Cell`, `Sector`, `ResponsiveContainer`). Responsif di semua viewport. |
| **Warna Kategori** | Warna donut chart per kategori sebaiknya **deterministik** (mis. hash dari string kategori) agar konsisten antar render dan antar periode. |
| **Migrasi Fase 2** | Saat migrasi, hanya `custom_reports` & `wallet_balance_history` yang perlu dipindahkan dari localStorage ke backend. Data utama (transactions, loan_entries, wallets) sudah ditangani migrasi modul masing-masing. |
| **Data Refresh on Tab Switch** | Saat user berpindah tab, data source (`transactions`, `loanEntries`, `balanceHistory`) dibaca ulang dari localStorage untuk memastikan data selalu fresh (jika user menambah/edit transaksi di tab lain dan kembali ke Report). |
| **DailySummarySection — Category Filter** | Saat `selectedCategory` aktif di DailySummarySection, hanya expense yang cocok dengan kategori tersebut yang ditampilkan (income tidak ditampilkan dalam mode filter kategori). |
| **Dead Code: `src/features/report/`** | Direktori ini berisi 4 file placeholder kosong (`CustomReportForm.tsx`, `ExpenseDonut.tsx`, `ReportSummary.tsx`, `useReportAggregation.ts`) yang tidak digunakan. Implementasi aktual berada di `src/components/report/` dan `src/lib/report/`. File-file ini dapat dihapus. |
| **Recharts — BarChart & LineChart** | `BarChart` dan `LineChart` dari Recharts tersedia via dependensi yang sama dengan `PieChart` yang sudah ada. Tidak perlu instalasi package baru. Gunakan `ResponsiveContainer` untuk semua chart agar responsif di semua viewport. |
| **sessionStorage (bukan localStorage)** | Tiga state UI ephemeral disimpan di `sessionStorage`: (1) `"report_donut_mode"` — toggle Expense/Income, (2) `"dismissed_insight_{YYYY-MM}"` — dismiss insight card, (3) `"report_active_tab"` — tab aktif (sudah ada). Semua ini bukan data finansial dan tidak melanggar 7-key localStorage contract. |
| **calcCategoryBreakdown — Parameter Baru** | Saat mengimplementasikan Income Donut (C1), parameter `type` ditambahkan ke `calcCategoryBreakdown` dengan default `"expense"`. Semua call site existing memanggil tanpa parameter keempat — perilaku tidak berubah. Hanya `RealtimeTab.tsx` yang perlu diperbarui untuk meneruskan mode aktif. |
| **Saving Rate di PeriodSummaryRows** | Baris Saving Rate ditambahkan di `PeriodSummaryRows.tsx` antara Balance Correction dan End Balance. `PeriodSummaryRows` menerima `PeriodSummary` yang sudah memiliki `income` dan `expenses` — tidak perlu prop baru, hanya tambah baris perhitungan di-dalam komponen. Warna baris: ikuti threshold §4.9. |
| **MonthlyTab — Props Tambahan** | `MonthlyTab.tsx` sudah menerima `transactions`, `loanEntries`, `balanceHistory`. Tidak perlu props baru untuk `MonthlyOverviewChart` dan `NetWorthChart` — semua data sudah tersedia. Kedua komponen baru di-instantiate di atas loop `visibleMonths`. |
| **LoanOutstandingSection — Data Source** | Komponen ini membutuhkan `loan_counterparties` dan `loan_entries` yang saat ini tidak di-pass ke `RealtimeTab`. Halaman `src/app/report/page.tsx` perlu di-update untuk load dan pass `loanEntries` dan `counterparties` ke `RealtimeTab`, atau ke komponen baru tersebut secara langsung. |
| **CategoryTrendScreen — Route Baru** | Buat file `src/app/report/category/page.tsx`. Ambil query param `name` via `useSearchParams()`. Semua data dibaca dari `transactionsRepo.getAll()` via `useEffect` + `useState`. |
| **Viewport Testing** | Semua komponen baru (SavingRateCard, MonthlyOverviewChart, NetWorthChart, DailyBarChart, LoanOutstandingSection, InsightCard) wajib diuji di viewport 375px / 390px / 430px. Khususnya chart — gunakan `<ResponsiveContainer width="100%">` selalu. |
| **i18n — Keys Baru** | Lihat tabel i18n keys di §11. Semua keys baru wajib ditambahkan ke `src/i18n/messages/en.json` dan `src/i18n/messages/id.json` sebelum komponen dirender. |

---

## 9. Asumsi — ✅ RESOLVED (2026-05-01)

| # | Asumsi | Keputusan |
|---|--------|-----------|
| 1 | Monthly infinite scroll | ✅ Load 6 bulan pertama, tambah 6 saat scroll |
| 2 | Donut chart max kategori | ✅ **Limit 8 + "Lainnya"** |
| 3 | Tap kategori di legend | ✅ **In-place** — list transaksi diperbarui di bawah chart tanpa navigasi ke halaman lain |
| 4 | Edit Custom Report + tombol Delete | ✅ Tombol Delete merah di bawah form, confirmation dialog |
| 5 | Ikon ⚙️ di header Report | ✅ **Diimplementasikan** — ikon ⚙️ di kanan header Report menavigasi ke `/settings/report` (halaman visibilitas komponen Report). Implementasi sesuai spec §1 Screen 1. |
| 6 | Custom Report nama unik per anon_id | ✅ Case-insensitive unique |
| 7 | Balance Correction dari edit balance wallet | ✅ Dari `wallet_balance_history`, key sudah didefinisikan di Module Wallet v4.0 |
| 8 | Periode Realtime | ✅ **Bulan penuh** (1 - akhir bulan). Data natural hanya sampai hari ini |
| 9 | Range max custom report | ✅ **10 tahun** |
| 10 | Expenses row prefix | ✅ Merah + prefix `"- "` jika expenses > 0 (Monthly & Custom PeriodSummaryRows) |
| 11 | Report tab state persistence | ✅ `sessionStorage["report_active_tab"]` — dibaca on mount, ditulis on tab change |
| 12 | Balance Correction transactions di report | ✅ **TIDAK terhitung** di Income/Expenses/Balance/Donut. Hanya muncul di baris Balance Correction tersendiri via `wallet_balance_history`. Mencegah double-counting. |
| 13 | Format tanggal | ✅ **Locale-aware** via `formatDateRange`/`formatDisplayDate` + `useLocale()` |

---

---

## 10. Known Implementation Issues (v1.4 — 2026-05-05)

Bagian ini mendokumentasikan **bug yang diketahui** di implementasi saat ini. Item di bawah perlu diperbaiki di kode.

---

### Bug 1 — `formatDisplayDate` tanpa locale di Add Custom Report

**File:** `src/app/report/custom/add/page.tsx`

**Perilaku kode saat ini:**
```js
// Add page — locale TIDAK diteruskan:
{formatDisplayDate(startDate)}
{formatDisplayDate(endDate)}

// Edit page — locale DITERUSKAN (benar):
{formatDisplayDate(startDate, locale)}
{formatDisplayDate(endDate, locale)}
```

**Akibat:** Di halaman Add, tanggal selalu ditampilkan dalam locale default (biasanya `en`), tidak mengikuti locale user. Halaman Edit sudah benar.

**Perbaikan:**
```js
// Tambahkan useLocale() dan teruskan ke formatDisplayDate
const locale = useLocale();
{formatDisplayDate(startDate, locale)}
```

---

### Bug 2 — Hardcoded String "Start Balance" / "End Balance" di `CustomReportSection`

**File:** `src/components/report/CustomReportSection.tsx`

**Perilaku kode saat ini:**
```jsx
<span>Start Balance</span>  {/* hardcoded English */}
<span>End Balance</span>    {/* hardcoded English */}
```

**`MonthlySection` yang benar:**
```jsx
<span>{t("startBalance")}</span>
<span>{t("endBalance")}</span>
```

**Akibat:** Label "Start Balance" dan "End Balance" di Custom Report selalu dalam bahasa Inggris, tidak mengikuti locale, sehingga tidak konsisten dengan MonthlySection.

**Perbaikan:** Gunakan `const t = useTranslations("report.summary")` dan ganti dengan key i18n.

---

## 11. Fitur Analitik Baru — PROP-0002 (v2.0)

> Bagian ini menjadi referensi cepat untuk `module-report-dev`. Detail teknis masing-masing fitur ada di §1 (UI), §2 (Flow), dan §4 (Kalkulasi).

### 11.1 Invariant Check — Semua Fitur PROP-0002

| Constraint | Status |
|------------|--------|
| Tidak menambah localStorage/IndexedDB key baru | Semua 8 fitur: **OK** |
| Semua data computed-on-the-fly, tidak di-cache | **OK** |
| Transfer dikecualikan dari income/expense breakdown | **OK** |
| Balance Correction dikecualikan dari income/expense breakdown | **OK** |
| Soft delete dihormati (hanya data `is_active=true`) | **OK** |
| Wallet balance rules tidak disentuh (read-only module) | **OK** |
| Tidak ada record baru yang dibuat | **OK** |
| sessionStorage (bukan localStorage) untuk UI state ephemeral | `report_donut_mode`, `dismissed_insight_*` |

### 11.2 Gelombang 1 — P0, Segera Diimplementasikan

**Status: Siap dieksekusi oleh `module-report-dev`.**

| Fitur | ID | File yang Diedit | File Baru | Ref Spec |
|-------|----|-----------------|-----------|---------|
| Saving Rate di Realtime + Monthly | B1 | `RealtimeTab.tsx`, `PeriodSummaryRows.tsx` | `SavingRateCard.tsx` | §1 Tab 1, §4.9 |
| Income Donut Toggle | C1 | `RealtimeTab.tsx`, `calculations.ts` | — | §1 Tab 1, §4.10 |
| 6-Month Bar Chart di Monthly | A1-beta | `MonthlyTab.tsx` | `MonthlyOverviewChart.tsx` | §1 Tab 2, §4 |

**Checklist per fitur Gelombang 1:**

**B1 — Saving Rate:**
- [ ] Buat `src/components/report/SavingRateCard.tsx` dengan props `{ income: number, expenses: number }`
- [ ] Tambah `<SavingRateCard>` di `RealtimeTab.tsx` di bawah Period Label
- [ ] Tambah baris Saving Rate di `PeriodSummaryRows.tsx` antara Balance Correction dan End Balance. Props `PeriodSummary` sudah memiliki `income` dan `expenses` — tidak perlu prop baru.
- [ ] Handle edge case `income === 0` → tampilkan `"N/A"`
- [ ] Handle negatif (expenses > income) → warna merah, angka negatif
- [ ] Warna progress bar sesuai threshold: ≥20% hijau, 10–19% oranye, <10% merah
- [ ] Tambah i18n keys: `report.savingRate.title`, `report.savingRate.benchmark`, `report.savingRate.na`, `report.savingRate.income`, `report.savingRate.saved`
- [ ] Test viewport 375 / 390 / 430px

**C1 — Income Donut Toggle:**
- [ ] Update signature `calcCategoryBreakdown` di `calculations.ts`: tambah param `type: "expense" | "income" = "expense"` (backward compatible)
- [ ] Perbarui filter internal: `t.type === type` (bukan hardcode `'expense'`)
- [ ] Pastikan `category !== "Balance Correction"` dan `type !== "transfer"` masih dikecualikan di kedua mode
- [ ] Tambah toggle pill di `RealtimeTab.tsx` di atas `<DonutChart>`
- [ ] State `donutMode: 'expense' | 'income'` di-init dari `sessionStorage["report_donut_mode"]`, fallback `'expense'`
- [ ] Saat toggle berubah: reset `selectedCategory` ke `null`, simpan ke `sessionStorage`
- [ ] Saat mode Income: update center label chart menjadi "Total Income"
- [ ] Transaction list filter: saat Income → `type='income'`, saat Expense → `type='expense'`
- [ ] Tap target toggle pill: minimal 44×44px
- [ ] Tambah i18n keys: `report.donut.expense`, `report.donut.income`
- [ ] Test viewport 375 / 390 / 430px

**A1-beta — 6-Month Bar Chart:**
- [ ] Buat `src/components/report/MonthlyOverviewChart.tsx` dengan props `{ transactions: Transaction[] }`
- [ ] Hitung 6 bulan terakhir (inklusif bulan berjalan): loop mundur dari bulan ini
- [ ] Per bulan: `calcIncome(transactions, start, end)` dan `calcExpenses(transactions, start, end)`
- [ ] `useMemo` dengan dependency `[transactions]`
- [ ] Render `<BarChart>` grouped: income (hijau) | expense (merah)
- [ ] `<ResponsiveContainer width="100%" height={160}>`
- [ ] Tap bar → navigate ke `/report/detail?start=...&end=...`
- [ ] X-axis: label bulan singkat locale-aware dari `date-fns`
- [ ] Sisipkan `<MonthlyOverviewChart>` di `MonthlyTab.tsx` di atas loop `visibleMonths`
- [ ] Tidak overflow di 375px
- [ ] Tambah i18n key: `report.monthlyOverview.title`
- [ ] Test viewport 375 / 390 / 430px

### 11.3 Gelombang 2 — P1, Setelah Gelombang 1 Selesai

**Status: Spec cukup untuk dieksekusi. Maksimum satu klarifikasi per fitur diperbolehkan.**

| Fitur | ID | File yang Diedit | File Baru | Ref Spec |
|-------|----|-----------------|-----------|---------|
| Daily Bar Chart di Report Detail | E1 | `DailySummarySection.tsx` | — | §1 Screen 4, §4 |
| Net Worth Line Chart | C2 | `MonthlyTab.tsx` | `NetWorthChart.tsx` | §1 Tab 2, §4.12 |
| Top Spending Insight Card | B2 | `RealtimeTab.tsx` | `InsightCard.tsx` | §1 Tab 1, §4 |

**Ringkasan per fitur Gelombang 2:**

**E1 — Daily Bar Chart:**
- Tambah state `view: "list" | "calendar" | "chart"` di `DailySummarySection.tsx` (extend existing toggle)
- Mode Chart: render `<BarChart>` dengan data dari `buildDailySummaries()` (sudah ada, tidak perlu fungsi baru)
- Grouped bar per hari: income (hijau) | expense (merah). X-axis: tanggal (angka saja)
- Tap bar → scroll ke anchor `day-{YYYY-MM-DD}` di Transaction List
- Viewport: `<ResponsiveContainer width="100%" height={160}>`

**C2 — Net Worth Line Chart:**
- Buat `src/components/report/NetWorthChart.tsx` dengan props `{ transactions, loanEntries, balanceHistory }`
- Hitung `endBalance` untuk 12 bulan terakhir via `calculateMonthlySummary()`
- `useMemo([transactions, loanEntries, balanceHistory])`
- Render `<LineChart>`, warna `var(--color-brand)`
- Sisipkan di `MonthlyTab.tsx` di bawah `MonthlyOverviewChart`, di atas loop bulanan
- `MonthlyTab` sudah menerima `loanEntries` dan `balanceHistory` — tidak perlu props baru

**B2 — Insight Card:**
- Buat `src/components/report/InsightCard.tsx` dengan props `{ insight: InsightData | null, onDismiss: () => void }`
- Logic `generateInsight()` dihitung di `RealtimeTab.tsx` via `useMemo([transactions])`
- Membutuhkan data bulan lalu: hitung `start/end` bulan lalu, panggil `calcExpenses` dan `calcCategoryBreakdown` dua kali (bulan ini + bulan lalu)
- Tampil hanya jika `insight !== null`. Jika tidak ada insight → `null` (bukan empty state)
- Dismiss: `sessionStorage["dismissed_insight_{YYYY-MM}"]`
- Threshold comparison: ≥ 30% naik untuk insight kategori naik

### 11.4 Gelombang 3 — P1–P2, Setelah Gelombang 2

**Status: Spec ringkas — cukup untuk planning, detail minor bisa dikembangkan saat implementasi.**

| Fitur | ID | File yang Diedit | File Baru | Ref Spec |
|-------|----|-----------------|-----------|---------|
| Category Trend Drill-down | A2 | `src/app/report/detail/page.tsx` (tambah link) | `src/app/report/category/page.tsx` | §7, §4.11 |
| Loan Aging di Report | D1 | `RealtimeTab.tsx`, `src/app/report/page.tsx` | `LoanOutstandingSection.tsx` | §1 Tab 1 |

**Ringkasan Gelombang 3:**

**A2 — Category Trend:**
- Buat `src/app/report/category/page.tsx` — halaman baru
- Ambil `?name=` via `useSearchParams()`
- Hitung trend 6 bulan via formula §4.11
- Bar chart vertikal (single color merah), statistik ringkasan, recent transactions
- Tambahkan link dari legend di `/report/detail` ke `/report/category?name={kategori}`

**D1 — Loan Aging:**
- Buat `src/components/report/LoanOutstandingSection.tsx`
- `src/app/report/page.tsx` perlu load `loan_counterparties` dan `loan_entries` lalu pass ke komponen ini
- Tampil kondisional: hanya jika ada outstanding ≠ 0
- Max 3 counterparty + tombol "Lihat semua ›" navigate ke `/loan`
- Aging: `floor((today - max(transaction_date of outstanding entries)) / 86400000)` hari

### 11.5 Tabel i18n Keys yang Diperlukan

Developer wajib menambahkan semua keys berikut ke `src/i18n/messages/en.json` dan `src/i18n/messages/id.json` sebelum komponen terkait dirender.

| Key | Konteks | Gelombang |
|-----|---------|-----------|
| `report.savingRate.title` | Label header SavingRateCard | G1 |
| `report.savingRate.benchmark` | Teks "Target sehat: ≥ 20%" | G1 |
| `report.savingRate.na` | Teks "N/A" saat income = 0 | G1 |
| `report.savingRate.income` | Label "Income" di bawah bar | G1 |
| `report.savingRate.saved` | Label "Saved" di bawah bar | G1 |
| `report.donut.expense` | Label toggle pill "Expense" | G1 |
| `report.donut.income` | Label toggle pill "Income" | G1 |
| `report.monthlyOverview.title` | Judul section 6-Month Overview | G1 |
| `report.daily.chartView` | Label tombol toggle "Chart" di DailySummarySection | G2 |
| `report.netWorth.title` | Judul section Net Worth | G2 |
| `report.netWorth.now` | Label "Sekarang: {value}" | G2 |
| `report.netWorth.from` | Label "dari {bulan}" | G2 |
| `report.insight.categoryUp` | Template insight kategori naik | G2 |
| `report.insight.lowSavingRate` | Template insight saving rate rendah | G2 |
| `report.insight.categoryDominant` | Template insight kategori dominan | G2 |
| `report.insight.expenseDown` | Template insight pengeluaran turun | G2 |
| `report.insight.noIncome` | Template insight tidak ada income | G2 |
| `report.loanOutstanding.title` | Judul section Loan Outstanding | G3 |
| `report.loanOutstanding.viewAll` | Teks "Lihat semua ›" | G3 |
| `report.loanOutstanding.days` | Format "{N}d" aging | G3 |

---

*— End of Technical Specification: Module Report (v2.1) —*
*Dokumen terkait: Module Wallet · Module Transactions · Module Loan · Global Architecture · Module Settings*
*PROP-0002 status: Formalized into spec on 2026-05-07, see §11 of tech-spec-module-report.md*
