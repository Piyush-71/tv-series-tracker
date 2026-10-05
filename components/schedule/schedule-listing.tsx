import { PageHeading } from "@/components/layout/page-heading";
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
    <section className="page-shell page-section">
      <PageHeading eyebrow={eyebrow} title={title} description={description}>
        <TimezoneStatus />
      </PageHeading>
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ScheduleCard key={item.id} episode={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2 className="text-xl font-semibold">A little more anticipation.</h2>
          <p className="mt-3 text-sm text-muted">
            No scheduled episodes have been announced in this window yet.
          </p>
        </div>
      )}
    </section>
  );
}
