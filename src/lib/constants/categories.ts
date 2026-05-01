export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Business",
  "Gift",
  "Bonus",
  "Rental",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Food & Drink",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Bills & Utilities",
  "Housing",
  "Travel",
  "Personal Care",
  "Insurance",
  "Savings",
  "Investment",
  "Gift",
  "Other Expense",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
