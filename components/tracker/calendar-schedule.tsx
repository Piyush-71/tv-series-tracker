"use client";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Clock3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  calendarDay,
  compareCalendarDates,
  calendarLabel,
  monthDays,
  shiftMonth,
} from "@/lib/calendar";
import type { MediaEpisode } from "@/types/media";

export type CalendarEntry = {
  href?: string;
  title: { id: string; slug: string; title: string; poster: string };
  episode: MediaEpisode;
};

export function CalendarSchedule({
  entries,
  timeZone,
  today,
}: {
  entries: CalendarEntry[];
  timeZone: string;
  today: string;
}) {
  const [view, setView] = useState("month");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const groups = new Map<string, CalendarEntry[]>();
  for (const entry of [...entries].sort((a, b) =>
    compareCalendarDates(a.episode.airDate, b.episode.airDate, timeZone),
  )) {
    const key = calendarDay(entry.episode.airDate, timeZone) ?? "unknown";
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const days = [...groups.keys()].filter((day) => day !== "unknown").sort();
  const nextDay = days.find((day) => day >= today);
  const monthCount = days
    .filter((day) => day.startsWith(month))
    .reduce((count, day) => count + groups.get(day)!.length, 0);
  function selectDay(day: string) {
    setSelected(day);
    setMonth(day.slice(0, 7));
  }
  function moveMonth(offset: number) {
    const next = shiftMonth(month, offset);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <strong className="text-foreground">{entries.length}</strong>{" "}
          announced {entries.length === 1 ? "episode" : "episodes"}
          <span className="mx-3 text-border">/</span>Next announced episode per
          show
        </p>
        <div
          className="inline-flex rounded-full border border-border bg-surface p-1"
          role="group"
          aria-label="Calendar view"
        >
          <Button
            size="sm"
            variant={view === "month" ? "primary" : "ghost"}
            aria-pressed={view === "month"}
            onClick={() => setView("month")}
          >
            <CalendarDays size={16} aria-hidden="true" />
            Month
          </Button>
          <Button
            size="sm"
            variant={view === "agenda" ? "primary" : "ghost"}
            aria-pressed={view === "agenda"}
            onClick={() => setView("agenda")}
          >
            <List size={16} aria-hidden="true" />
            Agenda
          </Button>
        </div>
      </div>
      {view === "month" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className="min-w-0 rounded-2xl border border-border bg-surface"
            aria-label="Monthly episode calendar"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
              <div>
                <h2 className="text-xl font-semibold" aria-live="polite">
                  {calendarLabel(`${month}-01`, {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {monthCount} {monthCount === 1 ? "episode" : "episodes"} this
                  month
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => moveMonth(-1)}
                >
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => selectDay(today)}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => moveMonth(1)}
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
            <div
              className="grid grid-cols-7 border-b border-border"
              aria-hidden="true"
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-medium text-muted"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-month-grid grid grid-cols-7 gap-px overflow-hidden rounded-b-2xl bg-border">
              {monthDays(month).map((day) => {
                const episodes = groups.get(day) ?? [];
                const active = day === selected;
                return (
                  <button
                    type="button"
                    key={day}
                    aria-label={`${calendarLabel(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}`}
                    aria-pressed={active}
                    aria-current={day === today ? "date" : undefined}
                    onClick={() => selectDay(day)}
                    className={`calendar-day relative flex min-h-[76px] min-w-0 flex-col items-center gap-1 p-1.5 text-left transition-colors sm:min-h-32 sm:items-stretch sm:p-2.5 ${active ? "bg-accent/15 ring-2 ring-inset ring-accent" : "bg-surface hover:bg-surface-raised"} ${day.startsWith(month) ? "text-foreground" : "text-muted"}`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center self-center rounded-full text-sm font-medium sm:self-start ${day === today ? "bg-accent text-on-accent" : ""}`}
                    >
                      {Number(day.slice(-2))}
                    </span>
                    <span className="hidden w-full space-y-1 sm:block">
                      {episodes.slice(0, 2).map((entry) => (
                        <span
                          key={`${entry.title.id}-${entry.episode.id}`}
                          className="block truncate rounded bg-accent/10 px-1.5 py-1 text-[11px] font-medium text-accent"
                        >
                          {entry.title.title}
                        </span>
                      ))}
                      {episodes.length > 2 ? (
                        <span className="block text-[11px] text-muted">
                          +{episodes.length - 2} more
                        </span>
                      ) : null}
                    </span>
                    {episodes.length ? (
                      <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-semibold text-accent sm:hidden">
                        {episodes.length}
                        <span className="sr-only"> episodes</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
          <aside
            className="min-w-0 rounded-2xl border border-border bg-surface p-5"
            aria-label="Selected day episodes"
          >
            <p className="eyebrow">
              {selected === today ? "Today’s lineup" : "Your daily lineup"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {calendarLabel(selected, { month: "short", day: "numeric" })}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {calendarLabel(selected, { weekday: "long" })}
            </p>
            <div className="mt-5 space-y-3">
              {groups.get(selected)?.length ? (
                groups
                  .get(selected)!
                  .map((entry) => (
                    <EpisodeRow
                      key={`${entry.title.id}-${entry.episode.id}`}
                      entry={entry}
                      timeZone={timeZone}
                    />
                  ))
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                  <CalendarDays
                    className="mx-auto mb-3 text-muted"
                    size={26}
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-semibold">
                    A little breathing room
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    No episodes are scheduled for this day.
                  </p>
                </div>
              )}
            </div>
            {nextDay && nextDay !== selected ? (
              <Button
                variant="secondary"
                className="mt-5 w-full"
                onClick={() => selectDay(nextDay)}
              >
                Jump to next episode{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Button>
            ) : null}
            <p className="mt-5 text-xs leading-5 text-muted">
              Select a day to see its lineup. Dates reflect the latest schedule
              available; more episodes may be announced later.
            </p>
          </aside>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <section
              key={day}
              className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]"
            >
              <div className="border-l-2 border-accent pl-4">
                <h2 className="font-semibold">
                  {calendarLabel(day, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {day === today
                    ? "Today"
                    : calendarLabel(day, { weekday: "long" })}
                </p>
              </div>
              <div className="space-y-3">
                {groups.get(day)!.map((entry) => (
                  <EpisodeRow
                    key={`${entry.title.id}-${entry.episode.id}`}
                    entry={entry}
                    timeZone={timeZone}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {groups.has("unknown") ? (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Date to be announced</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {groups.get("unknown")!.map((entry) => (
              <EpisodeRow
                key={`${entry.title.id}-${entry.episode.id}`}
                entry={entry}
                timeZone={timeZone}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EpisodeRow({
  entry,
  timeZone,
}: {
  entry: CalendarEntry;
  timeZone: string;
}) {
  const date = entry.episode.airDate;
  const day = calendarDay(date, timeZone);
  const time =
    day && date?.includes("T")
      ? new Intl.DateTimeFormat("en-US", {
          timeZone,
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(date))
      : day
        ? "Time TBA"
        : "Date TBA";
  return (
    <Link
      href={entry.href ?? `/title/${entry.title.slug}`}
      className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent hover:bg-surface-raised"
    >
      {entry.title.poster ? (
        <Image
          src={entry.title.poster}
          alt=""
          width={48}
          height={72}
          className="h-[72px] w-12 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-accent">
          Season {entry.episode.seasonNumber} · Episode{" "}
          {entry.episode.episodeNumber}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-5">
          {entry.title.title}
          <span className="sr-only">: {entry.episode.name}</span>
        </h3>
        <p className="mt-1 truncate text-xs text-muted">{entry.episode.name}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Clock3 size={12} aria-hidden="true" />
          {time}
        </p>
      </div>
    </Link>
  );
}
