"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  BrowseOptions,
  BrowseQuery,
  BrowseSort,
  DateRange,
  PremiereFilter,
} from "@/lib/browse/types";

const controlClass =
  "h-11 w-full rounded-lg border border-[var(--control-border)] bg-background px-3 text-base text-foreground md:text-sm";
const labelClass =
  "flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted";

export function activeFilterCount(query: BrowseQuery) {
  return [
    !!query.query.trim(),
    query.countries.length > 0,
    query.languages.length > 0,
    query.genres.length > 0,
    query.minRating !== null,
    query.mode !== "movie" && query.premiere !== "new",
    query.premiere !== "airing" && query.range !== "30",
    query.sort !== "newest",
  ].filter(Boolean).length;
}

export function ExploreFilterFields({
  draft,
  options,
  premieres,
  ranges,
  sorts,
  onChange,
}: {
  draft: BrowseQuery;
  options: BrowseOptions;
  premieres: Array<{ value: PremiereFilter; label: string }>;
  ranges: Array<{ value: DateRange; label: string }>;
  sorts: Array<{ value: BrowseSort; label: string }>;
  onChange: (patch: Partial<BrowseQuery>) => void;
}) {
  const movie = draft.mode === "movie";
  const hideDates = !movie && draft.premiere === "airing";

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3",
        movie || hideDates ? "xl:grid-cols-6" : "xl:grid-cols-4 2xl:grid-cols-7",
      )}
    >
      {!movie && (
        <Select
          label="Season status"
          value={draft.premiere}
          options={premieres}
          onChange={(premiere) =>
            onChange({
              premiere,
              range:
                premiere === "airing"
                  ? "all"
                  : draft.premiere === "airing"
                    ? "30"
                    : draft.range,
            })
          }
        />
      )}
      <MultiSelect
        label="Country"
        options={options.countries.map((country) => ({
          value: country.code,
          label: country.label,
        }))}
        selected={draft.countries}
        onChange={(countries) => onChange({ countries })}
      />
      <MultiSelect
        label="Language"
        options={options.languages.map((language) => ({
          value: language.code,
          label: language.label,
        }))}
        selected={draft.languages}
        onChange={(languages) => onChange({ languages })}
      />
      <MultiSelect
        label="Genre"
        options={options.genres.map((genre) => ({
          value: genre,
          label: genre,
        }))}
        selected={draft.genres}
        onChange={(genres) => onChange({ genres })}
      />
      {!hideDates && (
        <Select
          label={movie ? "Release date" : "Premiere date"}
          accessibleLabel={movie ? "Release-date range" : "Premiere-date range"}
          value={draft.range}
          options={ranges}
          onChange={(range) => onChange({
            range,
            ...(range === "upcoming" && draft.sort === "newest" ? { sort: "oldest" } : {}),
          })}
        />
      )}
      <label className={labelClass}>
        <span>Minimum rating</span>
        <Input
          className={controlClass}
          aria-label="Minimum TMDB title rating / 10"
          type="number"
          min="0"
          max="10"
          step="0.1"
          placeholder="Any · TMDB / 10"
          value={draft.minRating ?? ""}
          onChange={(event) =>
            onChange({
              minRating:
                event.target.value === "" ? null : Number(event.target.value),
            })
          }
        />
      </label>
      <Select
        label="Sort"
        accessibleLabel="Sort results"
        value={draft.sort}
        options={sorts}
        onChange={(sort) => onChange({ sort })}
      />
      {!hideDates && draft.range === "custom" && (
        <div className="col-span-full grid grid-cols-2 gap-3 md:max-w-lg">
          <label className={labelClass}>
            <span>From</span>
            <Input
              className={controlClass}
              type="date"
              required
              value={draft.from}
              onChange={(event) => onChange({ from: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            <span>Through</span>
            <Input
              className={controlClass}
              type="date"
              required
              min={draft.from || undefined}
              value={draft.to}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function Select<T extends string>({
  label,
  accessibleLabel = label,
  value,
  options,
  onChange,
}: {
  label: string;
  accessibleLabel?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      <div className="relative">
        <select
          aria-label={accessibleLabel}
          value={value}
          onChange={(event) => {
            const option = options.find(
              (item) => item.value === event.target.value,
            );
            if (option) onChange(option.value);
          }}
          className={cn(controlClass, "appearance-none truncate pr-8")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </label>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<CSSProperties>({});
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function dismiss(event: Event) {
      const popover = panel.current;
      if (event.target instanceof Node && popover?.contains(event.target))
        return;
      if (popover?.matches(":popover-open")) popover.hidePopover();
    }
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, []);

  return (
    <div className={labelClass}>
      <span>{label}</span>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          controlClass,
          "flex items-center justify-between gap-2 text-left font-normal transition-colors hover:bg-surface-raised",
          selected.length > 0 && "border-foreground font-semibold",
        )}
      >
        <span className="truncate">
          {selected.length
            ? `${label} (${selected.length})`
            : label === "Genre"
              ? "All genres"
              : label === "Language"
                ? "All languages"
              : "All countries"}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="shrink-0 text-muted"
        />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`Choose ${label.toLowerCase()}`}
        style={position}
        className="fixed m-0 overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl [&:popover-open]:flex [&:popover-open]:flex-col"
        onBeforeToggle={(event) => {
          const opening = event.newState === "open";
          setOpen(opening);
          if (!opening) return;
          setSearch("");
          const bounds = trigger.current?.getBoundingClientRect();
          if (!bounds) return;
          const width = Math.min(320, window.innerWidth - 32);
          const below = window.innerHeight - bounds.bottom - 20;
          const above = bounds.top - 20;
          const placeBelow = below >= 320 || below >= above;
          setPosition({
            width,
            left: Math.max(
              16,
              Math.min(bounds.left, window.innerWidth - width - 16),
            ),
            top: placeBelow ? bounds.bottom + 8 : undefined,
            bottom: placeBelow
              ? undefined
              : window.innerHeight - bounds.top + 8,
            maxHeight: Math.min(352, placeBelow ? below : above),
          });
        }}
        onToggle={(event) => {
          if (event.newState === "open")
            panel.current
              ?.querySelector("input")
              ?.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            panel.current?.hidePopover();
            trigger.current?.focus({ preventScroll: true });
          }
          if (event.key === "Enter" && event.target instanceof HTMLInputElement)
            event.preventDefault();
        }}
      >
        {open && (
          <>
            <div className="flex shrink-0 items-center justify-between px-3 pt-2">
              <span className="text-sm font-semibold">
                {label}
                {selected.length > 0 ? ` (${selected.length})` : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg px-2"
                  aria-label={`Clear ${label.toLowerCase()} filter`}
                  disabled={selected.length === 0}
                  onClick={() => {
                    onChange([]);
                    setSearch("");
                    panel.current
                      ?.querySelector("input")
                      ?.focus({ preventScroll: true });
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-lg md:h-9 md:w-9"
                  aria-label={`Close ${label.toLowerCase()}`}
                  popoverTarget={id}
                  popoverTargetAction="hide"
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="relative mx-3 mb-2 mt-1 shrink-0">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                className={cn(controlClass, "pl-9")}
                aria-label={`Find ${label.toLowerCase()}`}
                placeholder={`Find ${label.toLowerCase()}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div
              role="group"
              aria-label={label}
              className="min-h-0 overflow-y-auto overscroll-contain border-t border-border p-2"
            >
              {filtered.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-normal hover:bg-surface-raised"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, option.value]
                          : selected.filter((value) => value !== option.value),
                      )
                    }
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  {option.label}
                </label>
              ))}
              {!filtered.length && (
                <p className="px-2 py-4 text-sm font-normal text-muted">
                  No options match.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
