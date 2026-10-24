"use client";

import { useContext, useEffect } from "react";
import { TrackerStoreContext } from "./tracker-provider";
import { connectAccountTracker } from "@/lib/account-tracker/client";
import { useTracker } from "@/hooks/use-tracker";
import { Button } from "@/components/ui/button";

export function AccountSync() {
  const store = useContext(TrackerStoreContext);
  const tracker = useTracker();
  useEffect(() => (store ? connectAccountTracker(store) : undefined), [store]);
  if (tracker.sync.status !== "error") return null;
  return (
    <div
      role="status"
      className="page-shell flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm text-muted"
    >
      <p>{tracker.sync.message}</p>
      <Button variant="secondary" size="sm" onClick={tracker.retrySync}>
        Retry account sync
      </Button>
    </div>
  );
}
