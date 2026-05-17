"use client";

import Link from "next/link";
import type { MediaTitle } from "@/types/media";
import { useWatchlist } from "@/hooks/use-watchlist";
import { MediaGrid } from "@/components/media/media-grid";
import { Button } from "@/components/ui/button";

export function WatchlistClient({ items }: { items: MediaTitle[] }) {
  const watchlist = useWatchlist();
  const saved = items.filter((item) => watchlist.ids.includes(item.id));

  if (!saved.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.055] p-8 text-center">
        <h2 className="text-2xl font-black text-white">Your watchlist is waiting.</h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Save releases from any card or details page and they will appear here instantly.
        </p>
        <Link href="/explore" className="mt-5 inline-block">
          <Button>Explore titles</Button>
        </Link>
      </div>
    );
  }

  return <MediaGrid items={saved} />;
}
