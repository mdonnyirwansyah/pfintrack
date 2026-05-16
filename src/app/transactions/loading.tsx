import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="pb-4">
      <div className="mx-4 mt-4 mb-3">
        <Skeleton className="h-[59px] w-full rounded-[16px]" />
      </div>

      <div className="mx-4 mb-2 py-2 flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>

      <div className="space-y-px mt-3">
        {["tx-a", "tx-b", "tx-c", "tx-d", "tx-e", "tx-f"].map((id) => (
          <div key={id} className="px-4 py-2 flex items-center gap-2.5">
            <Skeleton className="flex-shrink-0 w-9 h-9 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="flex justify-between gap-4">
                <Skeleton className="h-2.5 w-20 rounded" />
                <Skeleton className="h-2.5 w-10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
