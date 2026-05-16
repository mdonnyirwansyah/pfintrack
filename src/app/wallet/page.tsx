"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ChevronDown, Check } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { Fab } from "@/components/shared/Fab";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortPill } from "@/components/shared/SortPill";
import { WalletCard } from "@/features/wallet/components/WalletCard";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { formatIDR } from "@/lib/format/number";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import type { WalletType } from "@/lib/types/wallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = "default" | "balance_desc" | "balance_asc" | "name_asc" | "name_desc";

const WALLET_TYPES: WalletType[] = [
  "bank", "bank_digital", "e_wallet", "investment", "savings", "digital_asset", "other",
];

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
      return a.name.localeCompare(b.name);
    });

  const activeWallets = wallets.filter((w) => w.is_active);

  function renderSortFilterBar() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-[29px] w-28 rounded-full" />
          <Skeleton className="h-[29px] w-28 rounded-full" />
        </div>
      );
    }
    if (activeWallets.length > 0) {
      return (
        <div className="flex items-center justify-between mb-3">
          <div data-tour="wl-filter-type">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="glass flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium outline-none cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>
                  {typeFilter === "all" ? t("filterType.all") : t(`types.${typeFilter}`)}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="bottom"
                sideOffset={6}
                className="glass w-auto min-w-[130px]"
                style={{ borderRadius: 12 }}
              >
                <DropdownMenuItem
                  onClick={() => setTypeFilter("all")}
                  className="text-[12px] justify-between focus:bg-[var(--color-brand-soft)] focus:text-[var(--text-primary)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("filterType.all")}
                  {typeFilter === "all" && (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-brand)" }} />
                  )}
                </DropdownMenuItem>
                {WALLET_TYPES.map((type) => (
                  <DropdownMenuItem
                    key={`filter-type-${type}`}
                    onClick={() => setTypeFilter(type)}
                    className="text-[12px] justify-between focus:bg-[var(--color-brand-soft)] focus:text-[var(--text-primary)]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t(`types.${type}`)}
                    {typeFilter === type && (
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-brand)" }} />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div data-tour="wl-sort">
            <SortPill
              value={sortKey}
              onChange={setSortKey}
              options={[
                { value: "name_asc", label: t("sort.nameAsc") },
                { value: "name_desc", label: t("sort.nameDesc") },
                { value: "balance_desc", label: t("sort.balanceDesc") },
                { value: "balance_asc", label: t("sort.balanceAsc") },
              ]}
            />
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <AppHeader title={t("title")} />

      <div className="px-4 py-4">
        <div
          data-tour="wl-total-balance"
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

        {renderSortFilterBar()}

        {isLoading && (
          <div className="space-y-3">
            {["wlt-a", "wlt-b", "wlt-c", "wlt-d"].map((id) => (
              <Skeleton key={id} className="h-[56px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {!isLoading && activeWallets.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title={t("noWallets")}
            description={t("noWalletsDesc")}
          />
        )}

        {!isLoading && activeWallets.length > 0 && displayedWallets.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title={t("noWallets")}
            description={t("noWalletsDesc")}
          />
        )}

        {!isLoading && displayedWallets.length > 0 && (
          <ul className="space-y-3 list-none">
            {displayedWallets.map((wallet, idx) => (
              <li key={wallet.id} {...(idx === 0 ? { "data-tour": "wallet-first-card" } : {})}>
                <WalletCard
                  wallet={wallet}
                  onPress={() => router.push(`/wallet/${wallet.id}`)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Fab
        onClick={() => router.push("/wallet/add")}
        aria-label={t("addAriaLabel")}
        data-tour="fab-wallet"
      />
    </>
  );
}
