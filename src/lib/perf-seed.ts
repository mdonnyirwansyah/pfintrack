/**
 * Performance Seed — pure data generator for dev/perf testing.
 *
 * Produces ~7,000–9,000 transactions over 5 years (from today backwards) with
 * realistic Indonesian patterns: monthly salary with raises, THR Lebaran,
 * year-end bonus, daily food, weekly groceries, monthly bills, transport,
 * health, shopping, weekend entertainment, 3 vacations/year, 1-2 big
 * purchases/year, 2-4 balance corrections/year, and 5 loan counterparties.
 *
 * **Pure function** — no IDB, no DOM, no localStorage access. Returns a
 * `BackupData` object that can be:
 *   - written to a `.json` file via the CLI (`scripts/generate-perf-seed.ts`)
 *     and imported into the app via Settings → Restore Backup, OR
 *   - inlined into a test fixture / unit benchmark.
 *
 * Deterministic: PRNG seeded with `0xc0ffee` → identical output each run.
 */

import type { BackupData } from "@/lib/storage/backup";
import type { Wallet, WalletBalanceHistory, WalletType } from "@/lib/types/wallet";
import type { Transaction, TransactionType } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry, LoanEntryType } from "@/lib/types/loan";
import type { CustomReport } from "@/lib/types/report";

const YEARS = 5;
const MS_PER_DAY = 86_400_000;

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PerfSeedOptions {
  /** Anon ID to stamp on every record. Required because backup-import expects matching IDs. */
  anonId: string;
  /** Reference "today" — defaults to actual today. Override for reproducible tests. */
  today?: Date;
  /** PRNG seed. Default 0xc0ffee. */
  seed?: number;
  /** Number of years of history to generate. Default 5. */
  years?: number;
}

export interface PerfSeedResult {
  data: BackupData;
  counts: Readonly<{
    wallets: number;
    transactions: number;
    walletBalanceHistory: number;
    loanCounterparties: number;
    loanEntries: number;
    customReports: number;
  }>;
}

