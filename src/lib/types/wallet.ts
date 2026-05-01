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
  currency: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Records manual edits to wallet.balance via the Edit Wallet screen.
 * NEVER written by Transactions or Loan operations.
 * Used by Module Report for Balance Correction calculation.
 */
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
