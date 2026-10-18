import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
export default function ExploreLoading() {
  return <section className="page-shell page-section" role="status" aria-label="Loading collection"><LoadingSkeleton className="mb-8 h-20 max-w-xl" /><LoadingSkeleton className="h-72" /></section>;
}
