# Proposal: Report Module Enhancements — Analisa Keuangan yang Lebih Dalam

**Status:** Formalized into spec on 2026-05-07 — see §11 of `tech-spec-module-report.md` (v2.0)
**Created:** 2026-05-07
**Author:** Discussion with @user (via feature-architect)
**Affects modules:** Report (primary), Transactions (read), Loan (read), Wallet (read)
**Effort estimate:** L (8–14 hari tergantung scope yang dipilih — lihat §8 per fitur)
**Phase target:** Fase 1 (semua feasible tanpa backend), persiapan Fase 2

---

## Ringkasan Eksekutif

Module Report saat ini sudah solid untuk kebutuhan dasar: ringkasan bulanan, donut chart expense per kategori, dan custom report. Namun user masih belum bisa menjawab pertanyaan keuangan yang lebih dalam seperti:

- "Bulan ini saya boros di mana dibanding bulan lalu?"
- "Berapa persen penghasilan saya yang berhasil ditabung?"
- "Tren pengeluaran kategori Makanan saya naik atau turun?"
- "Total uang saya di semua wallet berapa, dan bagaimana trendnya?"

Proposal ini mengidentifikasi **8 fitur enhancement** terklasifikasi dalam 5 kategori, dengan prioritas dan analisis feasibility masing-masing. Semua fitur dirancang computed-on-the-fly sesuai invariant spec, tanpa menambah localStorage key baru, dan migration-ready ke Fase 2.

---

## 1. Problem Statement

PFinTrack menarget user Indonesia yang melek keuangan dasar tetapi bukan akuntan. Data transaksi mereka sudah ada di app — tapi laporan yang tersedia masih bersifat deskriptif ("ini yang terjadi") bukan analitik ("kenapa ini terjadi, dan apa artinya?").

**Gap utama yang teridentifikasi dari riset:**

1. **Tidak ada perbandingan lintas periode.** Monthly tab hanya menampilkan data per bulan secara independen — user harus mengingat sendiri angka bulan sebelumnya untuk membandingkan.

2. **Tidak ada metric kesehatan keuangan.** Tidak ada saving rate, tidak ada rasio expense-to-income. User tidak tahu apakah keuangan mereka "sehat" atau tidak.

3. **Income tidak dianalisa.** Donut chart hanya untuk expense. Padahal dari sisi sumber income, user juga perlu tahu pola penghasilan mereka.

4. **Loan tersembunyi dari konteks.** Loan hanya muncul sebagai satu baris angka di Monthly summary — tidak ada analisa aging (utang sudah berapa lama belum lunas?) atau counterparty breakdown.

5. **Net worth tidak terlihat.** Jumlah total saldo semua wallet ada (di Wallet tab), tapi tidak ada tren historisnya.

**Referensi kompetitor:**
- **Money Lover**: budget per kategori, prediksi pengeluaran bulanan
- **Wallet by BudgetBakers**: dashboard gauges (green/yellow/red), 7-day outlook, trend historis balance
- **Monefy**: bar chart daily/weekly/monthly, perbandingan periode
- **YNAB**: income vs expense report month-by-month, "Age Your Money" metric
- **Sribuu**: laporan bulanan + analisa hasil, budget dengan alert

---

## 2. Fitur yang Diusulkan

Fitur dikelompokkan dalam 5 kategori. Setiap fitur memiliki sub-seksi tersendiri dengan detail lengkap.

---

### Kategori A: Trend & Comparison

#### A1 — Month-over-Month Bar Chart

**Value proposition:** User langsung melihat apakah pengeluaran bulan ini naik atau turun dibanding bulan sebelumnya, tanpa harus mengingat angka sendiri.

**Lokasi:** Tab baru **"Trends"** di dalam `/report`, atau sebagai section tambahan di atas tab Monthly yang sudah ada.

**Opsi Penempatan:**

**Opsi A1-alpha — Tab keempat "Trends" (baru)**
Tambah tab keempat di tab switcher Report: Realtime · Monthly · Custom · **Trends**. Tab baru ini berisi bar chart dan semua fitur trend.

```
┌─────────────────────────────┐
│ Report                    ⚙ │  ← header
├─────────────────────────────┤
│ Realtime Monthly Custom Trends │  ← tab switcher (4 tab)
├─────────────────────────────┤
│                             │
│  Expense trend (6 bulan)   │
│  ┌──────────────────────┐   │
│  │    ▓                 │   │
│  │    ▓    ▓            │   │
│  │    ▓    ▓    ▓  ▓   │   │
│  │    ▓    ▓    ▓  ▓  ▓│   │
│  │  Nov  Dec  Jan Feb Mar Apr │
│  └──────────────────────┘   │
│  Tap bar → drill ke bulan   │
│                             │
│  Saving Rate (6 bulan)      │
│  ┌──────────────────────┐   │
│  │ 35% 40% 28% 45% 38% │   │
│  │ ▒▒  ▓▓  ░░  ▓▓  ▒▒  │   │
│  └──────────────────────┘   │
│                             │
└─────────────────────────────┘
```

