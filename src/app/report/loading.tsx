import { Skeleton } from "@/components/ui/skeleton";

export default function ReportLoading() {
  return (
    <div className="px-4 py-4 space-y-4">
      <Skeleton className="h-8 w-full rounded-full" />
      <Skeleton className="h-48 w-full rounded-[16px]" />
      <Skeleton className="h-24 w-full rounded-[16px]" />
    </div>
  );
}
