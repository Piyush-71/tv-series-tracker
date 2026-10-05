"use client";
import { ArrowUpRight, Bookmark, Check, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { NotifyButton } from "@/components/tracker/notify-button";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { TrailerModal } from "@/components/media/trailer-modal";
import { formatReleaseDate } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";
export function HeroBanner({ title }: { title: MediaTitle }) {
  const [open, setOpen] = useState(false);
  const watchlist = useWatchlist();
  const saved = watchlist.has(title.id);
  return (
    <section
      aria-label="Featured title"
      className="hero-surface relative isolate overflow-hidden rounded-3xl border border-border"
    >
      <Image
        src={title.backdrop}
        alt=""
        fill
        preload
        sizes="(max-width: 1440px) 100vw, 1344px"
        className="object-cover object-[65%_center]"
      />
      <div className="hero-shade absolute inset-0" />
      <div className="relative flex min-h-[540px] flex-col justify-end px-6 pb-7 pt-32 sm:min-h-[510px] sm:px-10 sm:pt-10 lg:px-12">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            In the spotlight
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-hero-muted">
            <span className="capitalize">
              {title.type === "tv" ? "TV series" : title.type}
            </span>
            <span aria-hidden="true">/</span>
            <span>{title.genres.slice(0, 2).join(" · ")}</span>
            {title.rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star
                  size={12}
                  className="text-accent"
                  fill="currentColor"
                  aria-hidden="true"
                />
                {title.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.055em] text-hero-text sm:text-6xl">
            {title.title}
          </h2>
          <p className="mt-5 line-clamp-3 max-w-lg text-sm leading-6 text-hero-muted sm:text-base sm:leading-7">
            {title.description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <NotifyButton
              title={title}
              size="icon"
              className="border-hero-muted/40 bg-hero-text/10 text-hero-text hover:bg-hero-text/20"
            />
            <Link href={`/title/${title.slug}`} className="action-link">
              Explore title <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Button
              variant="secondary"
              className="border-hero-muted/40 bg-hero-text/10 text-hero-text hover:bg-hero-text/20"
              onClick={() => setOpen(true)}
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              Watch trailer
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label={
                saved
                  ? `Remove ${title.title} from watchlist`
                  : `Save ${title.title} to watchlist`
              }
              aria-pressed={saved}
              className="border-hero-muted/40 bg-hero-text/10 text-hero-text hover:bg-hero-text/20"
              onClick={() => watchlist.toggle(title.id)}
            >
              {saved ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Bookmark size={18} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-5 border-t border-hero-muted/25 pt-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-hero-muted">
              Release date
            </p>
            <p className="mt-1 text-sm font-medium text-hero-text">
              {formatReleaseDate(title.releaseDate)}
              <span className="ml-3 text-hero-muted">
                {title.platform !== "TMDB"
                  ? title.platform
                  : "Movie & TV discovery"}
              </span>
            </p>
          </div>
          <CountdownTimer
            releaseDate={title.releaseDate}
            titleId={title.id}
            releasePrecision={title.releasePrecision}
          />
        </div>
      </div>
      <TrailerModal
        open={open}
        onOpenChange={setOpen}
        trailerUrl={title.trailerUrl}
        title={title.title}
      />
    </section>
  );
}
