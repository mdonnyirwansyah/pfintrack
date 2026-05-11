"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowUpDown, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FAB } from "@/components/shared/FAB";
import { EmptyState } from "@/components/shared/EmptyState";
import { WalletCard } from "@/features/wallet/components/WalletCard";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { formatIDR } from "@/lib/format/number";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import type { WalletType } from "@/lib/types/wallet";

type SortKey = "default" | "balance_desc" | "balance_asc" | "name_asc" | "name_desc";

const WALLET_TYPES: WalletType[] = [
  "bank", "bank_digital", "e_wallet", "investment", "savings", "digital_asset", "other",
];

const selectStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-default)",
  borderRadius: 20,
  color: "var(--text-secondary)",
  fontSize: 11,
  fontWeight: 500,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 12,
  paddingRight: 24,
  outline: "none",
  cursor: "pointer",
};

// [7] Wallet List
export default function WalletPage() {
  const router = useRouter();
  const { wallets, isLoading, loadWallets } = useWalletStore();
  const t = useTranslations("wallet");

  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [typeFilter, setTypeFilter] = useState<WalletType | "all">("all");

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const displayedWallets = [...wallets]
    .filter((w) => w.is_active)
    .filter((w) => typeFilter === "all" || w.wallet_type === typeFilter)
    .sort((a, b) => {
      if (sortKey === "balance_desc") return b.balance - a.balance;
      if (sortKey === "balance_asc") return a.balance - b.balance;
      if (sortKey === "name_asc") return a.name.localeCompare(b.name);
      if (sortKey === "name_desc") return b.name.localeCompare(a.name);
      return a.sort_order - b.sort_order;
    });

  const activeWallets = wallets.filter((w) => w.is_active);

  return (
    <>
      <AppHeader title={t("title")} />

      <div className="px-4 py-4">
        {/* Total Balance row */}
        <div
          className="glass rounded-[16px] px-4 mb-4 flex items-center justify-between"
          style={{ minHeight: 64 }}
        >
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("totalBalance")}
          </span>
          {isLoading ? (
            <Skeleton className="h-5 w-28 rounded-lg" />
          ) : (
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {formatIDR(totalBalance)}
            </span>
          )}
        </div>

        {/* Sort + Filter bar */}
        {isLoading ? (
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-[29px] w-28 rounded-full" />
            <Skeleton className="h-[29px] w-28 rounded-full" />
          </div>
        ) : activeWallets.length > 0 ? (
          <div className="flex items-center justify-between mb-3">
            {/* Filter type — left */}
            <div className="relative flex items-center">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as WalletType | "all")}
                style={selectStyle}
              >
                <option value="all">{t("filterType.all")}</option>
                {WALLET_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`types.${type}`)}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2 w-3 h-3 pointer-events-none"
                style={{ color: "var(--text-secondary)" }}
              />
            </div>

            {/* Sort — right */}
            <div className="relative flex items-center">
              <ArrowUpDown
                className="absolute left-2.5 w-3 h-3 pointer-events-none"
                style={{ color: "var(--text-secondary)" }}
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                style={{ ...selectStyle, paddingLeft: 24 }}
              >
                <option value="name_asc">{t("sort.nameAsc")}</option>
                <option value="name_desc">{t("sort.nameDesc")}</option>
                <option value="balance_desc">{t("sort.balanceDesc")}</option>
                <option value="balance_asc">{t("sort.balanceAsc")}</option>
              </select>
              <ChevronDown
                className="absolute right-2 w-3 h-3 pointer-events-none"
                style={{ color: "var(--text-secondary)" }}
              />
            </div>
          </div>
        ) : null}

        {/* Loading skeletons — card list */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && activeWallets.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title={t("noWallets")}
            description={t("noWalletsDesc")}
          />
        )}

        {/* No results after filter */}
        {!isLoading && activeWallets.length > 0 && displayedWallets.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title={t("noWallets")}
            description={t("noWalletsDesc")}
          />
        )}

        {/* Wallet list */}
        {!isLoading && displayedWallets.length > 0 && (
          <div className="space-y-3">
            {displayedWallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onPress={() => router.push(`/wallet/${wallet.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <FAB
        onClick={() => router.push("/wallet/add")}
        aria-label="Add wallet"
      />
    </>
  );
}
