export type WalletType =
  | "bank"
  | "bank_digital"
  | "e_wallet"
  | "investment"
  | "savings"
  | "digital_asset"
  | "other";

export interface Wallet {
  id: string;
  anon_id: string;
  name: string;
  wallet_type: WalletType;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletBalanceHistory {
  id: string;
  anon_id: string;
  wallet_id: string;
  previous_balance: number;
  new_balance: number;
  delta: number;
  corrected_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
