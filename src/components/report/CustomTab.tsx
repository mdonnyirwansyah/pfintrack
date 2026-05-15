"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import type { CustomReport } from "@/lib/types/report";
import type { Transaction } from "@/lib/types/transaction";
import type { LoanEntry } from "@/lib/types/loan";
import type { WalletBalanceHistory } from "@/lib/types/wallet";
import { calculateMonthlySummary } from "@/lib/report/calculations";
import { CustomReportSection } from "./CustomReportSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { FAB } from "@/components/shared/FAB";
import { useTranslations } from "next-intl";

interface CustomTabProps {
  customReports: CustomReport[];
  transactions: Transaction[];
  loanEntries: LoanEntry[];
  balanceHistory: WalletBalanceHistory[];
}

export function CustomTab({
  customReports,
  transactions,
  loanEntries,
  balanceHistory,
}: CustomTabProps) {
  const router = useRouter();
  const t = useTranslations("report");

  // Sort by created_at DESC
  const sorted = useMemo(
    () =>
      [...customReports]
        .filter((r) => r.is_active)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [customReports]
  );

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title={t("custom.noReports")}
          description={t("custom.noReportsDesc")}
        />
      ) : (
        sorted.map((report) => {
          const summary = calculateMonthlySummary(
            transactions,
            loanEntries,
            balanceHistory,
            report.start_date,
            report.end_date
          );
          return (
            <CustomReportSection
              key={report.id}
              report={report}
              summary={summary}
            />
          );
        })
      )}

      <FAB
        onClick={() => router.push("/report/custom/add")}
        aria-label={t("addReport")}
        data-tour="report-custom-fab"
      />
    </div>
  );
}
