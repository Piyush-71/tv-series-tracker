"use client";
import { CalendarDays, Clock3 } from "lucide-react";
import {
  getReleasePresentation,
  getTimeLeft,
  type ReleasePrecision,
} from "@/lib/release";
import { useTracker } from "@/hooks/use-tracker";
import { useNow } from "@/hooks/use-now";
export function CountdownTimer({
  releaseDate,
  titleId,
  releasePrecision,
  compact = false,
}: {
  releaseDate: string;
  titleId?: string;
  releasePrecision?: ReleasePrecision;
  compact?: boolean;
}) {
  const tracker = useTracker();
  const effectiveDate = titleId
    ? (tracker.data.releaseOverrides[titleId] ?? releaseDate)
    : releaseDate;
  const precision =
    titleId && tracker.data.releaseOverrides[titleId]
      ? "datetime"
      : releasePrecision;
  const timeZone = tracker.data.preferences.timeZone || "UTC";
  const now = useNow();
  const presentation = getReleasePresentation({
    releaseDate: effectiveDate,
    releasePrecision: precision,
    timeZone,
    now: new Date(now || 0),
  });
  const time = now ? getTimeLeft(effectiveDate, new Date(now)) : null;
  if (!presentation.showCountdown)
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="inline-flex items-center gap-2 font-medium">
          <CalendarDays size={compact ? 14 : 18} aria-hidden="true" />
          {presentation.label}
        </p>
        {compact ? null : (
          <p className="mt-2 text-xs opacity-80">
            {precision === "date"
              ? "Exact airtime hasn’t been announced"
              : presentation.timeZoneLabel}
          </p>
        )}
      </div>
    );
  return (
    <div>
      <div
        className={compact ? "flex gap-3" : "flex flex-wrap gap-5 sm:gap-7"}
        role="timer"
        aria-label="Time until release"
      >
        {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
          <div key={unit}>
            <p
              className={
                compact
                  ? "text-sm font-semibold tabular-nums"
                  : "text-3xl font-medium tabular-nums tracking-tight"
              }
            >
              {time ? String(time[unit]).padStart(2, "0") : "—"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
              {unit}
            </p>
          </div>
        ))}
      </div>
      {compact ? null : (
        <p className="mt-3 flex items-center gap-1.5 text-xs opacity-80">
          <Clock3 size={13} aria-hidden="true" />
          {presentation.label} · {presentation.timeZoneLabel}
        </p>
      )}
    </div>
  );
}
