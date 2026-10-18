import { ArrowUpRight, CalendarDays, Flame, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FollowShowButton } from "@/components/schedule/follow-show-button";
import { Airtime } from "@/components/schedule/airtime";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import { getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduledEpisode, ShowSchedule } from "@/types/schedule";

export function ShowScheduleView({ show }: { show: ShowSchedule }) {
  const focus = show.next ?? show.previous ?? show.premiere;
  if (!focus) return null;
  const trackerId = getScheduleTrackerId(show);
  const nextAirsAt = show.next?.airsAt;
  const visibleEpisodes = nextAirsAt
    ? show.episodes
        .filter((episode) => episode.airsAt >= nextAirsAt)
        .slice(0, 12)
    : show.episodes.slice(-12);

  return (
    <div className="page-shell page-section">
      <section className="relative mx-auto grid gap-8 rounded-3xl border border-border bg-surface p-6 lg:grid-cols-[240px_1fr] lg:items-center lg:gap-12 lg:p-10">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
          <Image
            src={show.poster}
            alt={`${show.title} poster`}
            fill
            preload
            sizes="260px"
            className="object-cover"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            {show.rank ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-foreground">
                <Flame size={13} /> Rank #{show.rank}
              </span>
            ) : null}
            {show.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-foreground">
                <Star size={13} fill="currentColor" /> {show.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-foreground">
              S{focus.seasonNumber} E{focus.episodeNumber}
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-6xl">
            {show.title}
          </h1>
          <p className="mt-4 text-lg font-bold text-foreground">
            {show.next
              ? `Season ${show.next.seasonNumber} Episode ${show.next.episodeNumber} countdown`
              : "Latest episode airtime"}
          </p>
          <div className="mt-5">
            <TimezoneStatus />
          </div>
          <div className="mt-7 max-w-2xl rounded-2xl border border-border bg-surface p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
              {show.next ? "Countdown to release" : "Time since release"}
            </p>
            <ScheduleCountdown airsAt={focus.airsAt} large />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <FollowShowButton trackerId={trackerId} title={show.title} />
            {show.tmdbId ? (
              <Link
                href={`/title/tv-${show.tmdbId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-bold text-foreground transition hover:bg-surface"
              >
                Full show details <ArrowUpRight size={17} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
        {show.previous ? (
          <Moment title="Previous episode" episode={show.previous} />
        ) : null}
        {show.premiere ? (
          <Moment title="Series premiere" episode={show.premiere} />
        ) : null}
      </section>

      <section className="relative mx-auto mt-12 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-foreground">
          {show.next ? "Next announced episodes" : "Latest announced episodes"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Showing up to 12 episodes from the latest published schedule.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEpisodes.map((episode) => (
            <div
              key={episode.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <span className="font-bold text-foreground">
                S{episode.seasonNumber} E{episode.episodeNumber}
              </span>
              <span className="text-xs text-muted">
                <Airtime airsAt={episode.airsAt} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="relative mx-auto mt-8 max-w-6xl text-center text-xs text-muted">
        Schedule data powered by{" "}
        <a
          href={focus.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-muted hover:text-foreground"
        >
          Simkl
        </a>
        .
      </p>
    </div>
  );
}

function Moment({
  title,
  episode,
}: {
  title: string;
  episode: ScheduledEpisode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
        <CalendarDays size={14} /> {title}
      </div>
      <h2 className="mt-3 text-xl font-semibold text-foreground">
        Season {episode.seasonNumber}, Episode {episode.episodeNumber}
      </h2>
      <p className="mt-2 text-sm text-muted">
        <Airtime airsAt={episode.airsAt} />
      </p>
    </article>
  );
}
