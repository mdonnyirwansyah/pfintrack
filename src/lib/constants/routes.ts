export const ROUTES = {
  // Root
  HOME: "/",

  // Transactions
  TRANSACTIONS: "/transactions",
  TRANSACTIONS_ADD_INCOME: "/transactions/add/income",
  TRANSACTIONS_ADD_EXPENSE: "/transactions/add/expense",
  TRANSACTIONS_ADD_TRANSFER: "/transactions/add/transfer",
  TRANSACTIONS_EDIT: (id: string) => `/transactions/${id}`,
  TRANSACTIONS_HISTORY: "/transactions/history",

  // Wallet
  WALLET: "/wallet",
  WALLET_ADD: "/wallet/add",
  WALLET_EDIT: (id: string) => `/wallet/${id}`,

  // Loan
  LOAN: "/loan",
  LOAN_ADD_GIVE: "/loan/add/give",
  LOAN_ADD_GET: "/loan/add/get",
  LOAN_DETAIL: (counterpartyId: string) => `/loan/${counterpartyId}`,
  LOAN_EDIT_ENTRY: (counterpartyId: string, entryId: string) =>
    `/loan/${counterpartyId}/edit/${entryId}`,

  // Report
  REPORT: "/report",
  REPORT_DETAIL: "/report/detail",
  REPORT_CUSTOM_ADD: "/report/custom/add",
  REPORT_CUSTOM_EDIT: (id: string) => `/report/custom/${id}/edit`,
} as const;
