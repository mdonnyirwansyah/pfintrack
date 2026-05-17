import type { BackupData } from "@/lib/storage/backup";
import type { Wallet, WalletBalanceHistory, WalletType } from "@/lib/types/wallet";
import type { Transaction, TransactionType } from "@/lib/types/transaction";
import type { LoanCounterparty, LoanEntry, LoanEntryType } from "@/lib/types/loan";
import type { CustomReport } from "@/lib/types/report";

const YEARS = 5;
const MS_PER_DAY = 86_400_000;

function r500(n: number): number {
  return Math.round(n / 500) * 500;
}
function r1k(n: number): number {
  return Math.round(n / 1000) * 1000;
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function timeAt(h: number, m: number): string {
  return `${pad2(h)}:${pad2(m)}`;
}

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
  anonId: string;
  today?: Date;
  seed?: number;
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
    skippedForBalance: number;
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
  function dateAt(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (c) => {
      const r = Math.trunc(rng() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const walletsDef: ReadonlyArray<Readonly<{ name: string; type: WalletType; opening: number }>> = [
    { name: "BCA",            type: "bank",          opening: 50_000_000 },
    { name: "Jago",           type: "bank_digital",  opening:  5_000_000 },
    { name: "GoPay",          type: "e_wallet",      opening:  1_500_000 },
    { name: "Tunai",          type: "other",         opening:    800_000 },
    { name: "Reksadana",      type: "investment",    opening: 25_000_000 },
    { name: "Tabungan Emas",  type: "digital_asset", opening:  8_000_000 },
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
  const walletName: Record<string, string> = Object.fromEntries(wallets.map((w) => [w.id, w.name]));
  const balances: Record<string, number> = Object.fromEntries(wallets.map((w) => [w.id, 0]));

  const transactions: Transaction[] = [];
  const balanceHistory: WalletBalanceHistory[] = [];
  let skippedForBalance = 0;

  function rawAddTx(t: Readonly<{
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

  function seedOpeningBalances(): void {
    for (const w of walletsDef) {
      if (w.opening <= 0) continue;
      const wallet = byName[w.name];
      addBalanceHistory(wallet.id, 0, w.opening, startDate);
      rawAddTx({
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
  }
  seedOpeningBalances();

  const bca = byName.BCA;
  const jago = byName.Jago;
  const gopay = byName.GoPay;
  const tunai = byName.Tunai;
  const reksa = byName.Reksadana;
  const emas = byName["Tabungan Emas"];
  const startYear = startDate.getFullYear();
  const yearIdx = (d: Date) => d.getFullYear() - startYear;
  const inflate = (base: number, d: Date) => base * Math.pow(1.06, yearIdx(d));
  const salaryFor = (d: Date) => r1k(15_000_000 * Math.pow(1.08, yearIdx(d)));

  function spendFrom(t: Readonly<{
    walletId: string;
    amount: number;
    title: string;
    category: string;
    date: Date;
    time: string;
    description?: string | null;
  }>): boolean {
    if (balances[t.walletId] >= t.amount) {
      rawAddTx({ type: "expense", ...t });
      return true;
    }
    if (t.walletId === bca.id) {
      skippedForBalance++;
      return false;
    }
    const deficit = t.amount - balances[t.walletId];
    const topUp = r1k(deficit + 300_000);
    if (balances[bca.id] < topUp) {
      skippedForBalance++;
      return false;
    }

    const [hh, mm] = t.time.split(":").map((x) => Number.parseInt(x, 10));
    const topUpTime = timeAt(hh, Math.max(0, mm - 1));
    rawAddTx({
      type: "transfer",
      walletId: bca.id,
      destWalletId: t.walletId,
      amount: topUp,
      title: `Top Up ${walletName[t.walletId]}`,
      category: "Transfer",
      date: t.date,
      time: topUpTime,
    });
    rawAddTx({ type: "expense", ...t });
    return true;
  }

  function transferFromBCA(t: Readonly<{
    destWalletId: string;
    amount: number;
    title: string;
    date: Date;
    time: string;
  }>): boolean {
    if (balances[bca.id] < t.amount) {
      skippedForBalance++;
      return false;
    }
    rawAddTx({
      type: "transfer",
      walletId: bca.id,
      destWalletId: t.destWalletId,
      amount: t.amount,
      title: t.title,
      category: "Transfer",
      date: t.date,
      time: t.time,
    });
    return true;
  }

  function addIncome(t: Readonly<{
    walletId: string;
    amount: number;
    title: string;
    category: string;
    date: Date;
    time: string;
    description?: string | null;
  }>): void {
    rawAddTx({ type: "income", ...t });
  }

  const BREAKFAST = [
    "Nasi Uduk", "Bubur Ayam", "Lontong Sayur", "Roti Bakar", "Sarapan Indomaret",
    "Mie Instan", "Soto Pagi", "Nasi Kuning", "Lupis & Klepon", "Ketoprak",
  ];
  const LUNCH = [
    "Nasi Padang", "Warteg", "Ayam Geprek", "Nasi Goreng", "Sushi Tei",
    "GrabFood Lunch", "ShopeeFood", "Bento Box", "Mie Ayam", "Bakso Malang",
    "Soto Betawi", "Gado-Gado", "Sate Ayam", "Pecel Lele", "Hokben Lunch",
  ];
  const DINNER = [
    "Makan Malam Keluarga", "Dinner Restoran", "GrabFood Dinner", "Hokben",
    "KFC", "McD", "Pizza Hut", "Yoshinoya", "Marugame", "Solaria",
    "Ayam Bakar", "Seafood Pinggir Jalan", "Steak Lokal",
  ];
  const SNACK_DRINK = [
    "Kopi Kenangan", "Starbucks", "Janji Jiwa", "Tomoro Coffee", "Es Teh Indonesia",
    "Mixue", "Chatime", "Es Krim", "Donat", "Roti Bakery", "Air Mineral", "Buah Potong",
  ];
  const CONVENIENCE = [
    "Indomaret", "Alfamart", "Lawson", "FamilyMart", "Circle K",
  ];
  const TRANSPORT_DAILY = ["Ojek Online", "Grab Bike", "Gojek", "Parkir", "Tol", "Angkot", "TransJakarta"];
  const TRANSPORT_FUEL = ["Bensin Pertamax", "Bensin Pertalite", "Service Motor"];
  const ENT_SUB = [
    { name: "Spotify Premium",   amount:  54_990 },
    { name: "Netflix",           amount:  65_000 },
    { name: "YouTube Premium",   amount:  59_000 },
    { name: "Disney+ Hotstar",   amount:  39_000 },
    { name: "Apple iCloud",      amount:  15_000 },
  ];
  const PULSA_DATA = ["Pulsa Telkomsel", "Kuota Internet", "Paket Data XL", "Pulsa Indosat"];
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

  function dailyWallet(): string {
    const r = rng();
    if (r < 0.55) return gopay.id;
    if (r < 0.8) return jago.id;
    return tunai.id;
  }

  function simulateMonthly(day: Date, dom: number, month: number): void {
    if (dom === 25) {
      addIncome({ walletId: bca.id, amount: salaryFor(day),
        title: `Gaji ${day.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
        category: "Pendapatan", date: day, time: timeAt(8, 0),
        description: "Transfer gaji bulanan" });
      transferFromBCA({ destWalletId: reksa.id,
        amount: r1k(inflate(2_000_000, day)), title: "DCA Reksadana",
        date: day, time: timeAt(8, 15) });
      transferFromBCA({ destWalletId: emas.id,
        amount: r500(inflate(700_000, day)), title: "Beli Tabungan Emas",
        date: day, time: timeAt(8, 20) });
      transferFromBCA({ destWalletId: jago.id,
        amount: r1k(inflate(3_500_000, day)), title: "Top Up Jago",
        date: day, time: timeAt(8, 25) });
      transferFromBCA({ destWalletId: tunai.id,
        amount: r500(inflate(800_000, day)), title: "Ambil Tunai",
        date: day, time: timeAt(8, 30) });
      transferFromBCA({ destWalletId: gopay.id,
        amount: r500(inflate(1_500_000, day)), title: "Top Up GoPay Bulanan",
        date: day, time: timeAt(8, 35) });
    }

    if (dom === 1) {
      spendFrom({ walletId: bca.id, amount: r1k(inflate(450_000, day)),
        title: "Tagihan Listrik PLN", category: "Tagihan", date: day, time: timeAt(9, 0) });
      spendFrom({ walletId: bca.id, amount: r1k(inflate(265_000, day)),
        title: "Internet IndiHome", category: "Tagihan", date: day, time: timeAt(9, 5) });
      spendFrom({ walletId: bca.id, amount: 160_000,
        title: "BPJS Kesehatan", category: "Tagihan", date: day, time: timeAt(9, 10) });
    }
    if (dom === 2) {
      spendFrom({ walletId: bca.id, amount: r1k(inflate(3_500_000, day)),
        title: "Cicilan KPR", category: "Tagihan", date: day, time: timeAt(9, 0) });
    }
    if (dom === 5) {
      spendFrom({ walletId: bca.id, amount: r1k(inflate(135_000, day)),
        title: "Tagihan Air PAM", category: "Tagihan", date: day, time: timeAt(9, 30) });
      for (const sub of ENT_SUB) {
        if (chance(0.95)) {
          spendFrom({ walletId: bca.id, amount: sub.amount,
            title: sub.name, category: "Hiburan", date: day, time: timeAt(10, 0) });
        }
      }
    }

    if (month === 6 && dom === 15) {
      addIncome({ walletId: bca.id, amount: salaryFor(day),
        title: "THR Lebaran", category: "Pendapatan", date: day, time: timeAt(10, 0),
        description: "Tunjangan Hari Raya" });
      spendFrom({ walletId: bca.id, amount: r1k(inflate(2_500_000, day)),
        title: "THR Keluarga", category: "Lain-lain", date: day, time: timeAt(14, 0),
        description: "Angpao Lebaran untuk keluarga" });
      spendFrom({ walletId: bca.id, amount: r1k(inflate(1_800_000, day)),
        title: "Belanja Lebaran", category: "Belanja", date: day, time: timeAt(15, 0) });
    }

    if (month === 12 && dom === 20) {
      addIncome({ walletId: bca.id, amount: r1k(salaryFor(day) * 0.75),
        title: "Bonus Akhir Tahun", category: "Pendapatan", date: day, time: timeAt(10, 0),
        description: "Bonus tahunan" });
    }
  }

  function simulateMorning(day: Date, isWeekend: boolean): void {
    if (chance(0.03)) {
      addIncome({ walletId: bca.id,
        amount: r1k(inflate(2_500_000 + rng() * 3_500_000, day)),
        title: pick(FREELANCE), category: "Pendapatan", date: day,
        time: timeAt(randInt(10, 17), randInt(0, 59)),
        description: "Pembayaran project sampingan" });
    }
    if (chance(isWeekend ? 0.85 : 0.98)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(12_000, 35_000), day)),
        title: pick(BREAKFAST), category: "Makanan & Minuman",
        date: day, time: timeAt(7, randInt(0, 30)) });
    }
    if (chance(isWeekend ? 0.65 : 0.9)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(18_000, 45_000), day)),
        title: pick(SNACK_DRINK), category: "Makanan & Minuman",
        date: day, time: timeAt(7, randInt(30, 59)) });
    }
    if (!isWeekend && chance(0.85)) {
      spendFrom({ walletId: gopay.id,
        amount: r500(inflate(randInt(15_000, 45_000), day)),
        title: pick(TRANSPORT_DAILY), category: "Transportasi",
        date: day, time: timeAt(8, randInt(0, 30)) });
    }
    if (chance(isWeekend ? 0.5 : 0.75)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(8_000, 22_000), day)),
        title: pick(SNACK_DRINK), category: "Makanan & Minuman",
        date: day, time: timeAt(9, randInt(30, 59)) });
    }
    if (chance(0.65)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(5_000, 12_000), day)),
        title: "Air Mineral / Minuman", category: "Makanan & Minuman",
        date: day, time: timeAt(10, randInt(0, 59)) });
    }
  }

  function simulateMidday(day: Date): void {
    if (chance(0.98)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(25_000, 95_000), day)),
        title: pick(LUNCH), category: "Makanan & Minuman",
        date: day, time: timeAt(12, randInt(0, 59)),
        description: chance(0.15) ? "Lunch bareng teman kantor" : null });
    }
    if (chance(0.78)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(10_000, 28_000), day)),
        title: pick(SNACK_DRINK), category: "Makanan & Minuman",
        date: day, time: timeAt(13, randInt(0, 59)) });
    }
    if (chance(0.7)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(8_000, 30_000), day)),
        title: pick(SNACK_DRINK), category: "Makanan & Minuman",
        date: day, time: timeAt(15, randInt(0, 59)) });
    }
  }

  function simulateEvening(day: Date, isWeekend: boolean): void {
    if (!isWeekend && chance(0.8)) {
      spendFrom({ walletId: gopay.id,
        amount: r500(inflate(randInt(15_000, 50_000), day)),
        title: pick(TRANSPORT_DAILY), category: "Transportasi",
        date: day, time: timeAt(17, randInt(0, 59)) });
    }
    if (chance(0.72)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(12_000, 55_000), day)),
        title: `${pick(CONVENIENCE)} - Belanja Kebutuhan`,
        category: "Belanja", date: day, time: timeAt(18, randInt(0, 30)),
        description: "Beli kebutuhan kecil & camilan" });
    }
    if (chance(0.92)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(35_000, 110_000), day)),
        title: pick(DINNER), category: "Makanan & Minuman",
        date: day, time: timeAt(19, randInt(0, 59)) });
    }
    if (chance(0.55)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r500(inflate(randInt(8_000, 25_000), day)),
        title: pick(SNACK_DRINK), category: "Makanan & Minuman",
        date: day, time: timeAt(20, randInt(0, 59)) });
    }
  }

  function simulateExtras(day: Date, dow: number): void {
    if (chance(0.55)) {
      spendFrom({ walletId: tunai.id,
        amount: r500(randInt(2_000, 12_000)),
        title: "Parkir", category: "Transportasi",
        date: day, time: timeAt(randInt(10, 21), randInt(0, 59)) });
    }
    if (chance(0.1)) {
      spendFrom({ walletId: dailyWallet(),
        amount: r1k(inflate(randInt(25_000, 150_000), day)),
        title: pick(PULSA_DATA), category: "Tagihan",
        date: day, time: timeAt(randInt(10, 21), randInt(0, 59)) });
    }
    if (dow === 6 && chance(0.85)) {
      spendFrom({ walletId: bca.id,
        amount: r1k(inflate(randInt(450_000, 950_000), day)),
        title: "Belanja Mingguan Supermarket", category: "Makanan & Minuman",
        date: day, time: timeAt(10, randInt(0, 59)),
        description: "Belanja bahan dapur & kebutuhan rumah" });
    }
    if (chance(0.1)) {
      spendFrom({ walletId: tunai.id,
        amount: r1k(inflate(randInt(150_000, 220_000), day)),
        title: pick(TRANSPORT_FUEL), category: "Transportasi",
        date: day, time: timeAt(7, randInt(0, 59)) });
    }
  }

  function simulateFoodTransport(day: Date, dow: number, isWeekend: boolean): void {
    simulateMorning(day, isWeekend);
    simulateMidday(day);
    simulateEvening(day, isWeekend);
    simulateExtras(day, dow);
  }

  function simulateDiscretionary(day: Date, isWeekend: boolean): void {
    if (chance(0.04)) {
      spendFrom({ walletId: bca.id,
        amount: r1k(inflate(randInt(85_000, 350_000), day)),
        title: pick(HEALTH), category: "Kesehatan",
        date: day, time: timeAt(randInt(10, 18), randInt(0, 59)) });
    }

    if (chance(0.06)) {
      spendFrom({ walletId: bca.id,
        amount: r1k(inflate(randInt(120_000, 750_000), day)),
        title: pick(SHOPPING), category: "Belanja",
        date: day, time: timeAt(randInt(14, 21), randInt(0, 59)) });
    }

    if (isWeekend && chance(0.4)) {
      spendFrom({ walletId: bca.id,
        amount: r1k(inflate(randInt(75_000, 280_000), day)),
        title: pick(["Nonton Bioskop", "Karaoke", "Game Top-Up", "Konser", "Mall Hangout"]),
        category: "Hiburan", date: day,
        time: timeAt(randInt(15, 22), randInt(0, 59)) });
    }

    if (chance(0.015)) {
      spendFrom({ walletId: bca.id,
        amount: r1k(inflate(randInt(150_000, 450_000), day)),
        title: pick(["Kursus Online Udemy", "Buku Programming", "Webinar Berbayar", "Coursera Plus"]),
        category: "Pendidikan", date: day,
        time: timeAt(randInt(19, 22), randInt(0, 59)) });
    }
  }

  function simulateDay(day: Date): void {
    const dom = day.getDate();
    const month = day.getMonth() + 1;
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 6;
    simulateMonthly(day, dom, month);
    simulateFoodTransport(day, dow, isWeekend);
    simulateDiscretionary(day, isWeekend);
  }

  const endDate = new Date(today);

  function generateDailyEvents(): void {
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + MS_PER_DAY)) {
      simulateDay(new Date(d));
    }
  }

  function generateTrips(): void {
    for (let y = 0; y < years; y++) {
      for (const m of [3, 7, 11]) {
        const date = new Date(startDate.getFullYear() + y, m - 1, randInt(5, 25));
        if (date > endDate) continue;
        const trip = pick(TRAVEL);
        spendFrom({ walletId: bca.id,
          amount: r1k(inflate(trip.amount, date)),
          title: `Liburan ${trip.dest}`, category: "Hiburan",
          date, time: timeAt(randInt(8, 12), randInt(0, 59)),
          description: `Trip ke ${trip.dest} bersama keluarga` });
      }
    }
  }

  function generateBigPurchases(): void {
    for (let y = 0; y < years; y++) {
      const n = randInt(1, 2);
      for (let i = 0; i < n; i++) {
        const date = new Date(startDate.getFullYear() + y, randInt(0, 11), randInt(1, 28));
        if (date > endDate) continue;
        const item = pick(BIG_PURCHASES);
        spendFrom({ walletId: bca.id,
          amount: r1k(inflate(item.amount, date)),
          title: item.name, category: "Belanja",
          date, time: timeAt(randInt(11, 18), randInt(0, 59)),
          description: "Pembelian besar tahunan" });
      }
    }
  }

  function applyBalanceCorrection(wallet: Wallet, date: Date): void {
    const minBal = balances[wallet.id];
    const maxNegative = Math.min(minBal - 50_000, 75_000);
    if (maxNegative <= 5_000) return;
    const sign = chance(0.5) ? 1 : -1;
    const magnitude = randInt(5_000, Math.min(75_000, Math.max(5_000, maxNegative)));
    const delta = sign * magnitude;
    const prev = balances[wallet.id];
    const next = prev + delta;
    if (next < 0) return;
    addBalanceHistory(wallet.id, prev, next, date);
    const time = timeAt(randInt(9, 17), randInt(0, 59));
    const payload = {
      walletId: wallet.id, amount: magnitude,
      title: "Balance Correction", category: "Balance Correction",
      date, time, description: "Penyesuaian saldo (admin fee / reconcile)",
    };
    if (delta > 0) addIncome(payload);
    else spendFrom(payload);
  }

  function generateBalanceCorrections(): void {
    for (let y = 0; y < years; y++) {
      const n = randInt(2, 3);
      for (let i = 0; i < n; i++) {
        const date = new Date(startDate.getFullYear() + y, randInt(0, 11), randInt(1, 28));
        if (date > endDate) continue;
        applyBalanceCorrection(pick([bca, jago]), date);
      }
    }
  }

  generateDailyEvents();
  generateTrips();
  generateBigPurchases();
  generateBalanceCorrections();

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
    if (type === "give" && walletId !== null && balances[walletId] < amount) {
      if (walletId !== bca.id && balances[bca.id] >= amount + 200_000) {
        const time = timeAt(randInt(9, 11), randInt(0, 59));
        rawAddTx({
          type: "transfer", walletId: bca.id, destWalletId: walletId,
          amount: r1k(amount + 200_000),
          title: `Top Up ${walletName[walletId]}`, category: "Transfer",
          date, time,
        });
      } else {
        skippedForBalance++;
        return;
      }
    }
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

  function seedLoans(): void {
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
  }
  seedLoans();

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

  type ChronoEvent =
    | Readonly<{ kind: "tx"; tx: Transaction; key: string }>
    | Readonly<{ kind: "loan"; loan: LoanEntry; key: string }>;

  const txEvents: ChronoEvent[] = transactions.map((t, i) => ({
    kind: "tx",
    tx: t,
    key: `${t.transaction_date} ${t.transaction_time} T${String(i).padStart(6, "0")}`,
  }));
  const loanEvents: ChronoEvent[] = loanEntries.map((l, i) => ({
    kind: "loan",
    loan: l,
    key: `${l.transaction_date} ${l.transaction_time} L${String(i).padStart(6, "0")}`,
  }));
  const allEvents: ChronoEvent[] = [...txEvents, ...loanEvents].sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });

  const finalTxs: Transaction[] = [];
  const finalLoans: LoanEntry[] = [];
  const bal: Record<string, number> = Object.fromEntries(wallets.map((w) => [w.id, 0]));

  function makeTopUpTx(destId: string, amount: number, date: string, time: string): Transaction {
    const iso = `${date}T${time}:00.000Z`;
    return {
      id: uuid(),
      anon_id: anonId,
      type: "transfer",
      wallet_id: bca.id,
      destination_wallet_id: destId,
      amount,
      title: `Top Up ${walletName[destId]}`,
      category: "Transfer",
      description: null,
      transaction_date: date,
      transaction_time: time,
      is_active: true,
      created_at: iso,
      updated_at: iso,
    };
  }

  let dropped = 0;

  function tryTopUpForSpend(walletId: string, amount: number, date: string, time: string): boolean {
    if (walletId === bca.id) return false;
    const deficit = amount - bal[walletId];
    const topUp = r1k(deficit + 300_000);
    if (bal[bca.id] < topUp) return false;
    const [hh, mm] = time.split(":").map((x) => Number.parseInt(x, 10));
    const topUpTime = timeAt(hh, Math.max(0, mm - 1));
    const topUpTx = makeTopUpTx(walletId, topUp, date, topUpTime);
    finalTxs.push(topUpTx);
    bal[bca.id] -= topUp;
    bal[walletId] += topUp;
    return true;
  }

  function processTxEvent(t: Transaction): boolean {
    if (t.type === "income") {
      bal[t.wallet_id] += t.amount;
      finalTxs.push(t);
      return true;
    }
    if (t.type === "expense") {
      if (bal[t.wallet_id] < t.amount &&
          !tryTopUpForSpend(t.wallet_id, t.amount, t.transaction_date, t.transaction_time)) {
        return false;
      }
      bal[t.wallet_id] -= t.amount;
      finalTxs.push(t);
      return true;
    }
    if (t.type === "transfer" && t.destination_wallet_id) {
      if (bal[t.wallet_id] < t.amount &&
          !tryTopUpForSpend(t.wallet_id, t.amount, t.transaction_date, t.transaction_time)) {
        return false;
      }
      bal[t.wallet_id] -= t.amount;
      bal[t.destination_wallet_id] += t.amount;
      finalTxs.push(t);
    }
    return true;
  }

  function processLoanEvent(l: LoanEntry): boolean {
    if (l.type === "get") {
      if (l.wallet_id) bal[l.wallet_id] += l.amount;
      finalLoans.push(l);
      return true;
    }
    if (l.wallet_id) {
      if (bal[l.wallet_id] < l.amount &&
          !tryTopUpForSpend(l.wallet_id, l.amount, l.transaction_date, l.transaction_time)) {
        return false;
      }
      bal[l.wallet_id] -= l.amount;
    }
    finalLoans.push(l);
    return true;
  }

  function replayEvents(): void {
    for (const ev of allEvents) {
      const ok = ev.kind === "tx" ? processTxEvent(ev.tx) : processLoanEvent(ev.loan);
      if (!ok) dropped++;
    }
  }

  function finalizeWalletBalances(): void {
    for (const w of wallets) {
      w.balance = bal[w.id];
      w.updated_at = today.toISOString();
    }
  }

  replayEvents();
  finalizeWalletBalances();
  skippedForBalance += dropped;

  const data: BackupData = {
    version: 1,
    exported_at: today.toISOString(),
    wallets,
    wallet_balance_history: balanceHistory,
    transactions: finalTxs,
    loan_counterparties: counterparties,
    loan_entries: finalLoans,
    custom_reports: customReports,
  };

  return {
    data,
    counts: {
      wallets: wallets.length,
      transactions: finalTxs.length,
      walletBalanceHistory: balanceHistory.length,
      loanCounterparties: counterparties.length,
      loanEntries: finalLoans.length,
      customReports: customReports.length,
      skippedForBalance,
    },
  };
}
