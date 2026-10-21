"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaEpisode } from "@/types/media";
import { useTracker } from "@/hooks/use-tracker";
import { formatReleaseDate } from "@/lib/utils";

type CalendarEntry = {
  href?: string;
  title: { id: string; slug: string; title: string; poster: string };
  episode: MediaEpisode;
};

export function EpisodeCalendar() {
  const tracker = useTracker();
  const idKey = [...new Set(tracker.data.watchlistIds)]
    .filter((id) => id.startsWith("tv-") || id.startsWith("simkl-"))
    .join(",");
  const [retry, setRetry] = useState(0);
  const requestKey = `${idKey}:${retry}`;
  const [state, setState] = useState<{
    key: string;
    entries: CalendarEntry[];
    failedIds: string[];
    unresolvedIds: string[];
  }>({ key: "", entries: [], failedIds: [], unresolvedIds: [] });
  const loading = state.key !== requestKey;

  useEffect(() => {
    if (!idKey) return;
    const controller = new AbortController();
    async function load() {
      const ids = idKey.split(",");
      const entries: CalendarEntry[] = [];
      const failedIds: string[] = [];
      const unresolvedIds: string[] = [];
      // Sequential chunks keep both endpoint size and upstream concurrency bounded.
      for (let offset = 0; offset < ids.length; offset += 25) {
        if (controller.signal.aborted) return;
        const chunk = ids.slice(offset, offset + 25);
        try {
          const response = await fetch(
            `/api/calendar?ids=${encodeURIComponent(chunk.join(","))}`,
            { signal: controller.signal },
          );
          if (response.status === 429) {
            failedIds.push(...ids.slice(offset));
            break;
          }
          const body = (await response.json()) as {
            results?: CalendarEntry[];
            failedIds?: string[];
            unresolvedIds?: string[];
          };
          if (!response.ok || !Array.isArray(body.results))
            throw new Error("Calendar unavailable");
          entries.push(...body.results);
          failedIds.push(...(body.failedIds ?? []));
          unresolvedIds.push(...(body.unresolvedIds ?? []));
        } catch {
          if (controller.signal.aborted) return;
          failedIds.push(...chunk);
        }
      }
      if (controller.signal.aborted) return;
      entries.sort(
        (a, b) =>
          (a.episode.airDate ?? "9999").localeCompare(
            b.episode.airDate ?? "9999",
          ) || a.title.id.localeCompare(b.title.id),
      );
      setState({ key: requestKey, entries, failedIds, unresolvedIds });
    }
    void load();
    return () => controller.abort();
  }, [idKey, requestKey]);

  return (
    <section className="page-shell page-section">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground">
        Your schedule
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-foreground sm:text-6xl">
        Upcoming episodes
      </h1>
      <p className="mt-4 text-muted">
        Next announced episodes for TV and anime in your watchlist, ordered by
        air date.
      </p>
      <div className="mt-8">
        {!idKey ? (
          <Empty />
        ) : loading ? (
          <div className="flex items-center gap-2 text-muted">
            <LoaderCircle className="animate-spin" size={18} />
            Building your calendar…
          </div>
        ) : (
          <>
            {state.failedIds.length || state.unresolvedIds.length ? (
              <div
                className="mb-5 rounded-xl border border-danger/40 bg-danger/10 p-5 text-danger"
                role="alert"
              >
                {state.failedIds.length ? (
                  <p>
                    Schedules are temporarily unavailable for{" "}
                    {state.failedIds.length} saved shows.
                  </p>
                ) : null}
                {state.unresolvedIds.length ? (
                  <p>
                    Could not find schedule information for{" "}
                    {state.unresolvedIds.length} saved shows.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="secondary-link mt-3"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : null}
            {!state.entries.length &&
            !state.failedIds.length &&
            !state.unresolvedIds.length ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-muted">
                No next episodes have been announced for your saved shows.
              </div>
            ) : null}
            <div className="grid gap-3">
              {state.entries.map((entry) => (
                <Link
                  key={`${entry.title.id}-${entry.episode.id}`}
                  href={entry.href ?? `/title/${entry.title.slug}`}
                  className="grid grid-cols-[72px_1fr] gap-4 rounded-xl border border-border bg-surface p-3 hover:border-border sm:grid-cols-[72px_1fr_auto] sm:items-center"
                >
                  <Image
                    src={entry.title.poster}
                    alt=""
                    width={72}
                    height={108}
                    className="aspect-[2/3] rounded-md object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Season {entry.episode.seasonNumber} · Episode{" "}
                      {entry.episode.episodeNumber}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">
                      {entry.title.title}: {entry.episode.name}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-sm text-muted">
                      {entry.episode.overview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <CalendarDays size={17} />
                    {entry.episode.airDate
                      ? formatReleaseDate(entry.episode.airDate)
                      : "TBA"}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center">
      <CalendarDays className="mx-auto text-foreground" size={36} />
      <h2 className="mt-4 text-2xl font-semibold text-foreground">
        Your calendar is empty.
      </h2>
      <p className="mt-2 text-muted">
        Save a TV show or anime to start following its next episode.
      </p>
      <Link href="/explore" className="action-link mt-5">
        Explore shows
      </Link>
    </div>
  );
}
