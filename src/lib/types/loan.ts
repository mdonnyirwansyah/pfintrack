export type LoanEntryType = "give" | "get";

export interface LoanCounterparty {
  id: string;
  anon_id: string;
  name: string;
  manual_paid_off: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoanEntry {
  id: string;
  anon_id: string;
  counterparty_id: string;
  type: LoanEntryType;
  amount: number;
  wallet_id: string | null;
  note: string | null;
  transaction_date: string;
  transaction_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
