"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTracker } from "@/hooks/use-tracker";
import { parseMdlSlug } from "@/lib/kuryana/identity";
import {
  CalendarSchedule,
  type CalendarEntry,
} from "@/components/tracker/calendar-schedule";
import { TimezoneSelect } from "@/components/tracker/timezone-select";
import { PageHeading } from "@/components/layout/page-heading";
import { calendarDay } from "@/lib/calendar";

export function EpisodeCalendar() {
  const tracker = useTracker();
  const idKey = [...new Set(tracker.data.watchlistIds)]
    .filter(
      (id) =>
        id.startsWith("tv-") || id.startsWith("simkl-") || parseMdlSlug(id),
    )
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
  const timeZone = tracker.data.preferences.timeZone || "UTC";

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
      <PageHeading
        eyebrow="Make time for your favorites"
        title="My Calendar"
        description="Your next episodes, at a glance. Plan your viewing around the shows you follow."
      >
        <Link href="/watchlist" className="secondary-link shrink-0">
          My Countdowns
        </Link>
      </PageHeading>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <label htmlFor="calendar-timezone">Schedule timezone</label>
        <TimezoneSelect id="calendar-timezone" />
        <span className="text-xs">
          Date-only announcements keep their published date.
        </span>
      </div>
      <div className="mt-8">
        {!idKey ? (
          <Empty />
        ) : loading ? (
          <div
            role="status"
            className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-muted"
          >
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
            {state.entries.length ? (
              <CalendarSchedule
                entries={state.entries}
                timeZone={timeZone}
                today={calendarDay(new Date().toISOString(), timeZone)!}
              />
            ) : null}
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
