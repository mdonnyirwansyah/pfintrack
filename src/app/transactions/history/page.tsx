"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TransactionItem } from "../_components/TransactionItem";
import { useTransactionStore } from "@/lib/stores/useTransactionStore";
import { useWalletStore } from "@/lib/stores/useWalletStore";
import { formatDisplayDate } from "@/lib/format/date";
import type { Transaction } from "@/lib/types/transaction";
import { FileSearch } from "lucide-react";
import { useTranslations } from "next-intl";

// Group transactions by date
function groupByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = tx.transaction_date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }
  return groups;
}

export default function TransactionHistoryPage() {
  const { transactions, isLoading, loadTransactions } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("transactions");
  const tc = useTranslations("common");

  useEffect(() => {
    loadTransactions();
    loadWallets();
  }, [loadTransactions, loadWallets]);

  const walletMap = useMemo(
    () => new Map(wallets.map((w) => [w.id, w.name])),
    [wallets]
  );

  // Sort all transactions DESC by date+time
  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const dateCompare = b.transaction_date.localeCompare(a.transaction_date);
        if (dateCompare !== 0) return dateCompare;
        return b.transaction_time.localeCompare(a.transaction_time);
      }),
    [transactions]
  );

  // Filter real-time, case-insensitive
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((tx) => {
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
  }, [sorted, searchQuery, walletMap]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupedEntries = Array.from(grouped.entries()).sort(([a], [b]) =>
    b.localeCompare(a)
  );

  return (
    <>
      <AppHeader title={t("history")} showBack />

      <div className="px-4 pt-3 pb-4">
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
            className="flex-1 bg-transparent text-[15px] outline-none"
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
          title={searchQuery ? t("noResults") : t("noHistory")}
          description={searchQuery ? t("noResultsDesc") : t("noHistoryDesc")}
        />
      ) : (
        <div className="px-4 space-y-4">
          {groupedEntries.map(([date, txns]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatDisplayDate(date)}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--divider)" }}
                />
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {tc("items", { count: txns.length })}
                </span>
              </div>

              {/* Transactions for this date */}
              <div
                className="glass rounded-[16px] overflow-hidden"
              >
                {txns.map((tx, idx) => (
                  <div key={tx.id}>
                    {idx > 0 && (
                      <div
                        className="mx-4"
                        style={{ height: "1px", background: "var(--divider)" }}
                      />
                    )}
                    <TransactionItem transaction={tx} wallets={wallets} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
