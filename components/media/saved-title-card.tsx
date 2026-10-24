"use client";

import { ArrowUpRight, CalendarDays, Check, Clapperboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { NotifyButton } from "@/components/tracker/notify-button";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { calendarDay, calendarLabel } from "@/lib/calendar";
import { getScheduleTitleHref } from "@/lib/schedule/format";
import { withScheduledNextEpisode } from "@/lib/tracker-reminders";
import type { CollectionEntry } from "@/types/collection";

export function savedRelease(entry: CollectionEntry) {
  const series = !entry.title || ["tv", "anime"].includes(entry.title.type);
  const date =
    entry.episode?.airsAt ??
    (series ? entry.title?.nextEpisode?.airDate : entry.title?.releaseDate) ??
    "";
  const precision =
    entry.episode?.precision ??
    (series ? undefined : entry.title?.releasePrecision);
  return precision === "date" ? date.slice(0, 10) : date;
}

export function SavedTitleCard({
  entry,
  onRemove,
}: {
  entry: CollectionEntry;
  onRemove: (id: string) => void;
}) {
  const { title, episode } = entry;
  const tracker = useTracker();
  const date = tracker.data.releaseOverrides[entry.id] ?? savedRelease(entry);
  const day = calendarDay(date, tracker.data.preferences.timeZone);
  const name = title?.title ?? episode?.title ?? `Saved title · ${entry.id}`;
  const poster = title?.poster ?? episode?.poster;
  const href = title
    ? `/title/${title.slug}`
    : episode
      ? getScheduleTitleHref(episode)
      : null;
  const series = !title || ["tv", "anime"].includes(title.type);
  const next = episode ?? title?.nextEpisode;
  const reminderTitle = title ? withScheduledNextEpisode(title, episode) : null;

  return (
    <article className="saved-title-card flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/60">
      <div className="flex items-start gap-4">
        <div className="relative h-28 w-[76px] shrink-0 overflow-hidden rounded-lg bg-surface-raised">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes="76px"
              className="object-cover"
            />
          ) : (
            <Clapperboard
              className="m-auto h-full text-muted"
              size={28}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-accent">
            {title?.type === "movie"
              ? "Film"
              : title?.type === "anime"
                ? "Anime"
                : title?.type === "event"
                  ? "Event"
                  : "Series"}
          </p>
          <h2
            className="mt-2 line-clamp-2 min-h-12 text-base font-semibold leading-6"
            title={name}
          >
            {href ? (
              <Link href={href} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </h2>
          <p className="mt-2 truncate text-xs text-muted">
            {next
              ? `Season ${next.seasonNumber} · Episode ${next.episodeNumber}`
              : title?.genres.slice(0, 2).join(" · ") ||
                "Saved in your collection"}
          </p>
        </div>
      </div>
      <div className="my-5 flex min-h-32 flex-1 flex-col justify-center rounded-xl bg-background/70 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
          <CalendarDays size={14} aria-hidden="true" />
          {series ? "Next episode" : "Release date"}
        </p>
        {day && date.includes("T") ? (
          <p className="mb-2 text-xs text-muted">
            {calendarLabel(day, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            ·{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone: tracker.data.preferences.timeZone,
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            }).format(new Date(date))}
          </p>
        ) : null}
        {title || episode ? (
          <CountdownTimer
            titleId={entry.id}
            releaseDate={savedRelease(entry)}
            releasePrecision={
              episode?.precision ??
              (series ? undefined : title?.releasePrecision)
            }
            compact
          />
        ) : (
          <p className="text-sm text-muted">
            {entry.status === "missing"
              ? "No longer listed by the data source."
              : entry.status === "unsupported"
                ? "This saved ID is not supported."
                : "Details temporarily unavailable."}
          </p>
        )}
        {!day && (title || episode) ? (
          <p className="mt-2 text-xs text-muted">
            {series
              ? "No next episode date announced"
              : "Release date not yet announced"}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 px-2"
          onClick={() => onRemove(entry.id)}
          aria-label={`Remove ${name} from My Countdowns`}
        >
          <Check size={16} aria-hidden="true" />
          Following
        </Button>
        {reminderTitle ? (
          <NotifyButton title={reminderTitle} size="icon" />
        ) : href ? (
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-accent"
          >
            View schedule <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-xs text-muted">Still saved</span>
        )}
      </div>
    </article>
  );
}
