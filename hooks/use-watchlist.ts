"use client";

import { useTracker } from "@/hooks/use-tracker";

export function useWatchlist() {
  const tracker = useTracker();
  const ids = tracker.data.watchlistIds;

  return {
    ids,
    isReady: tracker.isReady,
    has: (id: string) => ids.includes(id),
    toggle: tracker.toggleWatchlist,
  };
}
