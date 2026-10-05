"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Star } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Button } from "@/components/ui/button";
import type { BrowseResult, PremiereFilter } from "@/lib/browse/types";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function BrowseCard({ result, premiere }: { result: BrowseResult; premiere: PremiereFilter }) {
  const watchlist = useWatchlist();
  const { title } = result;
  const saved = watchlist.has(title.id);
  const label = result.season === null ? "Movie" : premiere === "airing" ? `Currently airing · Season ${result.season}` : result.season === 1 ? "New series · Season 1" : `Returning · Season ${result.season}`;
  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-violet-400/40">
      <Link href={`/title/${title.slug}`} aria-label={`View ${title.title} details`} className="relative block aspect-[2/3] overflow-hidden bg-zinc-950">
        <Image src={title.poster} alt={`${title.title} poster`} fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px" className="object-cover transition duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-violet-200">{label}</span>
      </Link>
      <div className="space-y-3 p-3 sm:p-4">
        <Link href={`/title/${title.slug}`} className="line-clamp-2 font-bold text-white hover:text-violet-200">{title.title}</Link>
        <p className="text-xs text-zinc-400">{result.season === null ? "Released" : "Premiered"} {displayDate(result.date)}</p>
        <p className="line-clamp-1 text-xs text-zinc-400">{title.genres.join(" · ")}</p>
        <p className="line-clamp-1 text-xs text-zinc-500">{title.originCountries?.map((country) => regionNames.of(country) || country).join(" · ") || "Origin unknown"}</p>
        {result.nextEpisodeDate && <p className="text-xs text-violet-300">Next episode {displayDate(result.nextEpisodeDate)}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="flex items-center gap-1 text-xs text-amber-300" aria-label={result.rating === null ? "Unrated on TMDB" : `TMDB title rating ${result.rating.toFixed(1)} out of 10`}>
            <Star size={14} />{result.rating === null ? "Unrated" : `${result.rating.toFixed(1)}/10`}<span className="text-zinc-500">TMDB</span>
          </span>
          <Button size="icon" variant="ghost" aria-label={`${saved ? "Unsave" : "Save"} ${title.title}`} aria-pressed={saved} onClick={() => watchlist.toggle(title.id)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></Button>
        </div>
      </div>
    </article>
  );
}