**Opsi A1-beta — Section di atas Monthly (tanpa tab baru)**
Bar chart disisipkan sebagai section pertama di tab Monthly, sebelum list section per bulan. Lebih sedikit perubahan navigasi.

```
┌─────────────────────────────┐
│  [Realtime] [Monthly] [Custom] │
├─────────────────────────────┤
│  6-Month Expense Overview   │
│  ┌──────────────────────┐   │
│  │  ▓                   │   │
│  │  ▓  ▓               │   │
│  │  ▓  ▓  ▓  ▓        │   │
│  └──────────────────────┘   │
│  ───────────────────────── │
│  01 Apr 2026 - 30 Apr 2026  │
│    Expenses   Rp 2.500.000  │
│    Income   + Rp 5.000.000  │
│    ...                      │
└─────────────────────────────┘
```

**Comparison:**

| Aspek | A1-alpha (Tab Baru) | A1-beta (Section di Monthly) |
|---|---|---|
| Effort | M | S |
| Navigasi | Tab switcher jadi 4 item → bisa sempit di 375px | Tidak ada perubahan navigasi |
| Discoverability | Tinggi — tab eksplisit | Medium — harus scroll ke atas Monthly |
| Konflik spec | Tab switcher spec saat ini hanya menyebut 3 tab. Tab ke-4 perlu validasi lebar di 375px | Tidak ada konflik |
| Rekomendasi | Hanya jika fitur Trends cukup besar sebagai unit | Lebih aman untuk iterasi awal |

**Rekomendasi: A1-beta** untuk MVP — chart sebagai collapsible section di tab Monthly. A1-alpha bisa jadi target jika fitur Trends berkembang lebih besar.

**Data source:**
- `transactions` (is_active, type, transaction_date, amount) — sudah tersedia
- `loanEntries` (opsional, untuk net cash flow view)
- Tidak memerlukan key atau field baru

**Computational complexity:**
```
Untuk 6 bulan terakhir:
  forEach month in last6Months:
    expenses[month] = calcExpenses(transactions, start, end)  // O(n) filter
    income[month]   = calcIncome(transactions, start, end)    // O(n) filter

Total: O(6n) = O(n) — layak on-the-fly untuk ribuan transaksi.
Memoize di useMemo() dengan dep [transactions] agar tidak re-render per state change.
```

**Visualisasi:**
Gunakan `BarChart` dari Recharts (sudah ada sebagai dependency via PieChart). Bar grouped atau stacked: expense (merah) + income (hijau) per bulan. Tap bar → navigate ke `/report/detail?start=...&end=...` untuk drill-down bulan tersebut.

**Migration impact (Fase 2):** Nol. Semua kalkulasi dari data transactions yang sudah ada. Tidak ada tabel baru.

**Priority: P0** — nilai tinggi, effort S, tidak menambah storage key.

---

#### A2 — Category Trend Drill-down

**Value proposition:** User bisa melihat apakah pengeluaran di kategori tertentu (mis. "Makanan & Minuman") konsisten naik, turun, atau fluktuatif dalam 6 bulan terakhir.

**Lokasi:** Accessible dari tap kategori di donut chart Realtime atau dari Report Detail. Tampil sebagai bottom sheet atau halaman baru.

```
┌─────────────────────────────┐
│ ‹  Makanan & Minuman        │
├─────────────────────────────┤
│  6-Month Trend              │
│  ┌──────────────────────┐   │
│  │  ▓                   │   │
│  │  ▓  ▓    ▓          │   │
│  │  ▓  ▓  ▓ ▓  ▓  ▓  │   │
│  └──────────────────────┘   │
│  Nov  Dec  Jan  Feb  Mar  Apr │
│                             │
│  Avg per bulan: Rp 850.000  │
│  Tertinggi: Feb (Rp 1.2Jt)  │
│  Terendah:  Nov (Rp 450rb)  │
│                             │
│  Transaksi terbaru ──────── │
│  [list transaksi bulan ini] │
└─────────────────────────────┘
```

**Route baru:** `/report/category?name={CategoryName}` atau ditampilkan via query param dari `/report/detail?start=...&end=...&category=...` (sudah ada pattern query param ini).

