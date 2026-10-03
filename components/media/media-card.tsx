"use client";

import { motion } from "framer-motion";
import { Bookmark, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MediaTitle } from "@/types/media";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatReleaseDate } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";
import { NotifyButton } from "@/components/tracker/notify-button";

export function MediaCard({ title }: { title: MediaTitle }) {
  const watchlist = useWatchlist();
  const saved = watchlist.has(title.id);

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="group relative min-w-[230px] max-w-[260px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl"
    >
      <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute -inset-px rounded-lg bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.42),transparent_48%),radial-gradient(circle_at_90%_25%,rgba(225,29,72,0.28),transparent_34%)]" />
      </div>
      <Link href={`/title/${title.slug}`} className="relative block" aria-label={`View ${title.title} details`}>
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-950">
          <Image
            src={title.poster}
            alt={`${title.title} poster`}
            fill
            sizes="(max-width: 768px) 70vw, 260px"
            className="object-cover transition duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <Badge className="absolute left-3 top-3 capitalize">{title.type}</Badge>
          <div className="absolute bottom-3 left-3 right-3">
            <CountdownTimer titleId={title.id} releaseDate={title.releaseDate} releasePrecision={title.releasePrecision} compact />
          </div>
        </div>
      </Link>
      <div className="relative space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-1 text-base font-bold text-white">{title.title}</h3>
            <p className="mt-1 text-xs text-zinc-400">
              {title.genres.slice(0, 2).join(" / ")} • {formatReleaseDate(title.releaseDate)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-amber-300">
            <Star size={15} fill="currentColor" />
            {title.rating.toFixed(1)}
          </div>
        </div>
        <div className="flex gap-2">
          <NotifyButton title={title} size="sm" compact />
          <Button
            aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
            size="icon"
            variant={saved ? "danger" : "secondary"}
            onClick={() => watchlist.toggle(title.id)}
          >
            {saved ? <Bookmark size={16} fill="currentColor" /> : <Bookmark size={16} />}
          </Button>
          <Link href={`/title/${title.slug}`} className="contents">
            <Button aria-label={`Play ${title.title} trailer`} size="icon" variant="ghost">
              <Play size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
