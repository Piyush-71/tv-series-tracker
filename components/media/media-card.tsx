"use client";
import { Bookmark, Check, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MediaTitle } from "@/types/media";
import { NotifyButton } from "@/components/tracker/notify-button";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";
export function MediaCard({
  title,
  rank,
}: {
  title: MediaTitle;
  rank?: number;
}) {
  const watchlist = useWatchlist();
  const saved = watchlist.has(title.id);
  return (
    <article className="group relative min-w-0">
      <div className="relative">
        <Link
          href={`/title/${title.slug}`}
          className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-surface"
          aria-label={`View ${title.title} details`}
        >
          <Image
            src={title.poster}
            alt={`${title.title} poster`}
            fill
            sizes="(max-width: 639px) 45vw, (max-width: 1023px) 28vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
          {rank ? (
            <span className="absolute bottom-3 left-4 text-4xl font-semibold tracking-tighter text-white/90">
              {String(rank).padStart(2, "0")}
            </span>
          ) : null}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
            {title.type === "tv"
              ? "Series"
              : title.type === "movie"
                ? "Film"
                : title.type === "anime"
                  ? "Anime"
                  : "Event"}
          </span>
        </Link>
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-3 right-3 h-11 w-11 border-white/40 bg-black/65 text-white hover:bg-black/85"
          aria-label={
            saved
              ? `Remove ${title.title} from watchlist`
              : `Save ${title.title} to watchlist`
          }
          aria-pressed={saved}
          onClick={() => watchlist.toggle(title.id)}
        >
          {saved ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Bookmark size={17} aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-semibold leading-5">
            <Link href={`/title/${title.slug}`} className="hover:underline">
              {title.title}
            </Link>
          </h3>
          {title.rating > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium">
              <Star size={12} className="text-muted" aria-hidden="true" />
              {title.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">
          {title.genres.slice(0, 2).join(" · ") || "Explore this title"}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="text-muted">
            <CountdownTimer
              titleId={title.id}
              releaseDate={title.releaseDate}
              releasePrecision={title.releasePrecision}
              compact
            />
          </div>
          <NotifyButton title={title} size="icon" className="h-11 w-11" />
        </div>
      </div>
    </article>
  );
}
