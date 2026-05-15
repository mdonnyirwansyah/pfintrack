import { memo } from "react";
import type { Wallet, WalletType } from "@/lib/types/wallet";
import { formatIDR } from "@/lib/format/number";
import { ChevronRight, Landmark, Smartphone, Wallet as WalletIcon, TrendingUp, PiggyBank, Coins, MoreHorizontal } from "lucide-react";
import { IconBadge } from "@/components/shared/IconBadge";

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
  bank_digital: "Digital Bank",
  e_wallet: "E-Wallet",
  investment: "Investment",
  savings: "Savings",
  digital_asset: "Digital Asset",
  other: "Other",
};

interface WalletCardProps {
  wallet: Wallet;
  onPress?: () => void;
}

export const WalletCard = memo(function WalletCard({ wallet, onPress }: WalletCardProps) {
  const Icon = WALLET_TYPE_ICONS[wallet.wallet_type] ?? MoreHorizontal;

  return (
    <button
      onClick={onPress}
      className="w-full glass rounded-[16px] px-4 py-2.5 text-left transition-all active:scale-[0.98] flex items-center gap-2.5"
      style={{ minHeight: 48 }}
    >
      {/* Icon */}
      <IconBadge
        icon={Icon}
        iconColor="var(--color-brand)"
        background="var(--color-brand-soft)"
      />

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {wallet.name}
        </p>
        <p className="text-[9px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {WALLET_TYPE_LABELS[wallet.wallet_type] ?? "Lainnya"}
        </p>
      </div>

      {/* Balance + chevron */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {formatIDR(wallet.balance)}
        </span>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
      </div>
    </button>
  );
});
