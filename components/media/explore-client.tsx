"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrowseCard } from "@/components/media/browse-card";
import { browseQueryParams, defaultBrowseQuery, parseBrowseQuery } from "@/lib/browse/query";
import type { BrowseMode, BrowseOptions, BrowsePage, BrowseQuery, BrowseSort, DateRange, PremiereFilter } from "@/lib/browse/types";

const modes: Array<{ value: BrowseMode; label: string }> = [{ value: "tv", label: "Series" }, { value: "anime", label: "Anime" }, { value: "movie", label: "Movies" }];
const premieres: Array<{ value: PremiereFilter; label: string }> = [{ value: "new", label: "New series" }, { value: "returning", label: "Returning seasons" }, { value: "airing", label: "Currently airing" }];
const ranges: Array<{ value: DateRange; label: string }> = [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "upcoming", label: "Upcoming" }, { value: "custom", label: "Custom dates" }, { value: "all", label: "All dates" }];

function sortOptions(movie: boolean): Array<{ value: BrowseSort; label: string }> {
  return [{ value: "newest", label: movie ? "Newest release" : "Newest premiere" }, { value: "oldest", label: movie ? "Oldest release" : "Oldest premiere" }, ...(!movie ? [{ value: "next_episode" as const, label: "Next episode soonest" }] : []), { value: "rating", label: "Highest rating" }, { value: "popularity", label: "Popularity" }, { value: "title", label: "Title A–Z" }];
}

