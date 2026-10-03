"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";

export function FollowShowButton({ trackerId, title }: { trackerId: string; title: string }) {
  const watchlist = useWatchlist();
  const saved = watchlist.has(trackerId);
  return (
    <Button size="lg" variant={saved ? "danger" : "secondary"} onClick={() => watchlist.toggle(trackerId)}>
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
      {saved ? "In My Countdowns" : `Add ${title}`}
    </Button>
  );
}

