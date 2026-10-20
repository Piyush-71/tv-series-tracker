"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { BrowseCard } from "@/components/media/browse-card";
import {
  ExploreFilterFields,
  activeFilterCount,
} from "@/components/media/explore-filter-fields";
import {
  browseQueryParams,
  defaultBrowseQuery,
  parseBrowseQuery,
} from "@/lib/browse/query";
import type {
  BrowseMode,
  BrowseOptions,
  BrowsePage,
  BrowseQuery,
  BrowseSort,
  DateRange,
  PremiereFilter,
} from "@/lib/browse/types";

const modes: Array<{ value: BrowseMode; label: string }> = [
  { value: "tv", label: "Series" },
  { value: "anime", label: "Anime" },
  { value: "movie", label: "Movies" },
];
const premieres: Array<{ value: PremiereFilter; label: string }> = [
  { value: "new", label: "New series" },
  { value: "returning", label: "Returning seasons" },
  { value: "airing", label: "Currently airing" },
];
const ranges: Array<{ value: DateRange; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "upcoming", label: "Upcoming" },
  { value: "custom", label: "Custom dates" },
  { value: "all", label: "All dates" },
];

function sortOptions(
  movie: boolean,
  upcoming = false,
): Array<{ value: BrowseSort; label: string }> {
  return [
    { value: "newest", label: movie ? "Newest release" : "Newest premiere" },
    {
      value: "oldest",
      label: upcoming
        ? movie ? "Soonest release" : "Soonest premiere"
        : movie ? "Oldest release" : "Oldest premiere",
    },
    ...(!movie
      ? [{ value: "next_episode" as const, label: "Next episode soonest" }]
      : []),
    { value: "rating", label: "Highest rating" },
    { value: "popularity", label: "Popularity" },
    { value: "title", label: "Title A–Z" },
  ];
}