function navigate(query: BrowseQuery, replace = false) {
  const url = `/explore?${browseQueryParams(query)}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

export function ExploreClient({ options }: { options: BrowseOptions }) {
  const params = useSearchParams();
  const { data } = useTracker();
  const urlKey = params.toString();
  const timeZone = data.preferences.timeZone;
  const parsed = useMemo(() => {
    try { return { query: parseBrowseQuery(new URLSearchParams(urlKey), timeZone), error: "" }; }
    catch (error) { return { query: defaultBrowseQuery("tv", timeZone), error: error instanceof Error ? error.message : "Invalid filters." }; }
  }, [urlKey, timeZone]);
  const filterKey = browseQueryParams({ ...parsed.query, page: 1, snapshot: undefined }).toString();
  return <ExploreSession key={`${filterKey}|${parsed.error ? urlKey : ""}|${timeZone}`} applied={parsed.query} initialError={parsed.error} options={options} />;
}

function ExploreSession({ applied, initialError, options }: { applied: BrowseQuery; initialError: string; options: BrowseOptions }) {
  const [draft, setDraft] = useState(applied);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<BrowsePage | null>(null);
  const [loading, setLoading] = useState(!initialError);
  const [error, setError] = useState(initialError);
  const [retry, setRetry] = useState(0);
  const apiParams = browseQueryParams(applied).toString();

  useEffect(() => {
    if (initialError) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/browse?${apiParams}`, { signal: controller.signal });
        const body: BrowsePage & { error?: { message: string } } = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Could not load results.");
        if (!controller.signal.aborted) { setResult(body); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load results.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [apiParams, initialError, retry]);

  function apply(query = draft) {
    try {
      const normalized = parseBrowseQuery(browseQueryParams({ ...query, page: 1, snapshot: undefined }), query.timeZone);
      setError("");
      setDraft(normalized);
      setLoading(true);
      const sameQuery = browseQueryParams(normalized).toString() === browseQueryParams(applied).toString();
      if (browseQueryParams(normalized).toString() !== window.location.search.slice(1) || initialError) navigate(normalized);
      if (sameQuery && !initialError) setRetry((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Invalid filters."); }
  }

  function reset() { apply(defaultBrowseQuery(draft.mode, applied.timeZone)); }
  function clear() { apply({ ...defaultBrowseQuery(applied.mode, applied.timeZone), premiere: applied.premiere, range: "all" }); }
  function updateDraft(patch: Partial<BrowseQuery>) { setDraft((current) => ({ ...current, ...patch })); }
  function changeMode(mode: BrowseMode) {
    setDraft((current) => ({ ...defaultBrowseQuery(mode, applied.timeZone), countries: current.countries, genres: current.genres, query: current.query, minRating: current.minRating, sort: current.sort === "next_episode" && mode === "movie" ? "newest" : current.sort }));
  }

  const pending = browseQueryParams({ ...draft, page: 1, snapshot: undefined }).toString() !== browseQueryParams({ ...applied, page: 1, snapshot: undefined }).toString();
  const movie = draft.mode === "movie";
  const hideDates = !movie && draft.premiere === "airing";
  const chips: Array<{ label: string; remove: () => void }> = [
    ...applied.countries.map((country) => ({ label: options.countries.find((option) => option.code === country)?.label || country, remove: () => apply({ ...applied, countries: applied.countries.filter((value) => value !== country) }) })),
    ...applied.genres.map((genre) => ({ label: genre, remove: () => apply({ ...applied, genres: applied.genres.filter((value) => value !== genre) }) })),
    ...(applied.query ? [{ label: `Search: ${applied.query}`, remove: () => apply({ ...applied, query: "" }) }] : []),
    ...(applied.minRating !== null ? [{ label: `TMDB ≥ ${applied.minRating}/10`, remove: () => apply({ ...applied, minRating: null }) }] : []),
    ...(applied.range !== "all" ? [{ label: applied.range === "custom" ? `${applied.from} – ${applied.to}` : ranges.find((range) => range.value === applied.range)?.label || applied.range, remove: () => apply({ ...applied, range: "all", from: "", to: "" }) }] : []),
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); apply(); }} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-6">
        <div role="group" aria-label="Content type" className="mb-5 flex gap-1 rounded-xl bg-black/30 p-1 sm:w-fit">
          {modes.map((mode) => <button type="button" key={mode.value} aria-pressed={draft.mode === mode.value} onClick={() => changeMode(mode.value)} className={`flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold transition sm:flex-none ${draft.mode === mode.value ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30" : "text-zinc-400 hover:text-white"}`}>{mode.label}</button>)}
        </div>
        <label className="block"><span className="sr-only">Search by title</span><Input aria-label="Search by title" placeholder="Search by title…" maxLength={100} value={draft.query} onChange={(event) => updateDraft({ query: event.target.value })} /></label>
        <button type="button" aria-expanded={expanded} aria-controls="browse-filter-fields" className="mt-4 flex items-center gap-2 text-sm text-violet-200 md:hidden" onClick={() => setExpanded(!expanded)}><SlidersHorizontal size={16} />{expanded ? "Hide filters" : "Show filters"}</button>
        <div id="browse-filter-fields" className={`mt-5 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 ${expanded ? "grid" : "hidden"}`}>
          {!movie && <Select label="Season status" value={draft.premiere} options={premieres} onChange={(value) => setDraft((current) => ({ ...current, premiere: value, range: value === "airing" ? "all" : current.range === "all" ? "30" : current.range }))} />}
          <MultiSelect label="Country of origin" options={options.countries.map((country) => ({ value: country.code, label: country.label }))} selected={draft.countries} onChange={(countries) => updateDraft({ countries })} />
          <MultiSelect label="Genre" options={options.genres.map((genre) => ({ value: genre, label: genre }))} selected={draft.genres} onChange={(genres) => updateDraft({ genres })} />
          {!hideDates && <Select label={movie ? "Release-date range" : "Premiere-date range"} value={draft.range} options={ranges} onChange={(range) => updateDraft({ range })} />}
          <label className="block text-xs font-semibold text-zinc-400">Minimum TMDB title rating / 10<Input className="mt-2" type="number" min="0" max="10" step="0.1" placeholder="Any rating" value={draft.minRating ?? ""} onChange={(event) => updateDraft({ minRating: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          <Select label="Sort results" value={draft.sort} options={sortOptions(movie)} onChange={(sort) => updateDraft({ sort })} />
          {!hideDates && draft.range === "custom" && <div className="grid grid-cols-2 gap-3 md:col-span-2"><label className="text-xs font-semibold text-zinc-400">From<Input className="mt-2" type="date" required value={draft.from} onChange={(event) => updateDraft({ from: event.target.value })} /></label><label className="text-xs font-semibold text-zinc-400">Through<Input className="mt-2" type="date" required min={draft.from || undefined} value={draft.to} onChange={(event) => updateDraft({ to: event.target.value })} /></label></div>}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">{hideDates ? "Started seasons with a confirmed future episode, including midseason breaks. Seasons with unknown completion status are excluded." : `Dates use ${applied.timeZone}. ${movie ? "Original movie release dates." : "Dates refer to the matching season’s premiere."}`} Select any matching country or genre; different filters combine.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}><Search size={16} />Apply filters</Button>
          <Button variant="ghost" onClick={reset} disabled={loading}><RotateCcw size={16} />Reset</Button>
          {pending && <span className="text-xs text-amber-200">Changes ready to apply</span>}
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{modes.find((mode) => mode.value === applied.mode)?.label}{applied.mode !== "movie" && ` · ${premieres.find((premiere) => premiere.value === applied.premiere)?.label}`}</h2>
        <span className="text-sm text-zinc-400" role="status" aria-live="polite">{loading ? "Loading results…" : result ? `${result.totalResults} ${result.totalResults === 1 ? "match" : "matches"} · ${sortOptions(applied.mode === "movie").find((sort) => sort.value === applied.sort)?.label}` : ""}</span>
      </div>
      {chips.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Applied filters">{chips.map((chip) => <button key={chip.label} type="button" onClick={chip.remove} disabled={loading} aria-label={`Remove filter ${chip.label}`} className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 disabled:opacity-50">{chip.label}<X size={12} /></button>)}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-5 text-rose-200"><p>{error}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => apply({ ...applied, page: 1, snapshot: undefined })} disabled={loading}>Refresh results</Button><Button className="ml-2 mt-3" size="sm" variant="ghost" onClick={reset}>Reset filters</Button></div>}
      {loading && !result && <div className="flex items-center gap-3 py-12 text-zinc-400"><LoaderCircle className="animate-spin" size={20} />Loading verified titles…</div>}
      {result && <>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs leading-relaxed text-zinc-400">
          {result.coverage.configured ? <><strong className="text-zinc-300">Verified coverage:</strong> {result.coverage.verifiedTitles} titles in this mode, from a limited selection of recent, upcoming, popular, and calendar titles. This is not the full catalog; custom dates and search cover this selection. {result.coverage.unavailableTitles > 0 && `${result.coverage.unavailableTitles} titles could not be verified. `}Unknown season status is excluded from Currently Airing.</> : "Verified browsing is unavailable until TMDB access is configured. Sample titles are not included in these results."}
        </div>
        {result.results.length > 0 ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{result.results.map((item) => <BrowseCard key={item.title.id} result={item} premiere={applied.premiere} />)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><h3 className="text-xl font-bold text-white">No matches</h3><p className="mt-2 text-sm text-zinc-400">Try a wider date range or remove a country, genre, or rating filter.</p><Button className="mt-5" variant="secondary" onClick={clear}>Clear filters</Button></div>}
        {result.hasMore && <div className="flex justify-center"><Button variant="secondary" size="lg" disabled={loading} onClick={() => { setLoading(true); navigate({ ...applied, page: applied.page + 1, snapshot: result.snapshot }, true); }}>{loading ? <><LoaderCircle size={16} className="animate-spin" />Loading more…</> : "Load more results"}</Button></div>}
      </>}
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <label className="block text-xs font-semibold text-zinc-400">{label}<select aria-label={label} value={value} onChange={(event) => { const option = options.find((item) => item.value === event.target.value); if (option) onChange(option.value); }} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-white focus-visible:outline-violet-400">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function MultiSelect({ label, options, selected, onChange }: { label: string; options: Array<{ value: string; label: string }>; selected: string[]; onChange: (values: string[]) => void }) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="text-xs font-semibold text-zinc-400"><p>{label}</p><details className="mt-2 rounded-lg border border-white/10 bg-zinc-950"><summary className="cursor-pointer p-3 text-sm text-white">{selected.length ? `${selected.length} selected` : `All ${label === "Genre" ? "genres" : "countries"}`}</summary><div className="border-t border-white/10 p-3"><Input aria-label={`Find ${label.toLowerCase()}`} placeholder={`Find ${label.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} /><fieldset className="mt-3 max-h-48 space-y-1 overflow-y-auto"><legend className="sr-only">{label}</legend>{filtered.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-2 font-normal text-zinc-300 hover:bg-white/5"><input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))} className="accent-violet-500" />{option.label}</label>)}{!filtered.length && <p className="py-2 font-normal">No options match.</p>}</fieldset></div></details></div>;
}
