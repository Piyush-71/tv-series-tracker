"use client";
import { ArrowUpRight, Search, SearchX, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaTitle } from "@/types/media";
import { useTracker } from "@/hooks/use-tracker";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
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
  const tracker = useTracker();
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<{
    key: string;
    results: MediaTitle[];
    error: boolean;
  } | null>(null);
  const debounced = useDebounce(query);
  const requestKey = `${debounced}:${retry}`;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/search?${new URLSearchParams({ q: debounced })}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Search failed");
        return response.json() as Promise<{ results: MediaTitle[] }>;
      })
      .then((response) =>
        setData({ key: requestKey, results: response.results, error: false }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setData({ key: requestKey, results: [], error: true });
      });
    return () => controller.abort();
  }, [debounced, open, requestKey]);
  const loading = query !== debounced || data?.key !== requestKey;
  const genres = [
    "All",
    ...new Set(data?.results.flatMap((item) => item.genres) ?? []),
  ];
  const results = (data?.results ?? [])
    .filter((item) => genre === "All" || item.genres.includes(genre))
    .filter((item) => type === "All" || item.type === type);
  function closeWithSearch() {
    tracker.addSearch(query);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} label="Search titles">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
        <div>
          <p className="eyebrow">A world of stories</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            What’s on your mind?
          </h2>
        </div>
        <Button
          aria-label="Close search"
          size="icon"
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          <X size={20} aria-hidden="true" />
        </Button>
      </div>
      <div className="p-5 sm:p-7">
        <label
          htmlFor="overlay-search"
          className="mb-2 block text-sm text-muted"
        >
          Search titles, genres, or platforms
        </label>
        <div className="relative">
          <Search
            size={19}
            className="absolute left-4 top-4 text-muted"
            aria-hidden="true"
          />
          <Input
            id="overlay-search"
            data-autofocus
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find your next great watch"
            className="pl-12"
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Genre
            <select
              aria-label="Filter by genre"
              className="field mt-2"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
            >
              {genres.map((value) => (
                <option key={value} value={value}>
                  {value === "All" ? "All genres" : value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Format
            <select
              aria-label="Filter by type"
              className="field mt-2"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {[
                ["All", "All titles"],
                ["tv", "TV series"],
                ["movie", "Movies"],
                ["anime", "Anime"],
                ["event", "Events"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!query && tracker.data.searchHistory.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <p className="w-full text-xs text-muted">Recent searches</p>
            {tracker.data.searchHistory.map((value) => (
              <button
                key={value}
                className="secondary-link px-4 text-xs"
                onClick={() => setQuery(value)}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mb-4 mt-6 flex items-center justify-between gap-3">
          <p role="status" className="text-xs font-medium text-muted">
            {loading
              ? "Searching the collection…"
              : data?.error
                ? "Search unavailable"
                : query
                  ? `${results.length} titles found`
                  : "Popular in the collection"}
          </p>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={closeWithSearch}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted hover:text-foreground"
          >
            See all results <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-surface-raised"
              />
            ))}
          </div>
        ) : data?.error ? (
          <div className="empty-state">
            <p className="text-sm text-muted">
              We couldn’t load results. Try again in a moment.
            </p>
            <Button
              className="mt-5"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </Button>
          </div>
        ) : results.length ? (
          <div className="grid gap-2">
            {results.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={`/title/${item.slug}`}
                onClick={closeWithSearch}
                className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-surface-raised"
              >
                <Image
                  src={item.poster}
                  alt=""
                  width={52}
                  height={78}
                  className="h-[78px] w-[52px] shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {item.type === "tv"
                      ? "TV series"
                      : item.type === "movie"
                        ? "Movie"
                        : item.type}{" "}
                    · {item.genres.slice(0, 2).join(" / ")}
                  </p>
                </div>
                <ArrowUpRight
                  size={17}
                  className="ml-auto shrink-0 text-muted"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SearchX
              size={25}
              className="mx-auto mb-4 text-muted"
              aria-hidden="true"
            />
            <h3 className="font-semibold">No stories found</h3>
            <p className="mt-3 text-sm text-muted">
              Try another title, genre, or platform.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