**Data source:** `transactions` saja. Tidak ada field baru.

**Computational complexity:** O(6n) — sama dengan A1. `useMemo` per kategori.

**Migration impact (Fase 2):** Nol.

**Priority: P1** — bagus untuk power users, tapi bukan kebutuhan mendesak.

---

### Kategori B: Insight Otomatis

#### B1 — Saving Rate Display

**Value proposition:** Satu angka yang langsung menunjukkan kesehatan keuangan: berapa persen dari income yang berhasil ditabung bulan ini.

**Lokasi:** Ditampilkan di Tab Realtime, di bawah atau di atas donut chart. Bisa juga di setiap section Monthly sebagai baris tambahan.

**Formula:**
```
Saving Rate = ((Income − Expenses) / Income) × 100

Jika Income = 0 → tampilkan "N/A" (hindari division by zero)
Jika negatif (Expenses > Income) → tampilkan sebagai angka negatif merah
```

**Wireframe di Tab Realtime:**

```
┌─────────────────────────────┐
│  01 May 2026 - 31 May 2026  │
├─────────────────────────────┤
│  ┌────────────────────────┐ │
│  │  Saving Rate bulan ini │ │
│  │                        │ │
│  │         38%            │ │
│  │   ████████░░░░░░░░     │ │
│  │  income Rp5Jt          │ │
│  │  saved  Rp1.9Jt        │ │
│  └────────────────────────┘ │
│                             │
│  [Donut Chart]              │
└─────────────────────────────┘
```

**Visual:**
- Progress bar horizontal: 0% = kiri, 100% = kanan
- Warna bar: hijau jika saving rate ≥ 20%, kuning 10–19%, merah < 10%
- Target benchmark: ditulis kecil "Target sehat: ≥ 20%" (hard-coded teks info, bukan konfigurasi)
- Di Monthly: tampil sebagai baris tambahan di PeriodSummaryRows setelah Balance row

**Tampilan di Monthly Section (baris tambahan):**
```
  Saving Rate    38%   ← hijau jika ≥20%, kuning jika 10-19%, merah jika <10%
```

**Data source:** `income` dan `expenses` sudah dihitung via `calcIncome`/`calcExpenses` yang sudah ada.

**Computational complexity:** O(1) dari hasil kalkulasi yang sudah ada. Nol overhead tambahan.

**Migration impact (Fase 2):** Nol. Pure derived metric, tidak perlu disimpan.

**Priority: P0** — effort XS, value tinggi, tidak ada dependency baru. Bisa diimplementasi paralel dengan fitur lain.

---

#### B2 — Top Spending Insight Card

**Value proposition:** Satu kalimat insight otomatis yang memberi konteks pada data, mis. "Kategori Transportasi naik 45% dari bulan lalu."

**Lokasi:** Card kecil di bagian atas tab Realtime, di atas period label atau di bawahnya. Bisa dismiss.

**Jenis insight yang dihasilkan (dianalisa secara lokal, tanpa ML):**

| Kondisi | Insight yang dimunculkan |
|---|---|
| Kategori X naik ≥ 30% dari bulan lalu | "Pengeluaran [Kategori] naik [N]% dari bulan lalu" |
| Saving rate < 10% | "Pengeluaran bulan ini melebihi 90% penghasilan" |
| Satu kategori > 50% total expense | "[Kategori] mendominasi [N]% pengeluaranmu" |
| Expense bulan ini < bulan lalu (semua kategori) | "Pengeluaran turun [N]% — lebih hemat dari bulan lalu" |
| Tidak ada income bulan ini | "Belum ada pemasukan bulan ini" |

**Prioritas insight:** Hanya tampilkan 1 insight paling relevan (severity score — kondisi anomali lebih diprioritaskan dari kondisi positif).

**Wireframe:**

```
┌─────────────────────────────┐
│  01 May - 31 May 2026       │
├─────────────────────────────┤
│  ┌──────────────────────── ×│
│  │ Transportasi naik 45%   │ │
│  │ dari bulan April         │ │
│  └────────────────────────┘ │
│                             │
│  [Donut Chart]              │
└─────────────────────────────┘
```

**Data source:**
- Bulan berjalan: `calcExpenses` per kategori
- Bulan lalu: `calcExpenses` per kategori untuk `[startOfLastMonth, endOfLastMonth]`
- Keduanya dari `transactions` yang sudah diload

**Computational complexity:**
```
O(2n) — filter transactions dua kali (bulan ini + bulan lalu)
Semua dilakukan on-the-fly via useMemo
```

