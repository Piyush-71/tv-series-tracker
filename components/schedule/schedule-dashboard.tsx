import { CalendarClock, Radio, Sparkles } from "lucide-react";
import { ScheduleColumn } from "@/components/schedule/schedule-column";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import type { ScheduleDashboard as Dashboard } from "@/types/schedule";

export function ScheduleDashboard({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_15%_10%,rgba(124,58,237,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.13),transparent_32%)]" />
      <header className="relative mx-auto max-w-[1500px] border-b border-white/8 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-violet-300">
              <Radio size={14} /> Live release radar
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">
              TV countdowns, schedules,
              <span className="block bg-gradient-to-r from-violet-300 via-blue-300 to-rose-300 bg-clip-text text-transparent">and exact release times.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              See what is trending, discover new series premieres, and follow the next shows airing in your local timezone.
            </p>
          </div>
          <TimezoneStatus />
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-zinc-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5"><Sparkles size={13} /> Exact episode countdowns</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5"><CalendarClock size={13} /> Updated every few hours</span>
        </div>
      </header>

      <div className="relative mx-auto mt-9 grid max-w-[1500px] gap-8 lg:grid-cols-3 lg:gap-5 xl:gap-7">
        <ScheduleColumn title="Trending TV Shows" eyebrow="Popular next episodes" href="/trending" items={dashboard.trending} />
        <ScheduleColumn title="Upcoming TV Shows" eyebrow="Series premieres" href="/upcoming" items={dashboard.upcoming} />
        <ScheduleColumn title="Airing Soon" eyebrow="Next on the clock" href="/soon" items={dashboard.airingSoon} />
      </div>

      <p className="relative mx-auto mt-10 max-w-[1500px] text-center text-xs text-zinc-600">
        Schedule data powered by <a href="https://simkl.com" target="_blank" rel="noreferrer" className="font-bold text-zinc-400 hover:text-white">Simkl</a>. Airtimes are displayed in your device timezone.
      </p>
    </div>
  );
}

