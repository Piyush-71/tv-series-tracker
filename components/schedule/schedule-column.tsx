import { ArrowUpRight } from "lucide-react";
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
  const id = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;
  return (
    <section aria-labelledby={id}>
      <div className="mb-5 flex items-end justify-between gap-2">
        <div>
          <p className="eyebrow text-[10px]">{eyebrow}</p>
          <h2
            id={id}
            className="mt-2 text-xl font-semibold tracking-tight xl:text-2xl"
          >
            {title}
          </h2>
        </div>
        <Link
          href={href}
          aria-label={`View all ${title}`}
          className="inline-flex min-h-11 items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          All <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => <ScheduleCard key={item.id} episode={item} />)
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm leading-6 text-muted">
            No episodes announced in this window yet.
          </p>
        )}
      </div>
    </section>
  );
}
