"use client";

import { Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { useWatchlist } from "@/hooks/use-watchlist";
import { MediaGrid } from "@/components/media/media-grid";
import { Button } from "@/components/ui/button";

export function WatchlistClient({ items }: { items: MediaTitle[] }) {
  const watchlist = useWatchlist();
  const saved = items.filter((item) => watchlist.ids.includes(item.id));
  const [shared, setShared] = useState(false);

  async function share() {
    const url = new URL("/shared", window.location.origin);
    url.searchParams.set("ids", watchlist.ids.join(","));
    await navigator.clipboard.writeText(url.toString());
    setShared(true);
    window.setTimeout(() => setShared(false), 2000);
  }

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

  return <div><div className="mb-5 flex justify-end"><Button variant="secondary" onClick={share}><Share2 size={17} />{shared ? "Link copied" : "Share this list"}</Button></div><MediaGrid items={saved} /></div>;
}