**Edge cases:**
- Jika bulan lalu tidak ada data → insight type-1 (comparison) tidak ditampilkan, fallback ke insight lain yang applicable
- Jika tidak ada insight yang applicable → card tidak ditampilkan (bukan empty state)
- User dismiss insight → tersimpan di `sessionStorage` (bukan localStorage) agar reset setiap buka app baru

**Migration impact (Fase 2):** Nol. Logic di client, tidak ada data yang disimpan ke backend.

**Priority: P1** — bagus, tapi bisa terasa gimmicky jika insight generik. Perlu threshold yang tepat saat implementasi.

---

### Kategori C: Cash Flow & Income Analysis

#### C1 — Income Breakdown Chart

**Value proposition:** Selain tahu pengeluaran per kategori, user bisa melihat dari mana sumber penghasilan mereka — penting untuk user dengan multiple income streams (gaji, freelance, investasi, dll).

**Lokasi:** Di tab Realtime, sebagai toggle antara "Expense" dan "Income" di atas donut chart yang sudah ada.

**Wireframe:**

```
┌─────────────────────────────┐
│  01 May 2026 - 31 May 2026  │
├─────────────────────────────┤
│       [Expense] [Income]    │  ← toggle pill
│                             │
│       [Donut Chart]         │  ← konten berubah sesuai toggle
│                             │
│  Legend:                    │
│  ● Gaji          Rp 5Jt 80% │
│  ● Freelance   Rp 800rb 13% │
│  ● Transfer      Rp 440rb 7%│
│                             │
│  Income Transactions ─────  │
│  [list transaksi income]    │
└─────────────────────────────┘
```

**Behaviour:**
- Toggle "Expense": tampilkan donut chart expense per kategori (behaviour saat ini)
- Toggle "Income": tampilkan donut chart income per kategori (perilaku baru)
- Center label: "Total Income" + grand total
- Legend di bawah: sama persis dengan struktur legend Expense
- Transaction list di bawah: filter ke income saja jika toggle Income aktif

**Catatan:** Transfer TIDAK dimasukkan ke Income breakdown (konsisten dengan aturan spec §4.2 Report dan catatan §4.3 Global Architecture).

**Data source:** `transactions` (type='income', is_active=true) — sudah ada.

**Computational complexity:** O(n) — satu pass filter tambahan. `calcCategoryBreakdown` perlu versi income-equivalent (atau parameter `type`).

**Modifikasi `calculations.ts`:**
```ts
// Tambah parameter type ke calcCategoryBreakdown
export function calcCategoryBreakdown(
  transactions: Transaction[],
  start: string,
  end: string,
  type: "expense" | "income" = "expense"  // default tetap expense
): CategoryBreakdown[]
```

Ini adalah extension backward-compatible — tidak breaking existing callers.

**Migration impact (Fase 2):** Nol. Fungsi kalkulasi saja.

**Priority: P1** — berguna untuk user dengan multiple income source. Effort S karena reuse komponen donut yang sudah ada.

---

#### C2 — Net Worth Tracker (dari wallet_balance_history)

**Value proposition:** User bisa melihat tren total kekayaan bersih mereka dari waktu ke waktu, direkonstruksi dari data transaksi historis.

**Konsep:** Net worth di setiap titik waktu = `endBalance` dari `calculateMonthlySummary` untuk bulan tersebut. Ini sudah dihitung di tab Monthly — tinggal divisualisasikan sebagai line chart.

**Lokasi:**
- Option alpha: Section di atas Monthly tab (di bawah bar chart A1 jika keduanya diimplementasi)
- Option beta: Dedicated section di tab Realtime sebagai "snapshot net worth bulan ini vs bulan lalu"

**Wireframe (line chart per bulan):**

```
┌─────────────────────────────┐
│  Net Worth Trend            │
│  ┌──────────────────────┐   │
│  │              ∙∙∙∙    │   │
│  │         ∙∙∙∙         │   │
│  │    ∙∙∙∙∙             │   │
│  │ ∙∙                   │   │
│  └──────────────────────┘   │
│  Nov  Dec  Jan  Feb  Mar  Apr │
│                             │
│  Sekarang: Rp 24.500.000    │
│  +Rp 3.100.000 dari Nov 2025│
└─────────────────────────────┘
```

**Data source:**
- `transactions` + `loanEntries` + `wallet_balance_history` — semua sudah tersedia
- Gunakan `calculateMonthlySummary().endBalance` per bulan (fungsi sudah ada)
- Net worth per bulan = `endBalance` dari masing-masing bulan

