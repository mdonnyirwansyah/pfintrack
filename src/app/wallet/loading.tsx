import { Skeleton } from "@/components/ui/skeleton";

export default function WalletLoading() {
  return (
    <div className="px-4 py-4">
      {/* Total balance row */}
      <div className="glass rounded-[16px] px-4 mb-4 flex items-center justify-between" style={{ minHeight: 64 }}>
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      {/* Wallet cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-[16px] px-4 py-2.5 flex items-center gap-2.5">
            <Skeleton className="flex-shrink-0 w-9 h-9 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
            <Skeleton className="h-3.5 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
