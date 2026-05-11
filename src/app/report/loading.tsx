import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Tab strip: 3 tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-9 rounded-full" />
        ))}
      </div>

      {/* Summary multi-row card */}
      <Skeleton className="h-[100px] w-full rounded-[16px]" />

      {/* Donut chart placeholder */}
      <Skeleton className="h-52 w-full rounded-[16px]" />

      {/* Category breakdown rows */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}
