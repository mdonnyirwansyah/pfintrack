import { Skeleton } from "@/components/ui/skeleton";

export default function LoanLoading() {
  return (
    <div className="px-4 py-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-[16px]" />
      ))}
    </div>
  );
}
