import type { Wallet, WalletType } from "@/lib/types/wallet";
import { formatIDR } from "@/lib/format/number";
import { ChevronRight, Landmark, Smartphone, Wallet as WalletIcon, TrendingUp, PiggyBank, Coins, MoreHorizontal } from "lucide-react";

const WALLET_TYPE_ICONS: Record<WalletType, React.ElementType> = {
  bank: Landmark,
  bank_digital: Smartphone,
  e_wallet: WalletIcon,
  investment: TrendingUp,
  savings: PiggyBank,
  digital_asset: Coins,
  other: MoreHorizontal,
};

const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  bank: "Bank",
  bank_digital: "Bank Digital",
  e_wallet: "E-Wallet",
  investment: "Investasi",
  savings: "Tabungan Khusus",
  digital_asset: "Aset Digital",
  other: "Lainnya",
};

interface WalletCardProps {
  wallet: Wallet;
  onPress?: () => void;
}

export function WalletCard({ wallet, onPress }: WalletCardProps) {
  const Icon = WALLET_TYPE_ICONS[wallet.wallet_type] ?? MoreHorizontal;

  return (
    <button
      onClick={onPress}
      className="w-full glass rounded-[16px] px-4 py-3 text-left transition-all active:scale-[0.98] flex items-center gap-3"
      style={{ boxShadow: "var(--shadow-sm)", minHeight: "var(--tap-target-min)" }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--color-brand-soft)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
      </div>

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[16px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {wallet.name}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {WALLET_TYPE_LABELS[wallet.wallet_type] ?? "Lainnya"}
        </p>
      </div>

      {/* Balance + chevron */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <span
          className="text-[16px] font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {formatIDR(wallet.balance)}
        </span>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
      </div>
    </button>
  );
}
