"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/shared/AppHeader";
import { RealtimeTab } from "@/components/report/RealtimeTab";
import { MonthlyTab } from "@/components/report/MonthlyTab";
import { CustomTab } from "@/components/report/CustomTab";
import { useReportStore } from "@/lib/stores/useReportStore";
import { transactionsRepo } from "@/lib/storage/transactions";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";
import { walletBalanceHistoryRepo } from "@/lib/storage/wallet-balance-history";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Tab = "realtime" | "monthly" | "custom";

export default function ReportPage() {
  const t = useTranslations("report");
  const [activeTab, setActiveTab] = useState<Tab>("realtime");

  // Restore last-visited tab after hydration — must not run on server
  useEffect(() => {
    const saved = sessionStorage.getItem("report_active_tab") as Tab | null;
    if (saved === "monthly" || saved === "custom") setActiveTab(saved);
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "realtime", label: t("tabs.realtime") },
    { id: "monthly", label: t("tabs.monthly") },
    { id: "custom", label: t("tabs.custom") },
  ];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanEntries, setLoanEntries] = useState<LoanEntry[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<WalletBalanceHistory[]>(
    []
  );

  const { customReports, loadCustomReports } = useReportStore();

  // Load all data on mount — computed-on-the-fly, no caching
  useEffect(() => {
    void transactionsRepo.getAll().then(setTransactions);
    void loanEntriesRepo.getAll().then(setLoanEntries);
    void walletBalanceHistoryRepo.getAll().then(setBalanceHistory);
    loadCustomReports();
  }, [loadCustomReports]);

  // Reload source data when switching tabs to pick up any changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("report_active_tab", tab);
    void transactionsRepo.getAll().then(setTransactions);
    void loanEntriesRepo.getAll().then(setLoanEntries);
    void walletBalanceHistoryRepo.getAll().then(setBalanceHistory);
    if (tab === "custom") loadCustomReports();
  };

  return (
    <>
      <AppHeader title={t("title")} />

      <div className="px-4 py-4 space-y-4">
        {/* Tab switcher */}
        <div
          className="flex items-center rounded-full p-1 gap-1"
          style={{
            background: "var(--bg-secondary)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0.5px 1px rgba(0,0,0,0.04)",
          }}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={cn(
                "flex-1 rounded-full text-[12px] font-semibold transition-all",
                "flex items-center justify-center"
              )}
              style={{
                minHeight: "var(--tap-target-min)",
                backgroundColor:
                  activeTab === id ? "var(--color-brand)" : "transparent",
                color:
                  activeTab === id
                    ? "var(--text-on-primary)"
                    : "var(--color-brand)",
                boxShadow:
                  activeTab === id
                    ? "0 2px 8px rgba(91,141,239,0.35), 0 1px 3px rgba(0,0,0,0.12)"
                    : "none",
              }}
              onClick={() => handleTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "realtime" && (
          <RealtimeTab transactions={transactions} />
        )}
        {activeTab === "monthly" && (
          <MonthlyTab
            transactions={transactions}
            loanEntries={loanEntries}
            balanceHistory={balanceHistory}
          />
        )}
        {activeTab === "custom" && (
          <CustomTab
            customReports={customReports}
            transactions={transactions}
            loanEntries={loanEntries}
            balanceHistory={balanceHistory}
          />
        )}
      </div>
    </>
  );
}
