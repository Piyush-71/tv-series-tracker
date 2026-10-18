import { cn } from "@/lib/utils";
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-2xl bg-surface-raised", className)}
    />
  );
}
