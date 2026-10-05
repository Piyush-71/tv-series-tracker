"use client";

import { useTracker } from "@/hooks/use-tracker";
import { TimezoneSelect } from "@/components/tracker/timezone-select";
import { Clock3 } from "lucide-react";
import { useNow } from "@/hooks/use-now";

export function TimezoneStatus() {
  const now = useNow();
  const { data } = useTracker();
  const timeZone = data.preferences.timeZone;
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(now || 0));

  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-xl">
      <Clock3 aria-hidden="true" size={14} className="text-foreground" />
      <span>{now ? time : "--:--"}</span>
      <TimezoneSelect />
    </div>
  );
}
