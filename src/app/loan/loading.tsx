import { Skeleton } from "@/components/ui/skeleton";

export default function LoanLoading() {
  return (
    <div className="px-4 py-4">
      {/* LoanSummaryBar: 3-column totals */}
      <div className="glass rounded-[16px] overflow-hidden mb-4" style={{ minHeight: 64 }}>
        <div className="flex">
          {["col-give", "col-net", "col-get"].map((id) => (
            <div key={id} className="flex-1 flex flex-col items-center py-3 px-1 gap-1.5">
              <Skeleton className="h-2.5 w-12 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Counterparty list items */}
      <div className="space-y-3">
        {["cp-a", "cp-b", "cp-c", "cp-d"].map((id) => (
          <div key={id} className="glass rounded-[16px] px-4 flex items-center gap-2.5" style={{ minHeight: 56 }}>
            <Skeleton className="flex-shrink-0 w-9 h-9 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2.5 w-32 rounded" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-2.5 w-10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
