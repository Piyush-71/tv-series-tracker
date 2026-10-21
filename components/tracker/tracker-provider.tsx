"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import { createTrackerStore } from "@/lib/tracker-store";

type TrackerStore = ReturnType<typeof createTrackerStore> & {
  isReady: boolean;
};
export const TrackerStoreContext = createContext<TrackerStore | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const scope = isLoaded ? (userId ?? null) : undefined;
  const store = useMemo(
    () => ({ ...createTrackerStore(scope), isReady: scope !== undefined }),
    [scope],
  );
  useLayoutEffect(() => {
    store.activate();
    return () => store.deactivate();
  }, [store]);

  // Reset component-local drafts (including uncontrolled notes) when identity changes.
  return (
    <TrackerStoreContext.Provider
      key={
        scope === undefined
          ? "loading"
          : scope === null
            ? "guest"
            : `user:${scope}`
      }
      value={store}
    >
      {children}
    </TrackerStoreContext.Provider>
  );
}
