import { ScheduleCard } from "@/components/schedule/schedule-card";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import type { ScheduledEpisode } from "@/types/schedule";

export function ScheduleListing({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: ScheduledEpisode[];
}) {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_25%_10%,rgba(124,58,237,0.19),transparent_38%)]" />
      <header className="relative mx-auto max-w-[1500px] border-b border-white/10 pb-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-300">{eyebrow}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black text-white sm:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">{description}</p>
          </div>
          <TimezoneStatus />
        </div>
      </header>
      <div className="relative mx-auto mt-8 grid max-w-[1500px] gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <ScheduleCard key={item.id} episode={item} />)}
      </div>
      {!items.length ? <p className="relative mx-auto mt-10 max-w-[1500px] rounded-xl border border-dashed border-white/15 p-10 text-center text-zinc-400">No scheduled episodes are available in this window.</p> : null}
    </section>
  );
}

