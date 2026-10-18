"use client";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  Play,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MediaTitle } from "@/types/media";
import { useTracker } from "@/hooks/use-tracker";
import { NotifyButton } from "@/components/tracker/notify-button";
import { PersonalTitleControls } from "@/components/tracker/personal-title-controls";
import { EpisodeTracker } from "@/components/tracker/episode-tracker";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { TrailerModal } from "@/components/media/trailer-modal";
import { GenrePills } from "@/components/media/genre-pills";
import { CarouselSection } from "@/components/media/carousel-section";
import { formatReleaseDate } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";
export function DetailView({
  title,
  similar,
}: {
  title: MediaTitle;
  similar: MediaTitle[];
}) {
  const [open, setOpen] = useState(false);
  const watchlist = useWatchlist();
  const saved = watchlist.has(title.id);
  const tracker = useTracker();
  const markViewed = useRef(tracker.markViewed);
  useEffect(() => {
    markViewed.current(title.id);
  }, [title.id]);
  return (
    <>
      <div className="page-shell pt-6 sm:pt-8">
        <Link
          href="/explore"
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the collection
        </Link>
        <section className="hero-surface relative isolate overflow-hidden rounded-3xl border border-border">
          <Image
            src={title.backdrop}
            alt=""
            fill
            preload
            sizes="(max-width: 1440px) 100vw, 1344px"
            className="object-cover object-[65%_center]"
          />
          <div className="hero-shade absolute inset-0" />
          <div className="relative grid min-h-[530px] items-end gap-8 px-6 pb-8 pt-48 sm:px-10 sm:pt-16 lg:grid-cols-[220px_1fr] lg:gap-10 lg:py-12">
            <div className="relative hidden aspect-[2/3] overflow-hidden rounded-2xl border border-hero-muted/30 shadow-xl lg:block">
              <Image
                src={title.poster}
                alt={`${title.title} poster`}
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {title.type === "tv"
                  ? "TV series"
                  : title.type === "movie"
                    ? "Feature film"
                    : title.type}
              </p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.05em] text-hero-text sm:text-6xl">
                {title.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-hero-muted">
                {title.rating > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Star
                      size={15}
                      className="text-accent"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                    {title.rating.toFixed(1)}{" "}
                    <span className="text-xs">/ 10</span>
                  </span>
                ) : null}
                <span>{new Date(title.releaseDate).getFullYear()}</span>
                <span>{title.genres.join(" · ")}</span>
              </div>
              <p className="mt-5 text-base leading-7 text-hero-muted">
                {title.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <NotifyButton
                  title={title}
                  size="lg"
                  className="border-hero-muted/40 bg-hero-text/10 text-hero-text hover:bg-hero-text/20"
                />
                <Button onClick={() => setOpen(true)} size="lg">
                  <Play size={16} fill="currentColor" aria-hidden="true" />
                  Watch trailer
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-hero-muted/40 bg-hero-text/10 text-hero-text hover:bg-hero-text/20"
                  aria-pressed={saved}
                  onClick={() => watchlist.toggle(title.id)}
                >
                  {saved ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Bookmark size={17} aria-hidden="true" />
                  )}
                  {saved ? "Saved to watchlist" : "Add to watchlist"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="page-shell grid gap-10 py-12 lg:grid-cols-[1fr_340px] lg:gap-16">
        <div className="min-w-0">
          <p className="eyebrow">The story</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            What’s it about?
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
            {title.description}
          </p>
          <div className="mt-6">
            <GenrePills genres={title.genres} />
          </div>
          <PersonalTitleControls title={title} />
          {title.type === "tv" || title.type === "anime" ? (
            <EpisodeTracker title={title} />
          ) : null}
          {title.cast.length ? (
            <>
              <div className="mb-6 mt-12 flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  The people behind it
                </h2>
                <span className="text-sm text-muted">
                  {title.cast.length} cast members
                </span>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                {title.cast.map((person) => (
                  <div key={person.name}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface">
                      <Image
                        src={person.image}
                        alt={person.name}
                        fill
                        sizes="(max-width: 639px) 45vw, (max-width: 1023px) 28vw, 220px"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">
                      {person.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {person.role}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <aside className="self-start rounded-2xl border border-border bg-surface p-6">
          <p className="eyebrow">Mark your calendar</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            The release details
          </h2>
          <div className="mt-6 flex items-center gap-3 border-b border-border pb-5">
            <CalendarDays size={21} className="text-muted" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted">Release date</p>
              <p className="mt-1 text-sm font-medium">
                {formatReleaseDate(title.releaseDate)}
              </p>
            </div>
          </div>
          <div className="hero-surface mt-5 rounded-xl p-5">
            <CountdownTimer
              releaseDate={title.releaseDate}
              titleId={title.id}
              releasePrecision={title.releasePrecision}
            />
          </div>
          <div className="mt-6">
            <p className="text-xs text-muted">Where to watch</p>
            <p className="mt-2 text-sm font-medium">
              {title.platform === "TMDB"
                ? "Streaming provider not announced"
                : title.platform}
            </p>
          </div>
          {title.nextEpisode ? (
            <div className="mt-5 border-t border-border pt-5">
              <p className="eyebrow">Next episode</p>
              <p className="mt-2 text-sm font-medium">
                S{title.nextEpisode.seasonNumber} E
                {title.nextEpisode.episodeNumber} · {title.nextEpisode.name}
              </p>
              <p className="mt-2 text-xs text-muted">
                {title.nextEpisode.airDate
                  ? formatReleaseDate(title.nextEpisode.airDate)
                  : "Airdate to be announced"}
              </p>
            </div>
          ) : null}
          <dl className="mt-6 grid gap-3 text-sm">
            {[
              ["Status", title.status],
              ["Runtime", title.runtime ? `${title.runtime} min` : null],
              ["Certification", title.certification],
              ["Seasons", title.seasonCount],
              ["Episodes", title.episodeCount],
              ["Created by", title.creators?.join(", ")],
              ["Language", title.originalLanguage?.toUpperCase()],
            ].map(([label, value]) =>
              value ? (
                <div
                  key={label}
                  className="flex flex-wrap justify-between gap-2"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {title.providerLink ? (
            <a
              href={title.providerLink}
              target="_blank"
              rel="noreferrer"
              className="secondary-link mt-6 w-full"
            >
              Streaming options <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          ) : null}
          <Link
            href="/watchlist"
            prefetch={false}
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            Visit your watchlist <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </section>
      <div className="pb-12">
        <CarouselSection
          title="Keep the discovery going"
          eyebrow="More like this"
          items={similar.filter((item) => item.id !== title.id)}
        />
      </div>
      <TrailerModal
        open={open}
        onOpenChange={setOpen}
        trailerUrl={title.trailerUrl}
        title={title.title}
      />
    </>
  );
}
