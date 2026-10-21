"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";

export function FollowShowButton({
  trackerId,
  title,
}: {
  trackerId: string;
  title: string;
}) {
  const watchlist = useWatchlist();
  const saved = watchlist.has(trackerId);
  return (
    <Button
      size="lg"
      className="max-w-full whitespace-normal py-3 text-left"
      variant="secondary"
      disabled={watchlist.isReady === false}
      aria-pressed={saved}
      onClick={() => watchlist.toggle(trackerId)}
    >
      <Bookmark
        aria-hidden="true"
        size={18}
        className="shrink-0"
        fill={saved ? "currentColor" : "none"}
      />
      <span className="min-w-0 break-words">
        {saved ? "In My Countdowns" : `Add ${title}`}
      </span>
    </Button>
  );
}
