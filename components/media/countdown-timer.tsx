"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { getReleasePresentation, getTimeLeft, type ReleasePrecision, type TimeLeft } from "@/lib/release";
import { useTracker } from "@/hooks/use-tracker";

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
  const effectiveReleaseDate = titleId ? tracker.data.releaseOverrides[titleId] ?? releaseDate : releaseDate;
  const effectivePrecision = titleId && tracker.data.releaseOverrides[titleId] ? "datetime" : releasePrecision;
  const timeZone = tracker.data.preferences.timeZone || "UTC";
  const presentation = getReleasePresentation({ releaseDate: effectiveReleaseDate, releasePrecision: effectivePrecision, timeZone });
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!presentation.showCountdown) return;
    const update = () => {
      setTimeLeft(getTimeLeft(effectiveReleaseDate));
    };

    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [effectiveReleaseDate, presentation.showCountdown]);

  if (!presentation.showCountdown) {
    return (
      <div className={compact ? "rounded-md border border-white/10 bg-black/55 px-2.5 py-2 text-xs text-white" : "rounded-lg border border-white/12 bg-white/10 p-4 text-white backdrop-blur-xl"}>
        <div className="flex items-center gap-2 font-bold">
          <CalendarDays size={compact ? 14 : 18} />
          <span>{presentation.label}</span>
        </div>
        {compact ? null : <p className="mt-1 text-xs text-zinc-300">{effectivePrecision === "date" ? "Date supplied without an exact airtime" : `Exact time shown in ${presentation.timeZoneLabel}`}</p>}
      </div>
    );
  }

  const units = [
    ["D", timeLeft.days],
    ["H", timeLeft.hours],
    ["M", timeLeft.minutes],
    ["S", timeLeft.seconds],
  ] as const;

  return (
    <div>
      <div className={compact ? "flex gap-1.5" : "grid grid-cols-4 gap-2 sm:gap-3"}>
        {units.map(([label, value]) => (
        <motion.div
          key={label}
          layout
          className={
            compact
              ? "min-w-10 rounded-md border border-white/10 bg-black/45 px-2 py-1 text-center"
              : "rounded-lg border border-white/12 bg-white/10 p-3 text-center backdrop-blur-xl"
          }
        >
          <motion.div
            key={value}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={
              compact
                ? "text-sm font-bold text-white"
                : "text-2xl font-black text-white sm:text-4xl"
            }
          >
            {String(value).padStart(label === "D" ? 1 : 2, "0")}
          </motion.div>

          <div
            className={
              compact
                ? "text-[10px] text-zinc-400"
                : "text-xs font-semibold text-zinc-400"
            }
          >
            {label}
          </div>
        </motion.div>
        ))}
      </div>
      {compact ? null : (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-300">
          <Clock3 size={13} />
          {presentation.label} · {presentation.timeZoneLabel}
        </div>
      )}
    </div>
  );
}
