"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortPill, SortKey, applySortKey } from "@/components/shared/SortPill";
import { TransactionItem } from "../_components/TransactionItem";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { FileSearch } from "lucide-react";
import { useTranslations } from "next-intl";

type FilterType = "all" | "income" | "expense" | "transfer" | "balanceCorrection";

const FILTERS: FilterType[] = ["all", "income", "expense", "transfer", "balanceCorrection"];

export default function TransactionHistoryPage() {
  const { transactions, isLoading, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("datetime_desc");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const t = useTranslations("transactions");
  const tc = useTranslations("common");

  useEffect(() => {
    loadTransactions();
    void loadWallets();
  }, [loadTransactions, loadWallets]);

  const walletMap = useMemo(
    () => new Map(wallets.map((w) => [w.id, w.name])),
    [wallets]
  );

  const filtered = useMemo(() => {
    let base = transactions;

    // Type filter
    if (activeFilter !== "all") {
      base = base.filter((tx) =>
        activeFilter === "balanceCorrection"
          ? tx.category === "Balance Correction"
          : tx.type === activeFilter && tx.category !== "Balance Correction"
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter((tx) => {
        const walletName = walletMap.get(tx.wallet_id) ?? "";
        const destWalletName = tx.destination_wallet_id
          ? (walletMap.get(tx.destination_wallet_id) ?? "")
          : "";
        return (
          tx.title?.toLowerCase().includes(q) ||
          tx.category?.toLowerCase().includes(q) ||
          tx.description?.toLowerCase().includes(q) ||
          walletName.toLowerCase().includes(q) ||
          destWalletName.toLowerCase().includes(q)
        );
      });
    }

    return applySortKey(base, sortKey);
  }, [transactions, activeFilter, searchQuery, walletMap, sortKey]);

  return (
    <>
      <AppHeader title={t("history")} showBack />

      <div className="px-4 pt-3 pb-2">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="flex items-center justify-center"
              style={{ color: "var(--text-tertiary)", minWidth: 24, minHeight: 24 }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        {!isLoading && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.96]"
                  style={{
                    background: isActive ? "var(--color-brand)" : "var(--bg-secondary)",
                    color: isActive ? "var(--text-on-primary)" : "var(--text-secondary)",
                    border: `1px solid ${isActive ? "transparent" : "var(--border-default)"}`,
                  }}
                >
                  {t(`filter.${f}`)}
                </button>
              );
            })}
          </div>
        )}

        {/* Count + sort */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {tc("items", { count: filtered.length })}
            </span>
            <SortPill value={sortKey} onChange={setSortKey} />
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="px-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-[16px] animate-pulse"
              style={{ background: "var(--bg-secondary)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={searchQuery || activeFilter !== "all" ? t("noResults") : t("noHistory")}
          description={searchQuery || activeFilter !== "all" ? t("noResultsDesc") : t("noHistoryDesc")}
        />
      ) : (
        <div className="px-4">
          <div className="glass rounded-[16px] overflow-hidden">
            {filtered.map((tx, idx) => (
              <div key={tx.id}>
                {idx > 0 && (
                  <div className="mx-4" style={{ height: 1, background: "var(--divider)" }} />
                )}
                <TransactionItem transaction={tx} wallets={wallets} showDate />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