**Computational complexity:**
```
Untuk 12 bulan terakhir:
  forEach month:
    endBalance[month] = calculateMonthlySummary(...).endBalance  // O(n) per bulan

Total: O(12n) = O(n)
useMemo dengan dep [transactions, loanEntries, balanceHistory]
```

**Catatan penting:** `endBalance` dari `calculateMonthlySummary` sudah mencakup loan cash flow dan balance corrections. Ini adalah representasi akurat dari posisi keuangan user per periode.

**Apakah loan dimasukkan ke net worth?**
Pertanyaan ini perlu keputusan desain:
- **Ya (rekomendasi):** loan cash flow sudah masuk ke `endBalance` formula spec §4.8 via `balanceCorrection`. Konsisten dengan apa yang ditampilkan di Monthly tab.
- **Tidak:** buat versi net worth tanpa loan — lebih "bersih" tapi berbeda dari angka yang sudah ditampilkan.

Rekomendasi: gunakan `endBalance` yang sudah ada (include loan) untuk konsistensi dengan Monthly tab.

**Migration impact (Fase 2):** Nol. Semua dari data transactions yang ada.

**Priority: P1** — nilai tinggi untuk user yang sudah punya riwayat beberapa bulan. Tapi kurang berguna untuk user baru. Efek "wow" meningkat seiring bertambahnya data historis.

---

### Kategori D: Loan Analytics

#### D1 — Loan Aging & Counterparty Summary di Report

**Value proposition:** User bisa melihat dari laporan berapa total outstanding pinjaman keseluruhan dan sudah berapa lama belum dibayar, tanpa harus buka tab Loan.

**Lokasi:** Section opsional di tab Realtime (jika ada loan outstanding) dan di Monthly report sebagai baris tambahan.

**Wireframe (section di Realtime):**

```
┌─────────────────────────────┐
│  Loan Outstanding           │
│  ─────────────────────────  │
│  Budi      - Rp 500.000  28d│
│  Sarah     + Rp 200.000  5d │
│  ─────────────────────────  │
│  Net       - Rp 300.000     │
│                  Lihat semua›│
└─────────────────────────────┘
```

- Tampil hanya jika ada counterparty dengan outstanding ≠ 0
- "28d" = jumlah hari sejak entry terakhir yang masih outstanding
- Warna: merah jika outstanding > 0 (orang itu berhutang ke user atau user berhutang), sesuai konvensi existing Loan module
- "Lihat semua ›" → navigate ke `/loan`
- Maximum 3 counterparty ditampilkan, sisanya diringkas

**Data source:**
- `loan_counterparties` + `loan_entries` — sudah ada
- Aging dihitung dari `max(transaction_date)` entries yang masih outstanding per counterparty

**Computational complexity:** O(n) — satu pass `loanEntries`. Tidak berat.

**Migration impact (Fase 2):** Nol. Semua read-only dari data loan existing.

**Priority: P2** — nice-to-have. User yang aktif pakai Loan module akan suka, tapi bukan kebutuhan Report users secara umum.

---

### Kategori E: Visualisasi Tambahan

#### E1 — Income vs Expense Bar Chart di Report Detail

**Value proposition:** Di halaman drill-down periode (`/report/detail`), selain donut chart expense, tampilkan juga bar chart income vs expense per hari dalam periode — lebih mudah melihat hari mana yang surplus dan defisit.

**Lokasi:** Di atas atau menggantikan DailySummarySection di `/report/detail`. DailySummarySection sudah punya mode List dan Calendar — ini menambah mode "Chart".

**Wireframe (mode Chart, baru):**

```
┌─────────────────────────────┐
│  Daily Summary  [List][Cal][Chart]│
│  ┌──────────────────────┐   │
│  │  ▓                   │   │  ← income (hijau)
│  │  ▓  ░                │   │
│  │  ▓  ░  ▓            │   │
│  │  ▓  ░  ▓  ▓  ░  ▓ │   │  ← expense (merah)
│  └──────────────────────┘   │
│    1  5  10 15 20 25 31     │
│  ● Income  ● Expense        │
└─────────────────────────────┘
```

**Behaviour:**
- Toggle button ketiga "Chart" ditambahkan di DailySummarySection
- Bar grouped per hari: income (hijau) | expense (merah)
- X-axis: tanggal (abbreviated jika periode panjang)
- Tap bar → scroll ke transaksi hari tersebut di Transaction List di bawah

**Data source:** `transactions` sudah diload di halaman detail.

**Computational complexity:** O(n) — group by date yang sudah ada untuk Calendar mode. Chart mode adalah rendering ulang data yang sama.

**Migration impact (Fase 2):** Nol.

**Priority: P1** — menambah mode ketiga di DailySummarySection tanpa perubahan navigasi. Effort S karena komponennya sudah modular.

