import type { WalletType } from "@/lib/types/wallet";

export const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: "bank", label: "Bank Account" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "digital_asset", label: "Digital Asset" },
  { value: "bank_digital", label: "Bank Digital" },
  { value: "other", label: "Other" },
];
