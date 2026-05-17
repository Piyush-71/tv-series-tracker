import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function TitleLoading() {
  return (
    <div className="px-4 pb-12 pt-28 sm:px-6 lg:px-10">
      <LoadingSkeleton className="h-[620px]" />
    </div>
  );
}
