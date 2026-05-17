import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 px-4 pb-12 pt-28 sm:px-6 lg:px-10">
      <LoadingSkeleton className="h-[420px]" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <LoadingSkeleton key={index} className="h-80" />
        ))}
      </div>
    </div>
  );
}
