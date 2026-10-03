"use client";

import { Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { useWatchlist } from "@/hooks/use-watchlist";
import { MediaGrid } from "@/components/media/media-grid";
import { ScheduleCard } from "@/components/schedule/schedule-card";
import { Button } from "@/components/ui/button";
import { getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduledEpisode } from "@/types/schedule";

export function WatchlistClient({ items, schedule = [] }: { items: MediaTitle[]; schedule?: ScheduledEpisode[] }) {
  const watchlist = useWatchlist();
  const saved = items.filter((item) => watchlist.ids.includes(item.id));
  const followedShows = schedule.filter((episode, index) => {
    const trackerId = getScheduleTrackerId(episode);
    return watchlist.ids.includes(trackerId) && schedule.findIndex((item) => item.showId === episode.showId) === index;
  });
  const [shared, setShared] = useState(false);

  async function share() {
    const url = new URL("/shared", window.location.origin);
    url.searchParams.set("ids", watchlist.ids.join(","));
    await navigator.clipboard.writeText(url.toString());
    setShared(true);
    window.setTimeout(() => setShared(false), 2000);
  }

  if (!saved.length && !followedShows.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.055] p-8 text-center">
        <h2 className="text-2xl font-black text-white">My Countdowns is waiting.</h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Follow a show from any countdown card and its next announced episode will appear here.
        </p>
        <Link href="/explore" className="mt-5 inline-block">
          <Button>Explore titles</Button>
        </Link>
      </div>
    );
  }

  return <div><div className="mb-5 flex justify-end"><Button variant="secondary" onClick={share}><Share2 size={17} />{shared ? "Link copied" : "Share this list"}</Button></div>{followedShows.length ? <div className="mb-10"><h2 className="mb-4 text-xl font-black text-white">Next episodes</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{followedShows.map((episode) => <ScheduleCard key={episode.id} episode={episode} />)}</div></div> : null}{saved.length ? <div><h2 className="mb-4 text-xl font-black text-white">Saved titles</h2><MediaGrid items={saved} /></div> : null}</div>;
}
