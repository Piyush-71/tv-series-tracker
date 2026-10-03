"use client";

import { Bookmark, Flame } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { useWatchlist } from "@/hooks/use-watchlist";
import { formatAirtime, getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduledEpisode } from "@/types/schedule";

export function ScheduleCard({ episode }: { episode: ScheduledEpisode }) {
  const watchlist = useWatchlist();
  const trackerId = getScheduleTrackerId(episode);
  const saved = watchlist.has(trackerId);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1120]/85 shadow-[0_16px_45px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-violet-300/35">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.17),transparent_45%)] opacity-0 transition group-hover:opacity-100" />
      <div className="relative grid grid-cols-[86px_1fr] gap-3 p-3">
        <Link href={`/show/${episode.showId}/${episode.slug}`} className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900" aria-label={`Open ${episode.title} countdown`}>
          <Image src={episode.poster} alt={`${episode.title} poster`} fill sizes="86px" className="object-cover transition duration-300 group-hover:scale-105" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Link href={`/show/${episode.showId}/${episode.slug}`} className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-black leading-5 text-white">{episode.title}</h3>
              <p className="mt-1 text-xs font-semibold text-violet-300">
                S{episode.seasonNumber} E{episode.episodeNumber}
                {episode.kind === "series-premiere" ? " · Series premiere" : episode.kind === "season-premiere" ? " · Season premiere" : ""}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => watchlist.toggle(trackerId)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label={saved ? `Remove ${episode.title} from My Countdowns` : `Add ${episode.title} to My Countdowns`}
            >
              <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
          <p className="mt-2 line-clamp-1 text-[11px] text-zinc-500">{formatAirtime(episode.airsAt)}</p>
          <div className="mt-3">
            <ScheduleCountdown airsAt={episode.airsAt} />
          </div>
          {episode.rank ? (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              <Flame size={11} /> Rank #{episode.rank}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
