export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  anon_id: string;
  type: TransactionType;
  wallet_id: string;
  destination_wallet_id: string | null;
  amount: number;
  title: string | null;
  category: string | null;
  description: string | null;
  transaction_date: string;
  transaction_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
