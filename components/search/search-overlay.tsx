"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MediaTitle } from "@/types/media";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTracker } from "@/hooks/use-tracker";

export function SearchOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [type, setType] = useState("All");
  const [items, setItems] = useState<MediaTitle[]>([]);
  const [error, setError] = useState("");
  const debounced = useDebounce(query);
  const tracker = useTracker();

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debounced) params.set("q", debounced);

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { results?: MediaTitle[]; error?: { message: string } };
        if (!response.ok) throw new Error(data.error?.message || "Search is unavailable.");
        return data;
      })
      .then((data) => { setItems(data.results ?? []); setError(""); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setItems([]);
        setError(error instanceof Error ? error.message : "Search is unavailable.");
      });

    return () => controller.abort();
  }, [debounced, open]);

  const genres = ["All", ...Array.from(new Set(items.flatMap((item) => item.genres)))];
  const types = ["All", "tv", "movie", "anime", "event"];

  const results = useMemo(() => {
    return items
      .filter((item) => (genre === "All" ? true : item.genres.includes(genre)))
      .filter((item) => (type === "All" ? true : item.type === type))
      .sort((a, b) => b.popularity - a.popularity);
  }, [genre, items, type]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="cinematic fixed inset-0 z-50 overflow-y-auto bg-black/86 px-4 py-5 backdrop-blur-2xl sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Search releases"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={19} />
                <Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search shows, films, anime, live events..."
                  className="h-14 pl-12 text-base"
                />
              </div>
              <Button aria-label="Close search" size="icon" variant="secondary" onClick={() => onOpenChange(false)}>
                <X size={19} />
              </Button>
            </div>

            <div className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <SlidersHorizontal size={17} />
                Filters
              </div>
              <select
                aria-label="Filter by genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white"
              >
                {genres.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Filter by type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white"
              >
                {types.map((item) => (
                  <option key={item} value={item} className="capitalize">
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {!query && tracker.data.searchHistory.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent searches</span>
                {tracker.data.searchHistory.map((item) => <button key={item} onClick={() => setQuery(item)}><Badge>{item}</Badge></button>)}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3">
              {error ? <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-5 text-sm text-rose-200" role="alert">{error}</div> : null}
              {!error && query && results.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-zinc-400">No titles matched “{query}”. Try a broader title or remove a filter.</div> : null}
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/title/${item.slug}`}
                  onClick={() => { tracker.addSearch(query); onOpenChange(false); }}
                  className="group grid grid-cols-[76px_1fr] gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-3 transition hover:border-violet-300/50 hover:bg-white/10"
                >
                  <Image
                    src={item.poster}
                    alt={`${item.title} poster`}
                    width={76}
                    height={114}
                    className="aspect-[2/3] rounded-md object-cover"
                  />
                  <div className="min-w-0 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      <Badge className="capitalize">{item.type}</Badge>
                      <Badge>{item.platform}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
