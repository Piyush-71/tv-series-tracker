import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
export default function Loading() {
  return (
    <div
      className="page-shell space-y-7 py-10"
      role="status"
      aria-label="Loading titles"
    >
      <LoadingSkeleton className="h-16 max-w-xl" />
      <LoadingSkeleton className="h-[510px] rounded-3xl" />
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingSkeleton key={index} className="aspect-[2/3]" />
        ))}
      </div>
    </div>
  );
}