---

## 3. Constraints & Invariants

### Checklist per fitur

| Constraint | A1 Bar Chart | A2 Category Trend | B1 Saving Rate | B2 Insight Card | C1 Income Donut | C2 Net Worth | D1 Loan Aging | E1 Daily Bar |
|---|---|---|---|---|---|---|---|---|
| Tidak tambah localStorage key | OK | OK | OK | OK (sessionStorage untuk dismiss) | OK | OK | OK | OK |
| Semua record punya id/anon_id/is_active/... | N/A (no new records) | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Soft-delete preserved | OK (hanya read) | OK | OK | OK | OK | OK | OK | OK |
| Wallet balance rules | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh | Tidak tersentuh |
| Mobile-first 375/390/430px | Perlu verifikasi bar chart lebar | Perlu verifikasi | OK | OK | OK | Perlu verifikasi line chart | OK | Perlu verifikasi |
| id-ID locale formatting | OK via formatIDR | OK | % tidak perlu locale | OK | OK | OK | OK | OK |
| Computed-on-the-fly | OK | OK | OK | OK | OK | OK | OK | OK |
| Tidak cache aggregates | OK | OK | OK | OK | OK | OK | OK | OK |

### Catatan penting per fitur:

**A1 Bar Chart:**
- Tab switcher 3 → 4 item (jika opsi alpha): perlu verifikasi lebar di 375px. Label "Realtime", "Monthly", "Custom", "Trends" — keempat item bisa muat jika font-size 12px dan masing-masing flex-1. Rekomendasi: gunakan opsi beta (section di Monthly) untuk menghindari risiko ini.

**B1 Saving Rate — Divisi by Zero:**
```
if (income === 0) → tampilkan "N/A" bukan 0%
if (expenses > income && income > 0) → tampilkan negatif, warna merah
```

**B2 Insight Card — sessionStorage:**
Dismiss state disimpan ke `sessionStorage` (bukan localStorage) karena ini adalah UI preference ephemeral, bukan data finansial. Key: `"dismissed_insight_{bulan}"`. Tidak melanggar 7-key contract.

**C1 Income Donut — Transfer Exclusion:**
Wajib exclude type='transfer' dari income breakdown (konsisten dengan spec Report §4.2 dan §4.3 Global Architecture: "Transfer tidak ikut dihitung di Income/Expenses/Balance").

**C2 Net Worth — Loan Inclusion:**
Loan cash flow masuk ke `endBalance` formula existing (spec §4.8). Net Worth chart menggunakan nilai ini untuk konsistensi. Tidak ada "net worth tanpa loan" — terlalu kompleks untuk manfaat marginal.

---

## 4. Migration Impact (Fase 2)

Semua 8 fitur yang diusulkan adalah **pure read + compute** dari data yang sudah ada. Tidak ada:
- Tabel database baru yang diperlukan
- Field baru pada tabel existing
- Key IndexedDB baru

Implikasi Fase 2 yang perlu diperhatikan:

**Performa dengan data besar:**
Saat Fase 2, kalkulasi O(n) yang saat ini berjalan di browser akan berpindah ke server-side aggregation (PostgreSQL). Ini justru lebih cepat. Namun API endpoint yang diperlukan cukup sederhana:

```
GET /api/reports/monthly-summary?start=&end=&anon_id=
  → { income, expenses, balance, loan, balanceCorrection, endBalance }

GET /api/reports/category-breakdown?start=&end=&type=expense|income&anon_id=
  → CategoryBreakdown[]

GET /api/reports/net-worth-history?months=12&anon_id=
  → { month: string, endBalance: number }[]
```

Semuanya adalah query aggregation standar SQL — tidak ada schema change.

**Potential SQL optimization:**
```sql
-- Category breakdown (expense)
SELECT category, SUM(amount) as total
FROM transactions
WHERE anon_id = $1
  AND type = 'expense'
  AND category != 'Balance Correction'
  AND transaction_date BETWEEN $2 AND $3
  AND is_active = true
GROUP BY category
ORDER BY total DESC;
```

Index yang sudah direncanakan di PROP-0001 (`by_date`, `by_anon_id`) cukup untuk query ini.

---

## 5. UX Walkthrough

### Flow: B1 — Saving Rate di Realtime

1. User buka tab Report → default tab Realtime
2. Di bawah period label, tampil "Saving Rate" card: "38% — Bulan ini"
3. Progress bar hijau (≥20% = sehat)
4. User tap card → tidak ada aksi (informational only), atau expand ke detail income/expense

### Flow: A1 — Bar Chart di Monthly (opsi beta)