function navigate(query: BrowseQuery, replace = false) {
  const url = `/explore?${browseQueryParams(query)}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

function subscribeToViewport(onChange: () => void) {
  const viewport = window.matchMedia?.("(max-width: 767px)");
  viewport?.addEventListener("change", onChange);
  return () => viewport?.removeEventListener("change", onChange);
}

function mobileViewport() {
  return window.matchMedia?.("(max-width: 767px)").matches ?? false;
}

export function ExploreClient({ options }: { options: BrowseOptions }) {
  const params = useSearchParams();
  const { data } = useTracker();
  const urlKey = params.toString();
  const timeZone = data.preferences.timeZone;
  const parsed = useMemo(() => {
    try {
      return {
        query: parseBrowseQuery(new URLSearchParams(urlKey), timeZone),
        error: "",
      };
    } catch (error) {
      return {
        query: defaultBrowseQuery("tv", timeZone),
        error: error instanceof Error ? error.message : "Invalid filters.",
      };
    }
  }, [urlKey, timeZone]);
  const filterKey = browseQueryParams({
    ...parsed.query,
    page: 1,
    snapshot: undefined,
  }).toString();
  return (
    <ExploreSession
      key={`${filterKey}|${parsed.error ? urlKey : ""}|${timeZone}`}
      applied={parsed.query}
      initialError={parsed.error}
      options={options}
    />
  );
}

function ExploreSession({
  applied,
  initialError,
  options,
}: {
  applied: BrowseQuery;
  initialError: string;
  options: BrowseOptions;
}) {
  const [draft, setDraft] = useState(applied);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeToViewport,
    mobileViewport,
    () => false,
  );
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
        const response = await fetch(`/api/browse?${apiParams}`, {
          signal: controller.signal,
        });
        const body: BrowsePage & { error?: { message: string } } =
          await response.json();
        if (!response.ok)
          throw new Error(body.error?.message || "Could not load results.");
        if (!controller.signal.aborted) {
          setResult(body);
          setError("");
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load results.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [apiParams, initialError, retry]);

  function apply(query = draft) {
    try {
      const normalized = parseBrowseQuery(
        browseQueryParams({ ...query, page: 1, snapshot: undefined }),
        query.timeZone,
      );
      setError("");
      setDraft(normalized);
      setFiltersOpen(false);
      setLoading(true);
      const sameQuery =
        browseQueryParams(normalized).toString() ===
        browseQueryParams(applied).toString();
      if (
        browseQueryParams(normalized).toString() !==
          window.location.search.slice(1) ||
        initialError
      )
        navigate(normalized);
      if (sameQuery && !initialError) setRetry((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid filters.");
    }
  }

  function reset() {
    apply(defaultBrowseQuery(draft.mode, applied.timeZone));
  }
  function clear() {
    apply({
      ...defaultBrowseQuery(applied.mode, applied.timeZone),
      premiere: applied.premiere,
      range: "all",
    });
  }
  function updateDraft(patch: Partial<BrowseQuery>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function changeMode(mode: BrowseMode) {
    setDraft((current) => ({
      ...defaultBrowseQuery(mode, applied.timeZone),
      premiere: mode === "movie" ? "new" : current.premiere,
      range: current.range,
      from: current.from,
      to: current.to,
      countries: current.countries,
      languages: current.languages,
      genres: current.genres,
      query: current.query,
      minRating: current.minRating,
      sort:
        current.sort === "next_episode" && mode === "movie"
          ? "newest"
          : current.sort,
    }));
  }

  const pending =
    browseQueryParams({ ...draft, page: 1, snapshot: undefined }).toString() !==
    browseQueryParams({ ...applied, page: 1, snapshot: undefined }).toString();
  const movie = draft.mode === "movie";
  const hideDates = !movie && draft.premiere === "airing";
  const filterCount = activeFilterCount(draft);
  const canReset =
    filterCount > 0 || activeFilterCount(applied) > 0 || !!initialError;
  const filterFields = (
    <ExploreFilterFields
      draft={draft}
      options={options}
      premieres={premieres}
      ranges={ranges}
      sorts={sortOptions(movie, draft.range === "upcoming")}
      onChange={updateDraft}
    />
  );
  const filterHint = hideDates
    ? "Started seasons with a confirmed episode today or in the future, including midseason breaks. Seasons with unknown completion status are excluded."
    : `Dates use ${applied.timeZone}. ${movie ? "Original movie release dates." : "Dates refer to the matching season’s premiere."}`;
  const chips: Array<{ label: string; remove: () => void }> = [
    ...applied.languages.map((language) => ({
      label: `Language: ${options.languages.find((option) => option.code === language)?.label || language}`,
      remove: () =>
        apply({
          ...applied,
          languages: applied.languages.filter((value) => value !== language),
        }),
    })),
    ...applied.countries.map((country) => ({
      label:
        options.countries.find((option) => option.code === country)?.label ||
        country,
      remove: () =>
        apply({
          ...applied,
          countries: applied.countries.filter((value) => value !== country),
        }),
    })),
    ...applied.genres.map((genre) => ({
      label: genre,
      remove: () =>
        apply({
          ...applied,
          genres: applied.genres.filter((value) => value !== genre),
        }),
    })),
    ...(applied.query
      ? [
          {
            label: `Search: ${applied.query}`,
            remove: () => apply({ ...applied, query: "" }),
          },
        ]
      : []),
    ...(applied.minRating !== null
      ? [
          {
            label: `TMDB ≥ ${applied.minRating}/10`,
            remove: () => apply({ ...applied, minRating: null }),
          },
        ]
      : []),
    ...(applied.range !== "all"
      ? [
          {
            label:
              applied.range === "custom"
                ? `${applied.from} – ${applied.to}`
                : ranges.find((range) => range.value === applied.range)
                    ?.label || applied.range,
            remove: () => apply({ ...applied, range: "all", from: "", to: "" }),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
        aria-label="Explore filters"
        className="space-y-3 rounded-2xl border border-border bg-surface p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Content type"
            className="flex w-full gap-1 rounded-xl border border-border bg-background p-1 md:w-fit"
          >
            {modes.map((mode) => (
              <button
                type="button"
                key={mode.value}
                aria-pressed={draft.mode === mode.value}
                onClick={() => changeMode(mode.value)}
                className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors md:flex-none md:px-5 ${draft.mode === mode.value ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {canReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={loading}
              className="hidden rounded-lg md:inline-flex"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
        <label className="relative block">
          <span className="sr-only">Search by title</span>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            className="h-11 rounded-lg pl-10 text-base md:text-sm"
            aria-label="Search by title"
            placeholder="Search by title…"
            maxLength={100}
            value={draft.query}
            onChange={(event) => updateDraft({ query: event.target.value })}
          />
        </label>
        <div className="hidden md:block">{!mobile && filterFields}</div>
        <div className="flex items-center justify-between gap-3 md:border-t md:border-border md:pt-3">
          <Button
            variant="secondary"
            size="sm"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
            className="rounded-lg px-3 md:hidden"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters{filterCount > 0 ? ` (${filterCount})` : ""}
          </Button>
          <div className="hidden min-w-0 md:block">
            <p className="text-xs leading-relaxed text-muted">
              {filterHint} Languages match the title’s original language.
              Select any matching country, language, or genre; different
              filters combine.
            </p>
            {pending && (
              <p className="mt-1 text-xs font-medium text-foreground">Changes ready to apply</p>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="rounded-lg px-3 md:px-4"
          >
            <Search size={16} aria-hidden="true" className="hidden md:block" />
            Apply filters
          </Button>
        </div>
      </form>
      <Dialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        label="Explore filters"
        className="inset-0 my-auto! max-w-lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
          className="space-y-4 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Filters</h2>
              <p className="text-xs text-muted">Refine your next watch.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close filters"
              data-autofocus
              onClick={() => setFiltersOpen(false)}
              className="rounded-lg"
            >
              <X size={20} aria-hidden="true" />
            </Button>
          </div>
          {filterFields}
          <p className="text-xs leading-relaxed text-muted">
            {filterHint} Languages match the title’s original language.
            Select any matching country, language, or genre; different filters combine.
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            {canReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={loading}
                className="rounded-lg px-2"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Clear filters
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="ml-auto rounded-lg"
            >
              Apply filters
            </Button>
          </div>
        </form>
      </Dialog>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          {modes.find((mode) => mode.value === applied.mode)?.label}
          {applied.mode !== "movie" &&
            ` · ${premieres.find((premiere) => premiere.value === applied.premiere)?.label}`}
        </h2>
        <span className="text-sm text-muted" role="status" aria-live="polite">
          {loading
            ? "Loading results…"
            : result
              ? `${result.totalResults} ${result.totalResults === 1 ? "match" : "matches"} · ${sortOptions(applied.mode === "movie", applied.range === "upcoming").find((sort) => sort.value === applied.sort)?.label}`
              : ""}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Applied filters">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.remove}
              disabled={loading}
              aria-label={`Remove filter ${chip.label}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-foreground disabled:opacity-50 md:min-h-8 md:py-1"
            >
              {chip.label}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 p-5 text-danger"
        >
          <p>{error}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => apply({ ...applied, page: 1, snapshot: undefined })}
            disabled={loading}
          >
            Refresh results
          </Button>
          <Button
            className="ml-2 mt-3"
            size="sm"
            variant="ghost"
            onClick={reset}
          >
            Reset filters
          </Button>
        </div>
      )}
      {loading && !result && (
        <div className="flex items-center gap-3 py-12 text-muted">
          <LoaderCircle className="animate-spin" size={20} />
          Loading verified titles…
        </div>
      )}
      {result && (
        <>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
            {result.coverage.configured ? (
              <>
                <strong className="text-foreground">Verified coverage:</strong>{" "}
                {result.coverage.verifiedTitles} titles checked for these filters.{" "}
                {result.coverage.limited && "A discovery limit was reached; these results and their sort order cover only the fetched selection. Narrow the dates, country, language, genre, or title search to find more specific matches. "}
                {!!result.coverage.unavailablePages && `${result.coverage.unavailablePages} discovery ${result.coverage.unavailablePages === 1 ? "page" : "pages"} could not be loaded; results may be incomplete. `}
                {result.coverage.unavailableTitles > 0 &&
                  `${result.coverage.unavailableTitles} titles could not be verified. `}
                Unknown season status is excluded from Currently Airing.
              </>
            ) : (
              "Verified browsing is unavailable until TMDB access is configured. Sample titles are not included in these results."
            )}
          </div>
          {result.results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {result.results.map((item) => (
                <BrowseCard
                  key={item.title.id}
                  result={item}
                  premiere={applied.premiere}
                  timeZone={applied.timeZone}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <h3 className="text-xl font-bold text-foreground">No matches</h3>
              <p className="mt-2 text-sm text-muted">
                Try a wider date range or remove a country, genre, or rating
                filter.
              </p>
              {chips.length > 0 && (
                <Button className="mt-5" variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
          {result.hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="lg"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  navigate(
                    {
                      ...applied,
                      page: applied.page + 1,
                      snapshot: result.snapshot,
                    },
                    true,
                  );
                }}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Loading more…
                  </>
                ) : (
                  "Load more results"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
