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

type Tab = "realtime" | "monthly" | "custom";

const TABS: { id: Tab; label: string }[] = [
  { id: "realtime", label: "Realtime" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("realtime");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanEntries, setLoanEntries] = useState<LoanEntry[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<WalletBalanceHistory[]>(
    []
  );

  const { customReports, loadCustomReports } = useReportStore();

  // Load all data on mount — computed-on-the-fly, no caching
  useEffect(() => {
    setTransactions(transactionsRepo.getAll());
    setLoanEntries(loanEntriesRepo.getAll());
    setBalanceHistory(walletBalanceHistoryRepo.getAll());
    loadCustomReports();
  }, [loadCustomReports]);

  // Reload source data when switching tabs to pick up any changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setTransactions(transactionsRepo.getAll());
    setLoanEntries(loanEntriesRepo.getAll());
    setBalanceHistory(walletBalanceHistoryRepo.getAll());
    if (tab === "custom") loadCustomReports();
  };

  return (
    <>
      <AppHeader title="Report" />

      <div className="px-4 py-4 space-y-4">
        {/* Tab switcher */}
        <div
          className="flex items-center rounded-full p-1 gap-1"
          style={{
            background: "var(--bg-secondary)",
          }}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={cn(
                "flex-1 rounded-full text-[13px] font-semibold transition-all",
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
