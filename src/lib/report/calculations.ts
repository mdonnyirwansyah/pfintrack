import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";

export interface PeriodSummary {
  expenses: number;
  income: number;
  balance: number;
  loan: number | null;
  balanceCorrection: number | null;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

const CHART_COLORS = [
  "#5B8DEF",
  "#34C759",
  "#FF6B6B",
  "#FF9F43",
  "#AF52DE",
  "#00C7BE",
  "#FF375F",
  "#30B0C7",
  "#A2845E",
] as const;

export function categoryColor(_category: string, index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function timestampInRange(ts: string, start: string, end: string): boolean {
  const datePart = ts.slice(0, 10);
  return datePart >= start && datePart <= end;
}

export function calcExpenses(
  transactions: Transaction[],
  start: string,
  end: string
): number {
  return transactions
    .filter(
      (t) =>
        t.is_active &&
        t.type === "expense" &&
        t.category !== "Balance Correction" &&
        inRange(t.transaction_date, start, end)
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calcIncome(
  transactions: Transaction[],
  start: string,
  end: string
): number {
  return transactions
    .filter(
      (t) =>
        t.is_active &&
        t.type === "income" &&
        t.category !== "Balance Correction" &&
        inRange(t.transaction_date, start, end)
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calcLoan(
  loanEntries: LoanEntry[],
  start: string,
  end: string
): number | null {
  const inPeriod = loanEntries.filter(
    (e) => e.is_active && inRange(e.transaction_date, start, end)
  );
  if (inPeriod.length === 0) return null;

  const get = inPeriod
    .filter((e) => e.type === "get")
    .reduce((s, e) => s + e.amount, 0);
  const give = inPeriod
    .filter((e) => e.type === "give")
    .reduce((s, e) => s + e.amount, 0);
  const net = get - give;
  return net === 0 ? null : net;
}

export function calcBalanceCorrection(
  history: WalletBalanceHistory[],
  start: string,
  end: string
): number | null {
  const inPeriod = history.filter(
    (h) => h.is_active && timestampInRange(h.corrected_at, start, end)
  );
  if (inPeriod.length === 0) return null;
  const sum = inPeriod.reduce((s, h) => s + h.delta, 0);
  return sum === 0 ? null : sum;
}

export function calcPeriodSummary(
  transactions: Transaction[],
  loanEntries: LoanEntry[],
  history: WalletBalanceHistory[],
  start: string,
  end: string
): PeriodSummary {
  const expenses = calcExpenses(transactions, start, end);
  const income = calcIncome(transactions, start, end);
  return {
    expenses,
    income,
    balance: income - expenses,
    loan: calcLoan(loanEntries, start, end),
    balanceCorrection: calcBalanceCorrection(history, start, end),
  };
}

export function calcCategoryBreakdown(
  transactions: Transaction[],
  start: string,
  end: string,
  type: "expense" | "income" = "expense"
): CategoryBreakdown[] {
  const expenses = transactions.filter(
    (t) =>
      t.is_active &&
      t.type === type &&
      t.category !== "Balance Correction" &&
      inRange(t.transaction_date, start, end)
  );

  if (expenses.length === 0) return [];

  const totals = new Map<string, number>();
  for (const t of expenses) {
    const cat = t.category ?? "Other";
    totals.set(cat, (totals.get(cat) ?? 0) + t.amount);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);

  const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);
  if (grandTotal === 0) return [];

  const MAX_CATEGORIES = 8;

  if (sorted.length <= MAX_CATEGORIES) {
    return sorted.map(([cat, total], i) => ({
      category: cat,
      total,
      percentage: (total / grandTotal) * 100,
      color: categoryColor(cat, i),
    }));
  }

  const top = sorted.slice(0, MAX_CATEGORIES);
  const rest = sorted.slice(MAX_CATEGORIES);
  const lainnyaTotal = rest.reduce((s, [, v]) => s + v, 0);

  const result: CategoryBreakdown[] = top.map(([cat, total], i) => ({
    category: cat,
    total,
    percentage: (total / grandTotal) * 100,
    color: categoryColor(cat, i),
  }));

  result.push({
    category: "Lainnya",
    total: lainnyaTotal,
    percentage: (lainnyaTotal / grandTotal) * 100,
    color: CHART_COLORS[MAX_CATEGORIES % CHART_COLORS.length],
  });

  return result;
}

export function getTransactionsForCategory(
  transactions: Transaction[],
  start: string,
  end: string,
  category: string
): Transaction[] {
  if (category === "Lainnya") {
    return transactions.filter(
      (t) =>
        t.is_active &&
        t.type === "expense" &&
        t.category !== "Balance Correction" &&
        inRange(t.transaction_date, start, end)
    );
  }
  return transactions.filter(
    (t) =>
      t.is_active &&
      t.type === "expense" &&
      t.category !== "Balance Correction" &&
      inRange(t.transaction_date, start, end) &&
      (t.category ?? "Other") === category
  );
}

export function generateMonthList(
  transactions: Transaction[]
): Array<{ start: string; end: string }> {
  const active = transactions.filter((t) => t.is_active);
  if (active.length === 0) return [];

  const dates = active.map((t) => t.transaction_date).sort((a, b) => a.localeCompare(b));
  const minDate = dates[0];
  const maxDate = dates.at(-1) as string;

  const months: Array<{ start: string; end: string }> = [];
  const cursor = new Date(maxDate.slice(0, 7) + "-01");
  const stop = new Date(minDate.slice(0, 7) + "-01");

  while (cursor >= stop) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    months.push({ start, end });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return months;
}

export interface MonthlySummary {
  startBalance: number;
  income: number;
  expenses: number;
  balance: number;
  loan: number | null;
  balanceCorrection: number | null;
  endBalance: number;
}

export function calculateMonthlySummary(
  transactions: Transaction[],
  loanEntries: LoanEntry[],
  balanceHistory: WalletBalanceHistory[],
  start: string,
  end: string
): MonthlySummary {
  const activeTx = transactions.filter((t) => t.is_active);
  const activeHist = balanceHistory.filter((h) => h.is_active);

  const prevIncome = activeTx
    .filter((t) => t.type === "income" && t.category !== "Balance Correction" && t.transaction_date < start)
    .reduce((s, t) => s + t.amount, 0);

  const prevExpenses = activeTx
    .filter((t) => t.type === "expense" && t.category !== "Balance Correction" && t.transaction_date < start)
    .reduce((s, t) => s + t.amount, 0);

  const prevCorrections = activeHist
    .filter((h) => h.corrected_at.slice(0, 10) < start)
    .reduce((s, h) => s + h.delta, 0);

  const startBalance = prevIncome - prevExpenses + prevCorrections;

  const income = calcIncome(transactions, start, end);
  const expenses = calcExpenses(transactions, start, end);
  const balance = income - expenses;
  const loan = calcLoan(loanEntries, start, end);
  const balanceCorrection = calcBalanceCorrection(balanceHistory, start, end);
  const endBalance = startBalance + balance + (balanceCorrection ?? 0);

  return { startBalance, income, expenses, balance, loan, balanceCorrection, endBalance };
}

export function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function currentMonthEnd(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
