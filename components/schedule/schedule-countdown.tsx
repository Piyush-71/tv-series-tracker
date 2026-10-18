"use client";
import { Airtime } from "@/components/schedule/airtime";
import { useNow } from "@/hooks/use-now";
export function ScheduleCountdown({
  airsAt,
  large = false,
}: {
  airsAt: string;
  large?: boolean;
}) {
  const now = useNow();
  const distance = now ? new Date(airsAt).getTime() - now : 0;
  const absolute = Math.abs(distance);
  const units = [
    ["days", now ? Math.floor(absolute / 86400000) : null],
    ["hours", now ? Math.floor((absolute / 3600000) % 24) : null],
    ["mins", now ? Math.floor((absolute / 60000) % 60) : null],
    ["secs", now ? Math.floor((absolute / 1000) % 60) : null],
  ] as const;
  return (
    <div>
      <div
        className={large ? "grid grid-cols-4 gap-3" : "grid grid-cols-4 gap-2"}
        role="timer"
        aria-label={
          now
            ? distance < 0
              ? "Time since airing"
              : "Time until airing"
            : "Loading countdown"
        }
      >
        {units.map(([label, value]) => (
          <div
            key={label}
            className={
              large
                ? "rounded-xl border border-border bg-background/50 px-2 py-4 text-center"
                : "rounded-lg bg-background px-2 py-2.5 text-center"
            }
          >
            <p
              className={
                large
                  ? "text-2xl font-medium tabular-nums tracking-tight sm:text-4xl"
                  : "text-lg font-medium tabular-nums tracking-tight"
              }
            >
              {value === null
                ? "—"
                : String(value).padStart(label === "days" ? 1 : 2, "0")}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>
      {large ? (
        <p className="mt-4 text-xs leading-6 text-muted">
          {distance < 0 ? "Aired" : "Airs"} <Airtime airsAt={airsAt} />
        </p>
      ) : null}
    </div>
  );
}