export function generatePerfSeedData(options: Readonly<PerfSeedOptions>): PerfSeedResult {
  const rng = makeRng(options.seed ?? 0xc0ffee);
  const years = options.years ?? YEARS;
  const today = options.today ? new Date(options.today) : new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today.getTime() - years * 365 * MS_PER_DAY);
  const anonId = options.anonId;

  function randInt(min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
  }
  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }
  function chance(p: number): boolean {
    return rng() < p;
  }
  function r500(n: number): number {
    return Math.round(n / 500) * 500;
  }
  function r1k(n: number): number {
    return Math.round(n / 1000) * 1000;
  }
  function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
  function dateAt(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function timeAt(h: number, m: number): string {
    return `${pad2(h)}:${pad2(m)}`;
  }
  // Deterministic UUID v4 generator from rng (avoids global crypto for Node CLI portability).
  function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (c) => {
      const r = (rng() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ── Wallets ──────────────────────────────────────────────────────────────
  const walletsDef: ReadonlyArray<Readonly<{ name: string; type: WalletType; opening: number }>> = [
    { name: "BCA",            type: "bank",          opening: 12_500_000 },
    { name: "Jago",           type: "bank_digital",  opening:  2_800_000 },
    { name: "GoPay",          type: "e_wallet",      opening:    750_000 },
    { name: "Tunai",          type: "other",         opening:    500_000 },
    { name: "Reksadana",      type: "investment",    opening:  8_000_000 },
    { name: "Tabungan Emas",  type: "digital_asset", opening:  3_200_000 },
  ];
  const wallets: Wallet[] = walletsDef.map((w, i) => {
    const createdAt = new Date(startDate.getTime() - (i + 1) * MS_PER_DAY).toISOString();
    return {
      id: uuid(),
      anon_id: anonId,
      name: w.name,
      wallet_type: w.type,
      balance: 0,
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
  const byName: Record<string, Wallet> = Object.fromEntries(wallets.map((w) => [w.name, w]));
  const balances: Record<string, number> = Object.fromEntries(wallets.map((w) => [w.id, 0]));

  const transactions: Transaction[] = [];
  const balanceHistory: WalletBalanceHistory[] = [];

  function addTx(t: Readonly<{
    type: TransactionType;
    walletId: string;
    destWalletId?: string | null;
    amount: number;
    title: string;
    category: string;
    date: Date;
    time: string;
    description?: string | null;
  }>): void {
    const iso = `${dateAt(t.date)}T${t.time}:00.000Z`;
    transactions.push({
      id: uuid(),
      anon_id: anonId,
      type: t.type,
      wallet_id: t.walletId,
      destination_wallet_id: t.destWalletId ?? null,
      amount: t.amount,
      title: t.title,
      category: t.category,
      description: t.description ?? null,
      transaction_date: dateAt(t.date),
      transaction_time: t.time,
      is_active: true,
      created_at: iso,
      updated_at: iso,
    });
    if (t.type === "income") balances[t.walletId] += t.amount;
    else if (t.type === "expense") balances[t.walletId] -= t.amount;
    else if (t.type === "transfer" && t.destWalletId) {
      balances[t.walletId] -= t.amount;
      balances[t.destWalletId] += t.amount;
    }
  }

  function addBalanceHistory(walletId: string, prev: number, next: number, when: Date): void {
    const iso = when.toISOString();
    balanceHistory.push({
      id: uuid(),
      anon_id: anonId,
      wallet_id: walletId,
      previous_balance: prev,
      new_balance: next,
      delta: next - prev,
      corrected_at: iso,
      is_active: true,
      created_at: iso,
      updated_at: iso,
    });
  }

  // Opening balances via Balance Correction
  for (const w of walletsDef) {
    if (w.opening <= 0) continue;
    const wallet = byName[w.name];
    addBalanceHistory(wallet.id, 0, w.opening, startDate);
    addTx({
      type: "income",
      walletId: wallet.id,
      amount: w.opening,
      title: "Balance Correction",
      category: "Balance Correction",
      date: startDate,
      time: "07:00",
      description: `Opening balance ${w.name}`,
    });
  }

  const bca = byName.BCA;
  const jago = byName.Jago;
  const gopay = byName.GoPay;
  const tunai = byName.Tunai;
  const reksa = byName.Reksadana;
  const emas = byName["Tabungan Emas"];
  const startYear = startDate.getFullYear();
  const yearIdx = (d: Date) => d.getFullYear() - startYear;
  const inflate = (base: number, d: Date) => base * Math.pow(1.06, yearIdx(d));
  const salaryFor = (d: Date) => r1k(12_500_000 * Math.pow(1.08, yearIdx(d)));

  const FOOD_LUNCH = [
    "Nasi Padang", "Warteg", "Ayam Geprek", "Indomie Goreng", "Sushi Tei",
    "GrabFood Lunch", "ShopeeFood", "Bento Box", "Nasi Uduk", "Mie Ayam",
    "Bakso Malang", "Soto Betawi", "Gado-Gado", "Sate Ayam", "Pecel Lele",
  ];
  const FOOD_DINNER = [
    "Makan Malam Keluarga", "Dinner Restoran", "GrabFood Dinner", "Hokben",
    "KFC", "McD", "Pizza Hut", "Yoshinoya", "Marugame", "Solaria",
  ];
  const FOOD_SNACK = [
    "Kopi Kenangan", "Starbucks", "Janji Jiwa", "Tomoro Coffee", "Roti Bakery",
    "Es Teh Indonesia", "Mixue", "Snack Indomaret", "Buah Potong", "Donat",
  ];
  const TRANSPORT_DAILY = ["Ojek Online", "Grab Bike", "Gojek", "Parkir", "Tol"];
  const TRANSPORT_FUEL = ["Bensin Pertamax", "Bensin Pertalite", "Service Motor"];
  const ENT_SUB = [
    { name: "Spotify Premium",   amount:  54_990 },
    { name: "Netflix",           amount:  65_000 },
    { name: "YouTube Premium",   amount:  59_000 },
    { name: "Disney+ Hotstar",   amount:  39_000 },
    { name: "Apple iCloud",      amount:  15_000 },
  ];
  const HEALTH = ["Apotek Kimia Farma", "Apotek Century", "Vitamin & Suplemen", "Konsultasi Dokter"];
  const SHOPPING = [
    "Baju Uniqlo", "Sepatu Adidas", "Tas Eiger", "Skincare", "Parfum",
    "Peralatan Rumah", "Buku Gramedia", "Aksesoris HP", "Cable & Charger",
  ];
  const FREELANCE = [
    "Project Website Klien", "Konsultasi IT", "Design Logo",
    "Copywriting", "Mentoring", "Freelance Mobile App", "Audit Code",
  ];
  const TRAVEL = [
    { dest: "Bali",       amount: 4_500_000 },
    { dest: "Yogyakarta", amount: 2_800_000 },
    { dest: "Bandung",    amount: 1_500_000 },
    { dest: "Lombok",     amount: 5_200_000 },
    { dest: "Singapore",  amount: 7_500_000 },
    { dest: "Malang",     amount: 1_800_000 },
  ];
  const BIG_PURCHASES = [
    { name: "Laptop Baru",           amount: 18_500_000 },
    { name: "Smartphone Baru",       amount: 12_800_000 },
    { name: "Service Motor Besar",   amount:  2_200_000 },
    { name: "TV LED 50 inch",        amount:  6_900_000 },
    { name: "Mesin Cuci",            amount:  4_500_000 },
    { name: "Sepeda Lipat",          amount:  5_400_000 },
    { name: "Kursi Kerja Ergonomis", amount:  3_200_000 },
  ];

  const endDate = new Date(today);
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + MS_PER_DAY)) {
    const day = new Date(d);
    const dom = day.getDate();
    const month = day.getMonth() + 1;
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;

    if (dom === 25) {
      addTx({ type: "income", walletId: bca.id, amount: salaryFor(day),
        title: `Gaji ${day.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
        category: "Pendapatan", date: day, time: timeAt(8, 0),
        description: "Transfer gaji bulanan" });
      addTx({ type: "transfer", walletId: bca.id, destWalletId: reksa.id,
        amount: r1k(inflate(1_500_000, day)), title: "DCA Reksadana",
        category: "Transfer", date: day, time: timeAt(8, 15) });
      addTx({ type: "transfer", walletId: bca.id, destWalletId: emas.id,
        amount: r500(inflate(500_000, day)), title: "Beli Tabungan Emas",
        category: "Transfer", date: day, time: timeAt(8, 20) });
      addTx({ type: "transfer", walletId: bca.id, destWalletId: jago.id,
        amount: r1k(inflate(3_000_000, day)), title: "Top Up Jago",
        category: "Transfer", date: day, time: timeAt(8, 25) });
      addTx({ type: "transfer", walletId: bca.id, destWalletId: tunai.id,
        amount: r500(inflate(700_000, day)), title: "Ambil Tunai",
        category: "Transfer", date: day, time: timeAt(8, 30) });
    }

    if (dom === 1) {
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(450_000, day)),
        title: "Tagihan Listrik PLN", category: "Tagihan", date: day, time: timeAt(9, 0) });
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(265_000, day)),
        title: "Internet IndiHome", category: "Tagihan", date: day, time: timeAt(9, 5) });
      addTx({ type: "expense", walletId: bca.id, amount: 160_000,
        title: "BPJS Kesehatan", category: "Tagihan", date: day, time: timeAt(9, 10) });
    }
    if (dom === 2) {
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(3_500_000, day)),
        title: "Cicilan KPR", category: "Tagihan", date: day, time: timeAt(9, 0) });
    }
    if (dom === 5) {
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(135_000, day)),
        title: "Tagihan Air PAM", category: "Tagihan", date: day, time: timeAt(9, 30) });
      for (const sub of ENT_SUB) {
        if (chance(0.95)) {
          addTx({ type: "expense", walletId: bca.id, amount: sub.amount,
            title: sub.name, category: "Hiburan", date: day, time: timeAt(10, 0) });
        }
      }
    }

    if (month === 6 && dom === 15) {
      addTx({ type: "income", walletId: bca.id, amount: salaryFor(day),
        title: "THR Lebaran", category: "Pendapatan", date: day, time: timeAt(10, 0),
        description: "Tunjangan Hari Raya" });
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(2_500_000, day)),
        title: "THR Keluarga", category: "Lain-lain", date: day, time: timeAt(14, 0),
        description: "Angpao Lebaran untuk keluarga" });
      addTx({ type: "expense", walletId: bca.id, amount: r1k(inflate(1_800_000, day)),
        title: "Belanja Lebaran", category: "Belanja", date: day, time: timeAt(15, 0) });
    }

    if (month === 12 && dom === 20) {
      addTx({ type: "income", walletId: bca.id, amount: r1k(salaryFor(day) * 0.75),
        title: "Bonus Akhir Tahun", category: "Pendapatan", date: day, time: timeAt(10, 0),
        description: "Bonus tahunan" });
    }

    if (chance(0.025)) {
      addTx({ type: "income", walletId: bca.id,
        amount: r1k(inflate(2_500_000 + rng() * 3_500_000, day)),
        title: pick(FREELANCE), category: "Pendapatan", date: day,
        time: timeAt(randInt(10, 17), randInt(0, 59)),
        description: "Pembayaran project sampingan" });
    }

    const foodEntries = randInt(2, 4);
    for (let i = 0; i < foodEntries; i++) {
      const meal = i === 0 ? FOOD_LUNCH : i === 1 ? FOOD_SNACK : FOOD_DINNER;
      const wallet = chance(0.6) ? gopay : chance(0.5) ? jago : tunai;
      const base = i === 0 ? randInt(25_000, 90_000) : i === 1 ? randInt(15_000, 55_000) : randInt(40_000, 120_000);
      addTx({ type: "expense", walletId: wallet.id,
        amount: r500(inflate(base, day)), title: pick(meal),
        category: "Makanan & Minuman", date: day,
        time: timeAt(i === 0 ? 12 : i === 1 ? 9 : 19, randInt(0, 59)) });
    }

    if (dow === 6 && chance(0.85)) {
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(randInt(350_000, 850_000), day)),
        title: "Belanja Mingguan", category: "Makanan & Minuman",
        date: day, time: timeAt(10, randInt(0, 59)),
        description: "Belanja bahan dapur & kebutuhan rumah" });
    }

    if (!isWeekend && chance(0.7)) {
      addTx({ type: "expense", walletId: gopay.id,
        amount: r500(inflate(randInt(20_000, 65_000), day)),
        title: pick(TRANSPORT_DAILY), category: "Transportasi",
        date: day, time: timeAt(randInt(7, 9), randInt(0, 59)) });
    }
    if (chance(0.10)) {
      addTx({ type: "expense", walletId: tunai.id,
        amount: r1k(inflate(randInt(150_000, 220_000), day)),
        title: pick(TRANSPORT_FUEL), category: "Transportasi",
        date: day, time: timeAt(7, randInt(0, 59)) });
    }

    if (chance(0.04)) {
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(randInt(85_000, 350_000), day)),
        title: pick(HEALTH), category: "Kesehatan",
        date: day, time: timeAt(randInt(10, 18), randInt(0, 59)) });
    }

    if (chance(0.08)) {
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(randInt(120_000, 750_000), day)),
        title: pick(SHOPPING), category: "Belanja",
        date: day, time: timeAt(randInt(14, 21), randInt(0, 59)) });
    }

    if (isWeekend && chance(0.35)) {
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(randInt(75_000, 280_000), day)),
        title: pick(["Nonton Bioskop", "Karaoke", "Game Top-Up", "Konser", "Mall Hangout"]),
        category: "Hiburan", date: day,
        time: timeAt(randInt(15, 22), randInt(0, 59)) });
    }

    if (chance(0.015)) {
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(randInt(150_000, 450_000), day)),
        title: pick(["Kursus Online Udemy", "Buku Programming", "Webinar Berbayar", "Coursera Plus"]),
        category: "Pendidikan", date: day,
        time: timeAt(randInt(19, 22), randInt(0, 59)) });
    }
  }

  // Annual vacations (3/year)
  for (let y = 0; y < years; y++) {
    for (const m of [3, 7, 11]) {
      const date = new Date(startDate.getFullYear() + y, m - 1, randInt(5, 25));
      if (date > endDate) continue;
      const trip = pick(TRAVEL);
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(trip.amount, date)),
        title: `Liburan ${trip.dest}`, category: "Hiburan",
        date, time: timeAt(randInt(8, 12), randInt(0, 59)),
        description: `Trip ke ${trip.dest} bersama keluarga` });
    }
  }

  // Big purchases (1-2/year)
  for (let y = 0; y < years; y++) {
    const n = randInt(1, 2);
    for (let i = 0; i < n; i++) {
      const date = new Date(startDate.getFullYear() + y, randInt(0, 11), randInt(1, 28));
      if (date > endDate) continue;
      const item = pick(BIG_PURCHASES);
      addTx({ type: "expense", walletId: bca.id,
        amount: r1k(inflate(item.amount, date)),
        title: item.name, category: "Belanja",
        date, time: timeAt(randInt(11, 18), randInt(0, 59)),
        description: "Pembelian besar tahunan" });
    }
  }

  // Balance corrections (2-4/year)
  for (let y = 0; y < years; y++) {
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const date = new Date(startDate.getFullYear() + y, randInt(0, 11), randInt(1, 28));
      if (date > endDate) continue;
      const wallet = pick([bca, jago]);
      const delta = (chance(0.5) ? 1 : -1) * randInt(5_000, 75_000);
      const prev = balances[wallet.id];
      const next = prev + delta;
      addBalanceHistory(wallet.id, prev, next, date);
      addTx({ type: delta > 0 ? "income" : "expense", walletId: wallet.id,
        amount: Math.abs(delta), title: "Balance Correction",
        category: "Balance Correction", date,
        time: timeAt(randInt(9, 17), randInt(0, 59)),
        description: "Penyesuaian saldo (admin fee / reconcile)" });
    }
  }

  // ── Loans ───────────────────────────────────────────────────────────────
  const counterparties: LoanCounterparty[] = [];
  const loanEntries: LoanEntry[] = [];

  function addCounterparty(name: string, manualPaidOff: boolean, daysBack: number): LoanCounterparty {
    const created = new Date(today.getTime() - daysBack * MS_PER_DAY).toISOString();
    const cp: LoanCounterparty = {
      id: uuid(), anon_id: anonId, name, manual_paid_off: manualPaidOff,
      is_active: true, created_at: created, updated_at: created,
    };
    counterparties.push(cp);
    return cp;
  }
  function addLoanEntry(
    cp: LoanCounterparty, type: LoanEntryType, amount: number,
    walletId: string | null, note: string, daysBack: number,
  ): void {
    const date = new Date(today.getTime() - daysBack * MS_PER_DAY);
    const iso = date.toISOString();
    loanEntries.push({
      id: uuid(), anon_id: anonId, counterparty_id: cp.id, type, amount,
      wallet_id: walletId, note,
      transaction_date: dateAt(date),
      transaction_time: timeAt(randInt(10, 18), randInt(0, 59)),
      is_active: true, created_at: iso, updated_at: iso,
    });
    if (walletId) {
      if (type === "give") balances[walletId] -= amount;
      else balances[walletId] += amount;
    }
  }

  const budi = addCounterparty("Budi Santoso", false, 1500);
  addLoanEntry(budi, "give", 2_000_000, bca.id, "Pinjam untuk DP motor", 1450);
  addLoanEntry(budi, "get",    500_000, bca.id, "Cicilan 1", 1200);
  addLoanEntry(budi, "get",    500_000, bca.id, "Cicilan 2", 900);
  addLoanEntry(budi, "get",    500_000, bca.id, "Cicilan 3", 600);
  addLoanEntry(budi, "give",   800_000, bca.id, "Pinjam tambahan biaya rumah sakit", 400);
  addLoanEntry(budi, "get",    300_000, bca.id, "Bayar sebagian", 200);

  const sinta = addCounterparty("Sinta Maharani", false, 1100);
  addLoanEntry(sinta, "get", 1_500_000, gopay.id, "Patungan sewa villa", 1080);
  addLoanEntry(sinta, "give", 750_000, gopay.id, "Bagi dua biaya", 1070);
  addLoanEntry(sinta, "give", 750_000, gopay.id, "Lunas", 1050);

  const andi = addCounterparty("Andi Pratama", false, 900);
  addLoanEntry(andi, "give", 5_000_000, bca.id, "Modal usaha warung kopi", 880);
  addLoanEntry(andi, "get",  1_000_000, bca.id, "Bagi hasil bulan 1", 700);
  addLoanEntry(andi, "get",  1_200_000, bca.id, "Bagi hasil bulan 2", 600);
  addLoanEntry(andi, "get",    800_000, bca.id, "Bagi hasil bulan 3", 450);

  const dewi = addCounterparty("Dewi Lestari", false, 1300);
  addLoanEntry(dewi, "give",   300_000, gopay.id, "Pinjam makan siang", 1280);
  addLoanEntry(dewi, "get",    300_000, gopay.id, "Lunas", 1270);
  addLoanEntry(dewi, "get",    500_000, gopay.id, "Pinjam ke Dewi (saya yang minjam)", 800);
  addLoanEntry(dewi, "give",   500_000, gopay.id, "Bayar lunas", 750);
  addLoanEntry(dewi, "give",   200_000, gopay.id, "Pinjam lagi (Dewi yg minjam)", 300);

  const pakRT = addCounterparty("Pak RT", true, 1700);
  addLoanEntry(pakRT, "get",  3_000_000, bca.id, "Pinjaman renovasi rumah", 1680);
  addLoanEntry(pakRT, "give", 1_500_000, bca.id, "Cicilan 1", 1400);
  addLoanEntry(pakRT, "give", 1_500_000, bca.id, "Lunas (manual mark)", 1100);

  // ── Custom reports ───────────────────────────────────────────────────────
  const customReports: CustomReport[] = [];
  function addReport(name: string, startD: Date, endD: Date): void {
    const iso = startD.toISOString();
    customReports.push({
      id: uuid(), anon_id: anonId, name,
      start_date: dateAt(startD), end_date: dateAt(endD),
      is_active: true, created_at: iso, updated_at: iso,
    });
  }
  addReport("Pengeluaran Lebaran 2024",
    new Date(startYear + 3, 5, 1), new Date(startYear + 3, 5, 30));
  addReport("Tahun Pertama Investasi",
    new Date(startYear, 0, 1), new Date(startYear, 11, 31));
  addReport("Q1 2026 — Review Kuartalan",
    new Date(2026, 0, 1), new Date(2026, 2, 31));

  // Finalize wallet balances from accumulated changes
  for (const w of wallets) {
    w.balance = balances[w.id];
    w.updated_at = today.toISOString();
  }

  const data: BackupData = {
    version: 1,
    exported_at: today.toISOString(),
    wallets,
    wallet_balance_history: balanceHistory,
    transactions,
    loan_counterparties: counterparties,
    loan_entries: loanEntries,
    custom_reports: customReports,
  };

  return {
    data,
    counts: {
      wallets: wallets.length,
      transactions: transactions.length,
      walletBalanceHistory: balanceHistory.length,
      loanCounterparties: counterparties.length,
      loanEntries: loanEntries.length,
      customReports: customReports.length,
    },
  };
}
