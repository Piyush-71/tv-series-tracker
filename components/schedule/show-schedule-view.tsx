import { ArrowUpRight, CalendarDays, Flame, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FollowShowButton } from "@/components/schedule/follow-show-button";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import { formatAirtime } from "@/lib/schedule/format";
import type { ScheduledEpisode, ShowSchedule } from "@/types/schedule";

export function ShowScheduleView({ show }: { show: ShowSchedule }) {
  const focus = show.next ?? show.previous ?? show.premiere;
  if (!focus) return null;
  const trackerId = show.tmdbId ? `tv-${show.tmdbId}` : `simkl-${show.showId}`;

  return (
    <div className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_20%_5%,rgba(124,58,237,0.23),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,0.14),transparent_32%)]" />
      <section className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[260px_1fr] lg:items-center">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/12 bg-zinc-900 shadow-2xl">
          <Image src={show.poster} alt={`${show.title} poster`} fill priority sizes="260px" className="object-cover" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            {show.rank ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200"><Flame size={13} /> Rank #{show.rank}</span> : null}
            {show.rating ? <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-200"><Star size={13} fill="currentColor" /> {show.rating.toFixed(1)}</span> : null}
            <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-violet-200">S{focus.seasonNumber} E{focus.episodeNumber}</span>
          </div>
          <h1 className="mt-5 text-5xl font-black leading-none text-white sm:text-7xl">{show.title}</h1>
          <p className="mt-4 text-lg font-bold text-zinc-300">
            {show.next ? `Season ${show.next.seasonNumber} Episode ${show.next.episodeNumber} countdown` : "Latest episode airtime"}
          </p>
          <div className="mt-5"><TimezoneStatus /></div>
          <div className="mt-7 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-violet-300">{show.next ? "Countdown to release" : "Time since release"}</p>
            <ScheduleCountdown airsAt={focus.airsAt} large />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <FollowShowButton trackerId={trackerId} title={show.title} />
            {show.tmdbId ? <Link href={`/title/tv-${show.tmdbId}`} className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.055] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Full show details <ArrowUpRight size={17} /></Link> : null}
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
        {show.previous ? <Moment title="Previous episode" episode={show.previous} /> : null}
        {show.premiere ? <Moment title="Series premiere" episode={show.premiere} /> : null}
      </section>

      <section className="relative mx-auto mt-12 max-w-6xl rounded-2xl border border-white/10 bg-white/[0.035] p-6">
        <h2 className="text-xl font-black text-white">Announced episode schedule</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {show.episodes.slice(-12).map((episode) => (
            <div key={episode.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2.5 text-sm">
              <span className="font-bold text-zinc-200">S{episode.seasonNumber} E{episode.episodeNumber}</span>
              <span className="text-xs text-zinc-500">{formatAirtime(episode.airsAt)}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="relative mx-auto mt-8 max-w-6xl text-center text-xs text-zinc-600">
        Schedule data powered by <a href={focus.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-zinc-400 hover:text-white">Simkl</a>.
      </p>
    </div>
  );
}

function Moment({ title, episode }: { title: string; episode: ScheduledEpisode }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-300"><CalendarDays size={14} /> {title}</div>
      <h2 className="mt-3 text-xl font-black text-white">Season {episode.seasonNumber}, Episode {episode.episodeNumber}</h2>
      <p className="mt-2 text-sm text-zinc-400">{formatAirtime(episode.airsAt)}</p>
    </article>
  );
}
