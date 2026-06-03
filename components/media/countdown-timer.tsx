"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(date: string): TimeLeft {
  const distance = Math.max(new Date(date).getTime() - Date.now(), 0);

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

export function CountdownTimer({
  releaseDate,
  compact = false,
}: {
  releaseDate: string;
  compact?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const update = () => {
      setTimeLeft(getTimeLeft(releaseDate));
    };

    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [releaseDate]);

  const units = [
    ["D", timeLeft.days],
    ["H", timeLeft.hours],
    ["M", timeLeft.minutes],
    ["S", timeLeft.seconds],
  ] as const;

  return (
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
  );
}
