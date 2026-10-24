"use client";

import { CalendarDays, Search, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  SavedTitleCard,
  savedRelease,
} from "@/components/media/saved-title-card";
import { useTracker } from "@/hooks/use-tracker";
import { calendarDay, compareCalendarDates } from "@/lib/calendar";
import { useCollection } from "@/hooks/use-collection";
import { Button } from "@/components/ui/button";

export function WatchlistClient() {
  const watchlist = useWatchlist();
  const collection = useCollection(watchlist.ids);
  const tracker = useTracker();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("next");
  const zone = tracker.data.preferences.timeZone;
  const release = (entry: (typeof collection.entries)[number]) =>
    tracker.data.releaseOverrides[entry.id] ?? savedRelease(entry);
  const dated = collection.entries.filter((entry) =>
    calendarDay(release(entry), zone),
  );
  const visible = collection.entries
    .filter((entry) => {
      const hasDate = Boolean(calendarDay(release(entry), zone));
      return (
        (filter === "all" || (filter === "dated" ? hasDate : !hasDate)) &&
        (entry.title?.title ?? entry.episode?.title ?? entry.id)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      );
    })
    .sort((a, b) =>
      sort === "title"
        ? (a.title?.title ?? a.episode?.title ?? a.id).localeCompare(
            b.title?.title ?? b.episode?.title ?? b.id,
          )
        : sort === "saved"
          ? 0
          : compareCalendarDates(release(a), release(b), zone),
    );
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState("");

  async function share() {
    const url = new URL("/shared", window.location.origin);
    url.searchParams.set("ids", watchlist.ids.join(","));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShared(true);
      setShareError("");
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      setShareError(
        "The link could not be copied. Allow clipboard access and try again.",
      );
    }
  }

  if (watchlist.isReady === false)
    return (
      <p role="status" className="text-muted">
        Loading your countdowns…
      </p>
    );

  if (!watchlist.ids.length) {
    return (
      <div className="empty-state">
        <h2 className="text-2xl font-semibold text-foreground">
          My Countdowns is waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Follow a show from any countdown card and its next announced episode
          will appear here.
        </p>
        <Link href="/" className="action-link mt-6">
          Discover shows
        </Link>
      </div>
    );
  }

  return (
    <div aria-busy={collection.loading}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <strong className="text-foreground">{watchlist.ids.length}</strong>{" "}
          following<span className="mx-3 text-border">/</span>
          {collection.loading
            ? "Checking schedules…"
            : `${dated.length} with announced dates`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/calendar" className="secondary-link">
            <CalendarDays size={17} aria-hidden="true" />
            Open calendar
          </Link>
          <Button variant="secondary" onClick={share}>
            <Share2 size={17} aria-hidden="true" />
            {shared ? "Link copied" : "Share this list"}
          </Button>
        </div>
      </div>
      {shareError ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {shareError}
        </p>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filter countdowns"
        >
          {[
            ["all", "All titles"],
            ["dated", "Date announced"],
            ["unknown", "Date TBA"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "primary" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-3.5 text-muted"
              aria-hidden="true"
            />
            <span className="sr-only">Search your titles</span>
            <input
              className="field h-11 pl-10 lg:w-52"
              placeholder="Find a saved title"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="field h-11 sm:w-auto"
            aria-label="Sort countdowns"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="next">Release date</option>
            <option value="title">Title A–Z</option>
            <option value="saved">Saved order</option>
          </select>
        </div>
      </div>
      {collection.loading ? (
        <div role="status">
          <p className="mb-4 text-sm text-muted">Loading your saved titles…</p>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(
              { length: Math.min(watchlist.ids.length, 6) },
              (_, i) => (
                <div
                  key={i}
                  className="h-[360px] animate-pulse rounded-2xl border border-border bg-surface"
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="sr-only" role="status">
            {visible.length} titles shown
          </p>
          {visible.length ? (
            <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((entry) => (
                <SavedTitleCard
                  key={entry.id}
                  entry={entry}
                  onRemove={watchlist.toggle}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2 className="text-xl font-semibold">No matching titles</h2>
              <p className="mt-2 text-muted">
                Try another search or show all your saved titles.
              </p>
              <Button
                className="mt-5"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
          {collection.entries.some(
            (entry) => !entry.title && !entry.episode,
          ) ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted">
                Some details couldn’t be loaded. Your titles are still saved.
              </p>
              <Button variant="secondary" onClick={collection.refresh}>
                Retry title details
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
