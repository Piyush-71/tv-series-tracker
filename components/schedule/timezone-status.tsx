"use client";

import { Clock3 } from "lucide-react";
import { useNow } from "@/hooks/use-now";

export function TimezoneStatus() {
  const now = useNow();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(now || 0));

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-zinc-300 backdrop-blur-xl">
      <Clock3 size={14} className="text-violet-300" />
      <span>{now ? time : "--:--"} · {timeZone}</span>
    </div>
  );
}

