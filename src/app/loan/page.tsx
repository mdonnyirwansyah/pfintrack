"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, TrendingDown, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { FABExpandable } from "@/components/shared/FABExpandable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoanSummaryBar } from "@/components/loan/LoanSummaryBar";
import { CounterpartyListItem } from "@/components/loan/CounterpartyListItem";
import { useLoanCounterpartyStore } from "@/lib/stores/useLoanStore";
import { loanEntriesRepo } from "@/lib/storage/loan-entries";
import type { LoanEntry } from "@/lib/types/loan";
import { useTranslations } from "next-intl";

// [10] Counterparty List
export default function LoanPage() {
  const router = useRouter();
  const { counterparties, isLoading, loadCounterparties } =
    useLoanCounterpartyStore();
  const t = useTranslations("loan");

  useEffect(() => {
    loadCounterparties();
  }, [loadCounterparties]);

  // Load all active entries and group by counterparty_id
  const [entriesByCounterparty, setEntriesByCounterparty] = useState<Record<string, LoanEntry[]>>({});

  useEffect(() => {
    void loanEntriesRepo.getAll().then((allEntries) => {
      const map: Record<string, LoanEntry[]> = {};
      for (const entry of allEntries) {
        if (!map[entry.counterparty_id]) map[entry.counterparty_id] = [];
        map[entry.counterparty_id].push(entry);
      }
      setEntriesByCounterparty(map);
    });
  }, [counterparties]); // re-compute when counterparties change (after mutations)

  // Summary: total get (outstanding > 0) + total give (outstanding < 0) across active counterparties
  const { summaryGet, summaryGive } = useMemo(() => {
    let get = 0;
    let give = 0;
    for (const cp of counterparties) {
      const entries = entriesByCounterparty[cp.id] ?? [];
      const totalGive = entries
        .filter((e) => e.type === "give")
        .reduce((s, e) => s + e.amount, 0);
      const totalGet = entries
        .filter((e) => e.type === "get")
        .reduce((s, e) => s + e.amount, 0);
      const outstanding = totalGive - totalGet;
      const isPaidOff = cp.manual_paid_off || outstanding === 0;
      if (!isPaidOff) {
        if (outstanding > 0) give += outstanding;
        else get += Math.abs(outstanding);
      }
    }
    return { summaryGet: get, summaryGive: give };
  }, [counterparties, entriesByCounterparty]);

  // Sort: outstanding first (by updated_at DESC), then paid off
  const sorted = useMemo(() => {
    return [...counterparties].sort((a, b) => {
      const aEntries = entriesByCounterparty[a.id] ?? [];
      const bEntries = entriesByCounterparty[b.id] ?? [];

      const aGive = aEntries
        .filter((e) => e.type === "give")
        .reduce((s, e) => s + e.amount, 0);
      const aGet = aEntries
        .filter((e) => e.type === "get")
        .reduce((s, e) => s + e.amount, 0);
      const aOutstanding = aGive - aGet;
      const aPaidOff = a.manual_paid_off || aOutstanding === 0;

      const bGive = bEntries
        .filter((e) => e.type === "give")
        .reduce((s, e) => s + e.amount, 0);
      const bGet = bEntries
        .filter((e) => e.type === "get")
        .reduce((s, e) => s + e.amount, 0);
      const bOutstanding = bGive - bGet;
      const bPaidOff = b.manual_paid_off || bOutstanding === 0;

      // Outstanding first, paid off last
      if (aPaidOff !== bPaidOff) return aPaidOff ? 1 : -1;

      // Within same group: sort by updated_at DESC
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [counterparties, entriesByCounterparty]);

  const fabActions = [
    {
      label: t("fab.give"),
      icon: <TrendingDown className="w-5 h-5 text-white" />,
      color: "var(--color-negative)",
      onClick: () => router.push("/loan/add/give"),
    },
    {
      label: t("fab.get"),
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      color: "var(--color-accent-warm)",
      onClick: () => router.push("/loan/add/get"),
    },
  ];

  return (
    <>
      <AppHeader
        title={t("title")}
      />

      <div className="px-4 pt-4 pb-4">
        {/* Summary Bar */}
        <LoanSummaryBar totalGet={summaryGet} totalGive={summaryGive} />

        {/* List */}
        {(() => {
          if (isLoading) {
            return (
              <div className="space-y-3">
                {["cp-a", "cp-b", "cp-c"].map((id) => (
                  <div
                    key={id}
                    className="h-[56px] rounded-[16px] animate-pulse"
                    style={{ background: "var(--bg-secondary)" }}
                  />
                ))}
              </div>
            );
          }
          if (sorted.length === 0) {
            return (
              <EmptyState
                icon={Users}
                title={t("noCounterparties")}
                description={t("noCounterpartiesDesc")}
              />
            );
          }
          return (
            <div className="space-y-3" data-tour="loan-counterparty-list">
              {sorted.map((cp) => (
                <CounterpartyListItem
                  key={cp.id}
                  counterparty={cp}
                  entries={entriesByCounterparty[cp.id] ?? []}
                  onClick={() => router.push(`/loan/${cp.id}`)}
                />
              ))}
            </div>
          );
        })()}
      </div>

      <FABExpandable actions={fabActions} data-tour="fab-loan" />
    </>
  );
}