1. User buka tab Monthly
2. Section pertama: "6-Month Overview" — bar chart grouped income/expense
3. User tap bar "Apr" → navigasi ke `/report/detail?start=2026-04-01&end=2026-04-30`
4. Report detail terbuka seperti biasa (donut chart + daily summary + transaction list)

### Flow: C1 — Income Donut Toggle

1. User di tab Realtime, melihat donut expense
2. Tap toggle "Income" di atas chart
3. Donut berganti: income per kategori, legend update
4. Transaction list di bawah berubah ke income transactions
5. User tap salah satu segment → filter list ke kategori income tersebut

### Flow: D1 — Loan Aging di Realtime

1. User di tab Realtime
2. Jika ada outstanding loan → "Loan Outstanding" section muncul di bawah donut chart
3. Tampil maks 3 counterparty dengan outstanding + aging (hari)
4. Tap "Lihat semua ›" → navigate ke `/loan`
5. Jika tidak ada outstanding → section tidak muncul sama sekali

### Edge Cases Global:

| Kondisi | Handling |
|---|---|
| User baru, belum ada transaksi | Semua section baru tampilkan empty state sesuai konteks (mis. chart kosong dengan teks "Belum ada data") |
| Hanya ada 1 bulan data | Bar chart A1 menampilkan 1 bar, tidak crash |
| Income = 0 bulan ini | Saving Rate = N/A, Income Donut = empty state "Belum ada pemasukan bulan ini" |
| Data sangat banyak (2000+ transaksi) | Memoize kalkulasi dengan useMemo — tidak re-compute kecuali dep berubah |
| Offline (PWA) | Semua fitur berjalan offline karena data di IndexedDB lokal |

---

## 6. Open Questions

- [ ] **A1 Bar Chart opsi:** Apakah gunakan opsi alpha (tab baru "Trends") atau beta (section di Monthly)? Tradeoff navigasi vs discoverability.
- [ ] **Tab Switcher 4 item (jika opsi alpha):** Perlu verifikasi visual di 375px. Apakah label "Realtime" perlu disingkat menjadi "Live" atau "Sekarang"?
- [ ] **B1 Saving Rate — benchmark:** Apakah benchmark "20% = sehat" perlu bisa dikustom user? Atau selalu hardcoded? Rekomendasi: hardcoded untuk simplicity Fase 1.
- [ ] **B2 Insight — threshold:** Berapa persen kenaikan kategori yang dianggap "significant" untuk ditampilkan sebagai insight? Proposal menyarankan 30% — perlu validasi dengan data nyata.
- [ ] **C2 Net Worth — apakah loan masuk?** Sudah diputuskan yes (konsisten dengan endBalance formula), tapi perlu konfirmasi dengan user.
- [ ] **D1 Loan Aging:** Definisi "hari outstanding" — dihitung dari tanggal entry terakhir, atau dari tanggal entry pertama yang belum terlunasi?
- [ ] **Recharts version:** Bar chart menggunakan `BarChart` dari Recharts (sudah ada di dependencies). Perlu konfirmasi versi yang terpasang mendukung `grouped` bar dan responsive container di 375px.

---

## 7. Out of Scope

Fitur-fitur berikut **tidak** dicakup proposal ini dan perlu proposal terpisah jika ingin diimplementasi:

- **Budget per kategori per bulan** (perlu data baru: `budget_configs` — satu localStorage/IDB key baru)
- **Recurring transactions** (perlu template store baru)
- **Spending prediction / forecast** (butuh algoritma proyeksi — perlu proposal dedicated)
- **PWA push notification** untuk loan reminders (Fase 2 territory — butuh service worker push)
- **Export laporan ke PDF/Excel** (khusus Report module — bisa jadi proposal sendiri)
- **Perbandingan tahun ke tahun (YoY)** — bisa masuk sebagai custom report dengan range 1 tahun, sudah ter-cover oleh fitur Custom Report yang ada
- **Family/shared wallet** analytics — Fase 2

---

## 8. Implementation Roadmap

### Prioritas implementasi yang disarankan:

**Gelombang 1 — P0, effort XS-S (lakukan duluan, quick win):**

| Fitur | Effort | Agent yang disarankan |
|---|---|---|
| B1 — Saving Rate Display | XS | `module-report-dev` |
| C1 — Income Donut Toggle | S | `module-report-dev` |
| A1-beta — Bar Chart section di Monthly | S | `module-report-dev` |

**Gelombang 2 — P1, effort S-M:**

