"use client";

import { LoaderCircle, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { MediaType } from "@/types/media";
import type { DiscoveryFilters, DiscoveryPage, TmdbQuery } from "@/lib/tmdb/types";
import { MediaGrid } from "@/components/media/media-grid";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FilterState = {
  query: string;
  genre: string;
  type: "all" | MediaType;
  year: string;
  sort: NonNullable<TmdbQuery["sort"]>;
  country: string;
  language: string;
  provider: string;
  availability: string;
};

const initialFilters: FilterState = { query: "", genre: "", type: "all", year: "", sort: "popularity", country: "", language: "", provider: "", availability: "" };

export function ExploreClient({ initialPage, options }: { initialPage: DiscoveryPage; options: DiscoveryFilters }) {
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialPage.results);
  const [page, setPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.totalPages);
  const [totalResults, setTotalResults] = useState(initialPage.totalResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(nextPage: number, replace: boolean, nextFilters = filters) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(nextPage), type: nextFilters.type, sort: nextFilters.sort });
    if (nextFilters.query.trim()) params.set("q", nextFilters.query.trim());
    if (nextFilters.genre) params.set("genre", nextFilters.genre);
    if (nextFilters.year) params.set("year", nextFilters.year);
    if (nextFilters.country) params.set("country", nextFilters.country);
    if (nextFilters.language) params.set("language", nextFilters.language);
    if (nextFilters.provider) params.set("provider", nextFilters.provider);
    if (nextFilters.availability) params.set("availability", nextFilters.availability);

    try {
      const response = await fetch(`/api/titles?${params.toString()}`);
      const body = (await response.json()) as DiscoveryPage & { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message || "Could not load the catalog.");
      setItems((current) => replace ? body.results : Array.from(new Map([...current, ...body.results].map((item) => [item.id, item])).values()));
      setPage(body.page);
      setTotalPages(body.totalPages);
      setTotalResults(body.totalResults);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the catalog.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFilters(initialFilters);
    void load(1, true, initialFilters);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={(event) => { event.preventDefault(); void load(1, true); }} className="rounded-xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search the catalog" className="lg:col-span-2" />
          <Select label="Media type" value={filters.type} onChange={(value) => setFilters({ ...filters, type: value as FilterState["type"] })} options={[{ value: "all", label: "All types" }, { value: "tv", label: "TV" }, { value: "movie", label: "Movies" }, { value: "anime", label: "Anime" }]} />
          <Select label="Genre" value={filters.genre} onChange={(value) => setFilters({ ...filters, genre: value })} options={[{ value: "", label: "All genres" }, ...options.genres.map((value) => ({ value, label: value }))]} />
          <Select label="Year" value={filters.year} onChange={(value) => setFilters({ ...filters, year: value })} options={[{ value: "", label: "All years" }, ...options.years.map((value) => ({ value: String(value), label: String(value) }))]} />
          <Select label="Sort" value={filters.sort} onChange={(value) => setFilters({ ...filters, sort: value as FilterState["sort"] })} options={[{ value: "popularity", label: "Popularity" }, { value: "release_date", label: "Release date" }, { value: "rating", label: "Rating" }, { value: "title", label: "Title" }]} />
          <Select label="Country" value={filters.country} onChange={(value) => setFilters({ ...filters, country: value })} options={[{ value: "", label: "All countries" }, ...options.countries.map((item) => ({ value: item.code, label: item.label }))]} />
          <Select label="Language" value={filters.language} onChange={(value) => setFilters({ ...filters, language: value })} options={[{ value: "", label: "All languages" }, ...options.languages.map((item) => ({ value: item.code, label: item.label }))]} />
          <Select label="Provider" value={filters.provider} onChange={(value) => setFilters({ ...filters, provider: value })} options={[{ value: "", label: "All providers" }, ...options.providers.map((item) => ({ value: String(item.id), label: item.name }))]} />
          <Select label="Availability" value={filters.availability} onChange={(value) => setFilters({ ...filters, availability: value })} options={[{ value: "", label: "Any availability" }, { value: "flatrate", label: "Subscription" }, { value: "free", label: "Free" }, { value: "rent", label: "Rent" }, { value: "buy", label: "Buy" }]} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}><Search size={17} />Apply filters</Button>
          <Button variant="ghost" onClick={reset} disabled={loading}><RotateCcw size={17} />Reset</Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <SlidersHorizontal size={16} /><span>{totalResults.toLocaleString()} releases matched</span><Badge>{filters.sort.replace("_", " ")} sorted</Badge><Badge>Page {page} of {totalPages}</Badge>
      </div>

      {error ? <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-200" role="alert">{error}<Button className="ml-4" size="sm" variant="secondary" onClick={() => void load(page, page === 1)}>Try again</Button></div> : null}
      {!loading && !error && items.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.035] p-10 text-center"><h2 className="text-xl font-black text-white">No releases match yet.</h2><p className="mt-2 text-zinc-400">Try removing a provider, country, or year filter.</p><Button className="mt-5" variant="secondary" onClick={reset}>Clear filters</Button></div> : <MediaGrid items={items} />}
      {page < totalPages ? <div className="flex justify-center"><Button size="lg" variant="secondary" disabled={loading} onClick={() => void load(page + 1, false)}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : null}{loading ? "Loading…" : "Load more releases"}</Button></div> : null}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="text-xs font-semibold text-zinc-400"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white">{options.map((item) => <option key={`${label}-${item.value}`} value={item.value}>{item.label}</option>)}</select></label>;
}
