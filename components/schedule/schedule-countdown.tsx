"use client";

import { useNow } from "@/hooks/use-now";
import { formatAirtime } from "@/lib/schedule/format";

export function ScheduleCountdown({ airsAt, large = false }: { airsAt: string; large?: boolean }) {
  const now = useNow();
  const target = new Date(airsAt).getTime();
  const distance = now ? target - now : 0;
  const absolute = Math.abs(distance);
  const units = [
    ["days", Math.floor(absolute / 86_400_000)],
    ["hours", Math.floor((absolute / 3_600_000) % 24)],
    ["mins", Math.floor((absolute / 60_000) % 60)],
    ["secs", Math.floor((absolute / 1_000) % 60)],
  ] as const;

  return (
    <div>
      <div className={large ? "grid grid-cols-4 gap-2 sm:gap-3" : "grid grid-cols-4 gap-1.5"} aria-label={distance < 0 ? "Time since airing" : "Time until airing"}>
        {units.map(([label, value]) => (
          <div
            key={label}
            className={large
              ? "rounded-xl border border-white/12 bg-black/35 px-2 py-4 text-center backdrop-blur-xl"
              : "rounded-md border border-white/10 bg-black/35 px-1.5 py-2 text-center"}
          >
            <div className={large ? "text-2xl font-black text-white sm:text-4xl" : "text-sm font-black tabular-nums text-white"}>
              {String(value).padStart(label === "days" ? 1 : 2, "0")}
            </div>
            <div className={large ? "mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400" : "text-[8px] font-bold uppercase tracking-wide text-zinc-500"}>
              {label}
            </div>
          </div>
        ))}
      </div>
      {large ? (
        <p className="mt-3 text-sm font-semibold text-zinc-300">
          {distance < 0 ? "Aired" : "Airs"} {formatAirtime(airsAt)}
        </p>
      ) : null}
    </div>
  );
}