| Fitur | Effort | Agent yang disarankan |
|---|---|---|
| E1 — Daily Bar Chart di Report Detail | S | `module-report-dev` |
| C2 — Net Worth Line Chart | M | `module-report-dev` |
| B2 — Top Spending Insight Card | M | `module-report-dev` (hati-hati threshold logic) |

**Gelombang 3 — P1-P2, effort M:**

| Fitur | Effort | Agent yang disarankan |
|---|---|---|
| A2 — Category Trend Drill-down | M | `module-report-dev` |
| D1 — Loan Aging di Report | S | `module-report-dev` |

### Rekomendasi implementasi per gelombang:

**Gelombang 1 detail:**

1. **B1 Saving Rate** — Modifikasi `PeriodSummaryRows` component dan tab Realtime. Tambah satu baris ke `MonthlySummary` display dan satu card kecil di Realtime. Zero new calculation functions — gunakan `income` dan `expenses` yang sudah dihitung.

2. **C1 Income Donut Toggle** — Refactor `calcCategoryBreakdown` di `calculations.ts` untuk accept parameter `type: "expense" | "income"`. Tambah toggle pill di atas donut di Realtime dan Report Detail pages.

3. **A1-beta Bar Chart** — Tambah section `MonthlyOverviewChart` di atas list section di Monthly tab. Gunakan `BarChart` dari Recharts. Data: loop 6 bulan terakhir, panggil `calcIncome` + `calcExpenses` per bulan, memoize.

**Setelah Gelombang 1:** Jalankan `/audit-spec` dan `mobile-ui-tester` untuk verifikasi:
- Tap targets ≥44px di semua element baru
- Viewport 375/390/430px semua tidak ada overflow
- Locale id-ID dipakai untuk semua angka yang ditampilkan
- Token warna (`--color-positive`, `--color-negative`) dipakai, bukan hex langsung

---

## 9. Analisis Kompetitor — Ringkasan Temuan

| Fitur | Monefy | Money Lover | Wallet BudgetBakers | YNAB | Sribuu | Usulan PFinTrack |
|---|---|---|---|---|---|---|
| Bar chart bulanan | Ya (daily/monthly) | Ya | Ya | Ya | Ya | A1 |
| Saving rate / rasio | Tidak | Via budget | Via gauges | "Age Your Money" | Tidak | B1 |
| Auto insights | Tidak | Prediksi spending | Gauge "outlook" | Tidak | Ya (text analysis) | B2 |
| Income donut | Tidak | Ya | Ya | Ya | Ya | C1 |
| Net worth trend | Tidak | Tidak | Ya (balance history) | Ya | Tidak | C2 |
| Loan/debt aging | Tidak | Tidak | Via debt tracking | Tidak | Tidak | D1 |
| Daily bar di drill-down | Ya | Tidak | Tidak | Tidak | Tidak | E1 |

**Insight dari kompetitor:**
- Fitur yang paling **universal** di semua kompetitor: bar chart per bulan dan income vs expense comparison — ini konfirmasi A1 dan C1 adalah P0.
- Fitur yang paling **diferensiasi** PFinTrack vs kompetitor: Loan Aging terintegrasi di Report (D1) — tidak ada kompetitor yang melakukan ini secara mulus.
- Fitur yang paling **Indonesia-specific**: saving rate dengan warna hijau/kuning/merah sesuai threshold "keuangan sehat" — relevan untuk target user yang melek keuangan dasar.

---

## Decision Log

| Tanggal | Keputusan | Rationale |
|---|---|---|
| 2026-05-07 | Draft dibuat | Riset kompetitor + baca spec lengkap sebelum menulis |
| 2026-05-07 | Tidak tambah localStorage/IDB key baru | Semua 8 fitur bisa computed-on-the-fly dari data existing — tidak ada alasan memperumit storage |
| 2026-05-07 | A1 opsi beta (section di Monthly) sebagai default | Menghindari risiko tab switcher 4-item di 375px; tab ke-4 bisa dipertimbangkan jika Trends category berkembang |
| 2026-05-07 | B1 saving rate benchmark 20% hardcoded | KISS principle — konfigurasi benchmark menambah complexity UI tanpa nilai proporsional untuk Fase 1 |
| 2026-05-07 | C2 net worth include loan | Konsisten dengan `endBalance` formula di spec §4.8 — tidak perlu formula baru |
| 2026-05-07 | B2 dismiss state ke sessionStorage (bukan localStorage) | Insight card bukan data finansial — ephemeral UI state, reset setiap session adalah behavior yang diinginkan |
| 2026-05-07 | Budget per kategori dikeluarkan dari scope | Butuh data baru (budget_configs) yang memerlukan IDB key baru — scope proposal terpisah |
