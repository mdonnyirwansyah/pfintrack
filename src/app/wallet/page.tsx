"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FAB } from "@/components/shared/FAB";
import { EmptyState } from "@/components/shared/EmptyState";
import { WalletCard } from "@/features/wallet/components/WalletCard";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { formatIDR } from "@/lib/format/number";
import { Skeleton } from "@/components/ui/skeleton";

// [7] Wallet List
export default function WalletPage() {
  const router = useRouter();
  const { wallets, isLoading, loadWallets } = useWalletStore();

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const sortedWallets = [...wallets].sort((a, b) => a.sort_order - b.sort_order);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <>
      <AppHeader title="Wallet" />

      <div className="px-4 py-4">
        {/* Total Balance row */}
        <div
          className="glass rounded-[16px] px-4 py-4 mb-4 flex items-center justify-between"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <span
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Total Balance
          </span>
          {isLoading ? (
            <Skeleton className="h-7 w-32 rounded-lg" />
          ) : (
            <span
              className="text-[22px] font-bold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {formatIDR(totalBalance)}
            </span>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-[16px]" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sortedWallets.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title="No wallets yet"
            description="Add your first wallet using the + button."
          />
        )}

        {/* Wallet list */}
        {!isLoading && sortedWallets.length > 0 && (
          <div className="space-y-3">
            {sortedWallets.map((wallet) => (
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
