import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
export default function ShowLoading() {
  return <div className="page-shell page-section" role="status" aria-label="Loading show schedule"><LoadingSkeleton className="h-[540px] rounded-3xl" /></div>;
}
