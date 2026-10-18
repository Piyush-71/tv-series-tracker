import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
export default function TitleLoading() {
  return (
    <div
      className="page-shell py-10"
      role="status"
      aria-label="Loading title details"
    >
      <LoadingSkeleton className="h-[580px] rounded-3xl" />
    </div>
  );
}
