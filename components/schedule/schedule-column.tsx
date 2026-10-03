import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ScheduleCard } from "@/components/schedule/schedule-card";
import type { ScheduledEpisode } from "@/types/schedule";

export function ScheduleColumn({
  title,
  eyebrow,
  href,
  items,
}: {
  title: string;
  eyebrow: string;
  href: string;
  items: ScheduledEpisode[];
}) {
  return (
    <section aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">{eyebrow}</p>
          <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="mt-1 text-2xl font-black text-white">{title}</h2>
        </div>
        <Link href={href} className="flex items-center gap-1 text-xs font-bold text-zinc-400 transition hover:text-white">
          All <ArrowRight size={13} />
        </Link>
      </div>
      <div className="grid gap-3">
        {items.map((item) => <ScheduleCard key={item.id} episode={item} />)}
      </div>
    </section>
  );
}

