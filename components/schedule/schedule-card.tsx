"use client";
import { Bookmark, Check, Flame } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Airtime } from "@/components/schedule/airtime";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";
import { getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduledEpisode } from "@/types/schedule";
export function ScheduleCard({ episode }: { episode: ScheduledEpisode }) {
  const watchlist = useWatchlist();
  const trackerId = getScheduleTrackerId(episode);
  const saved = watchlist.has(trackerId);
  const href = `/show/${episode.showId}/${episode.slug}`;
  return (
    <article className="group rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
        <Link
          href={href}
          className="relative aspect-[2/3] self-start overflow-hidden rounded-xl bg-background"
          aria-label={`Open ${episode.title} countdown`}
        >
          <Image
            src={episode.poster}
            alt={`${episode.title} poster`}
            fill
            sizes="72px"
            className="object-cover"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-5">
                <Link href={href} className="hover:underline">
                  {episode.title}
                </Link>
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-muted">
                S{episode.seasonNumber} E{episode.episodeNumber}
                {episode.kind === "series-premiere"
                  ? " · Series premiere"
                  : episode.kind === "season-premiere"
                    ? " · Season premiere"
                    : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1"
              onClick={() => watchlist.toggle(trackerId)}
              aria-label={
                saved
                  ? `Remove ${episode.title} from My Countdowns`
                  : `Add ${episode.title} to My Countdowns`
              }
              aria-pressed={saved}
            >
              {saved ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Bookmark size={17} aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            <Airtime airsAt={episode.airsAt} />
          </p>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <ScheduleCountdown airsAt={episode.airsAt} />
      </div>
      {episode.rank ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <Flame size={12} aria-hidden="true" />
          Trending #{episode.rank}
        </p>
      ) : null}
    </article>
  );
}
