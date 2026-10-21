"use client";

import { MediaGrid } from "@/components/media/media-grid";
import { ScheduleCard } from "@/components/schedule/schedule-card";
import { Button } from "@/components/ui/button";
import type { CollectionEntry } from "@/types/collection";

export function CollectionGrid({ entries, loading = false, showEpisodes = false, onRemove, onRetry }: {
  entries: CollectionEntry[];
  loading?: boolean;
  showEpisodes?: boolean;
  onRemove?: (id: string) => void;
  onRetry?: () => void;
}) {
  const titles = entries.flatMap((entry) => entry.title ? [entry.title] : []);
  const episodes = entries.filter((entry) => entry.episode && (showEpisodes || !entry.title));
  const unresolved = entries.filter((entry) => !entry.title && !entry.episode);
  return (
    <div className="space-y-6" aria-busy={loading}>
      {loading ? <p role="status" className="text-sm text-muted">Loading your saved titles…</p> : null}
      {episodes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{episodes.map((entry) => <ScheduleCard key={entry.id} episode={entry.episode!} savedId={entry.id} />)}</div> : null}
      {titles.length ? <MediaGrid items={titles} /> : null}
      {!loading && unresolved.length ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">These entries are still saved. Their details could not be loaded.</p>
          {unresolved.map((entry) => <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div><h3 className="font-semibold">Saved title · {entry.id}</h3><p className="mt-1 text-sm text-muted">{entry.status === "missing" ? "This title is no longer listed by the data source." : entry.status === "unsupported" ? "This saved ID is not supported by the current data sources." : "Details are temporarily unavailable. Try again shortly."}</p></div>
            {onRemove ? <Button variant="secondary" onClick={() => onRemove(entry.id)} aria-label={`Remove saved title ${entry.id}`}>Remove</Button> : null}
          </article>)}
          {onRetry ? <Button variant="secondary" onClick={onRetry}>Retry title details</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
