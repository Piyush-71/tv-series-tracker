"use client";

import { Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { CollectionGrid } from "@/components/media/collection-grid";
import { useCollection } from "@/hooks/use-collection";
import { Button } from "@/components/ui/button";

export function WatchlistClient() {
  const watchlist = useWatchlist();
  const collection = useCollection(watchlist.ids);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState("");

  async function share() {
    const url = new URL("/shared", window.location.origin);
    url.searchParams.set("ids", watchlist.ids.join(","));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShared(true);
      setShareError("");
      window.setTimeout(() => setShared(false), 2000);
    } catch { setShareError("The link could not be copied. Allow clipboard access and try again."); }
  }

  if (!watchlist.ids.length) {
    return (
      <div className="empty-state">
        <h2 className="text-2xl font-semibold text-foreground">
          My Countdowns is waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Follow a show from any countdown card and its next announced episode
          will appear here.
        </p>
        <Link href="/" className="action-link mt-6">
          Discover shows
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button variant="secondary" onClick={share}>
          <Share2 size={17} />
          {shared ? "Link copied" : "Share this list"}
        </Button>
      </div>
      {shareError ? <p role="alert" className="mb-4 text-sm text-danger">{shareError}</p> : null}
      <CollectionGrid entries={collection.entries} loading={collection.loading} showEpisodes onRemove={watchlist.toggle} onRetry={collection.refresh} />
    </div>
  );
}
