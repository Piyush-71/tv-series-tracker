"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { MediaTitle, MediaType } from "@/types/media";
import { MediaGrid } from "@/components/media/media-grid";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ExploreClient({ items, genres }: { items: MediaTitle[]; genres: string[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [type, setType] = useState<"All" | MediaType>("All");
  const [year, setYear] = useState("All");

  const filtered = useMemo(() => {
    return items
      .filter((item) => (genre === "All" ? true : item.genres.includes(genre)))
      .filter((item) => (type === "All" ? true : item.type === type))
      .filter((item) => (year === "All" ? true : new Date(item.releaseDate).getFullYear().toString() === year))
      .filter((item) =>
        query
          ? [item.title, item.description, item.platform, ...item.genres].join(" ").toLowerCase().includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => b.popularity - a.popularity);
  }, [genre, items, query, type, year]);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the catalog" />
        <select value={genre} onChange={(event) => setGenre(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-sm text-white">
          {["All", ...genres].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value as "All" | MediaType)} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-sm text-white">
          {["All", "tv", "movie", "anime", "event"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-black px-3 text-sm text-white">
          {["All", "2026"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <SlidersHorizontal size={16} />
        <span>{filtered.length} releases matched</span>
        <Badge>Popularity sorted</Badge>
      </div>
      <MediaGrid items={filtered} />
    </div>
  );
}
