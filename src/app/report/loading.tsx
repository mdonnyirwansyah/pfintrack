import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-1 p-1 rounded-full" style={{ background: "var(--bg-secondary)" }}>
        {["tab-r", "tab-m", "tab-c"].map((id) => (
          <Skeleton key={id} className="flex-1 h-11 rounded-full" />
        ))}
      </div>

      <Skeleton className="h-[120px] w-full rounded-[16px]" />

      <Skeleton className="h-[240px] w-full rounded-[16px]" />

      <div className="space-y-2">
        {["cat-a", "cat-b", "cat-c", "cat-d"].map((id) => (
          <Skeleton key={id} className="h-11 w-full rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}
