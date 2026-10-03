"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaEpisode } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { formatReleaseDate } from "@/lib/utils";

type CalendarEntry = { title: { id: string; slug: string; title: string; poster: string }; episode: MediaEpisode };

export function EpisodeCalendar() {
  const tracker = useTracker();
  const idKey = tracker.data.watchlistIds.filter((id) => id.startsWith("tv-")).join(",");
  const [state, setState] = useState<{ loading: boolean; entries: CalendarEntry[]; error: string }>({ loading: true, entries: [], error: "" });

  useEffect(() => {
    if (!idKey) return;
    const controller = new AbortController();
    fetch(`/api/calendar?ids=${encodeURIComponent(idKey)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { results?: CalendarEntry[]; error?: { message: string } };
        if (!response.ok) throw new Error(body.error?.message || "Calendar unavailable.");
        setState({ loading: false, entries: body.results ?? [], error: "" });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState({ loading: false, entries: [], error: reason instanceof Error ? reason.message : "Calendar unavailable." });
      });
    return () => controller.abort();
  }, [idKey]);

  return (
    <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-300">Your schedule</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">Upcoming episodes</h1>
      <p className="mt-4 text-zinc-400">Next announced episodes for TV and anime in your watchlist, ordered by air date.</p>
      <div className="mt-8">
        {!idKey ? <Empty /> : state.loading ? <div className="flex items-center gap-2 text-zinc-400"><LoaderCircle className="animate-spin" size={18} />Building your calendar…</div> : state.error ? <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-200" role="alert">{state.error}</div> : !state.entries.length ? <div className="rounded-xl border border-dashed border-white/15 p-8 text-zinc-400">No next episodes have been announced for your saved shows.</div> : <div className="grid gap-3">{state.entries.map((entry) => <Link key={`${entry.title.id}-${entry.episode.id}`} href={`/title/${entry.title.slug}`} className="grid grid-cols-[72px_1fr] gap-4 rounded-xl border border-white/10 bg-white/[0.055] p-3 hover:border-violet-300/40 sm:grid-cols-[72px_1fr_auto] sm:items-center"><Image src={entry.title.poster} alt="" width={72} height={108} className="aspect-[2/3] rounded-md object-cover" /><div><p className="text-xs font-bold uppercase tracking-wider text-violet-300">Season {entry.episode.seasonNumber} · Episode {entry.episode.episodeNumber}</p><h2 className="mt-1 text-lg font-black text-white">{entry.title.title}: {entry.episode.name}</h2><p className="mt-1 line-clamp-1 text-sm text-zinc-400">{entry.episode.overview}</p></div><div className="flex items-center gap-2 text-sm font-bold text-zinc-300"><CalendarDays size={17} />{entry.episode.airDate ? formatReleaseDate(entry.episode.airDate) : "TBA"}</div></Link>)}</div>}
      </div>
    </section>
  );
}

function Empty() {
  return <div className="rounded-xl border border-white/10 bg-white/[0.055] p-8 text-center"><CalendarDays className="mx-auto text-violet-300" size={36} /><h2 className="mt-4 text-2xl font-black text-white">Your calendar is empty.</h2><p className="mt-2 text-zinc-400">Save a TV show or anime to start following its next episode.</p><Link href="/explore" className="mt-5 inline-block"><Button>Explore shows</Button></Link></div>;
}
