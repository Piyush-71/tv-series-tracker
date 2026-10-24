"use client";

import { useUser } from "@clerk/nextjs";
import {
  Bell,
  Check,
  Download,
  FileUp,
  History,
  ListVideo,
  RotateCcw,
  Star,
} from "lucide-react";
import { useRef, useState } from "react";
import { CollectionGrid } from "@/components/media/collection-grid";
import { useCollection } from "@/hooks/use-collection";
import type { CollectionEntry } from "@/types/collection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimezoneSelect } from "@/components/tracker/timezone-select";
import { WebPushSettings } from "@/components/tracker/web-push-settings";
import { useTracker } from "@/hooks/use-tracker";
import { importTrackerData } from "@/lib/tracker";

export function ProfileClient({
  genres,
  services,
}: {
  genres: string[];
  services: string[];
}) {
  const { user } = useUser();
  const tracker = useTracker();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const recentIds = tracker.data.recentlyViewed.map((entry) => entry.id);
  const watchedIds = tracker.data.watchedTitleIds;
  const ratedIds = Object.keys(tracker.data.ratings);
  const collection = useCollection([...recentIds, ...watchedIds, ...ratedIds]);
  const entryMap = new Map(
    collection.entries.map((entry) => [entry.id, entry]),
  );
  const entriesFor = (ids: string[]) =>
    ids.flatMap((id) => (entryMap.get(id) ? [entryMap.get(id)!] : []));
  const recent = entriesFor(recentIds);
  const watched = entriesFor(watchedIds);
  const rated = entriesFor(ratedIds);
  const reminders = Object.values(tracker.data.reminders);

  function togglePreference(key: "favoriteGenres" | "services", value: string) {
    const current = tracker.data.preferences[key];
    tracker.setPreferences({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  }

  function downloadData() {
    const blob = new Blob([JSON.stringify(tracker.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cinecount-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      tracker.replaceData(importTrackerData(await file.text()));
      setMessage("Tracker data imported successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    }
  }

  return (
    <section className="page-shell page-section">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground">
        Personal tracker
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-foreground sm:text-6xl">
        {user?.firstName ? `${user.firstName}'s Cinecount` : "Your Cinecount"}
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        Your signed-in tracker syncs across devices. This browser keeps a local
        copy so you can keep using it offline.
      </p>

      <p className="mt-3 text-sm text-muted" role="status">
        {tracker.sync?.message}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={ListVideo}
          label="Watchlist"
          value={tracker.data.watchlistIds.length}
        />
        <Stat
          icon={Check}
          label="Watched"
          value={tracker.data.watchedTitleIds.length}
        />
        <Stat
          icon={History}
          label="Recently viewed"
          value={tracker.data.recentlyViewed.length}
        />
        <Stat
          icon={Bell}
          label="Reminders"
          value={reminders.filter((item) => item.status === "scheduled").length}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xl font-semibold text-foreground">Preferences</h2>
          <label
            className="mt-5 block text-sm font-semibold text-foreground"
            htmlFor="timezone"
          >
            Timezone
          </label>
          <TimezoneSelect
            id="timezone"
            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
          <label
            className="mt-5 block text-sm font-semibold text-foreground"
            htmlFor="profile-theme"
          >
            Theme
          </label>
          <select
            id="profile-theme"
            value={tracker.data.preferences.theme}
            onChange={(event) =>
              tracker.setPreferences({
                theme: event.target.value as "dark" | "light" | "system",
              })
            }
            className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <p className="mt-5 text-sm font-semibold text-foreground">
            Favorite genres
          </p>
          <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {genres.map((genre) => (
              <button
                key={genre}
                className="min-h-11"
                aria-pressed={tracker.data.preferences.favoriteGenres.includes(
                  genre,
                )}
                onClick={() => togglePreference("favoriteGenres", genre)}
              >
                <Badge
                  className={
                    tracker.data.preferences.favoriteGenres.includes(genre)
                      ? "border-foreground bg-foreground text-background"
                      : ""
                  }
                >
                  {genre}
                </Badge>
              </button>
            ))}
          </div>
          <p className="mt-5 text-sm font-semibold text-foreground">
            Streaming services
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(services.length
              ? services
              : ["Netflix", "Prime Video", "Disney Plus", "Max"]
            ).map((service) => (
              <button
                key={service}
                className="min-h-11"
                aria-pressed={tracker.data.preferences.services.includes(
                  service,
                )}
                onClick={() => togglePreference("services", service)}
              >
                <Badge
                  className={
                    tracker.data.preferences.services.includes(service)
                      ? "border-foreground bg-foreground text-background"
                      : ""
                  }
                >
                  {service}
                </Badge>
              </button>
            ))}
          </div>
        </section>

        <section
          id="reminders"
          className="scroll-mt-24 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="text-xl font-semibold text-foreground">
            Notifications & reminders
          </h2>
          <p className="mt-2 text-sm text-muted">
            Reminders are sent one day before the saved release. Date-only
            reminders follow this device’s calendar; exact airtime is not
            assumed.
          </p>
          <WebPushSettings />
          <div className="mt-4 grid gap-2">
            {reminders.length ? (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {reminder.title}
                    </p>
                    <p className="text-muted">
                      {reminder.status} · 1 day before
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => tracker.setReminder(null, reminder.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                No reminders yet. Use “Notify Me” on a title.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xl font-semibold text-foreground">
          Import, export, and privacy
        </h2>
        <p className="mt-2 text-sm text-muted">
          The export includes watchlist IDs, viewing progress, ratings, notes,
          reminders, history, and preferences.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={downloadData}>
            <Download size={17} />
            Export JSON
          </Button>
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            <FileUp size={17} />
            Import JSON
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  "Clear your Cinecount tracker, including the synced account copy? This cannot be undone.",
                )
              )
                tracker.reset();
            }}
          >
            <RotateCcw size={17} />
            Reset tracker data
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
        </div>
        {message ? (
          <p className="mt-3 text-sm text-foreground" role="status">
            {message}
          </p>
        ) : null}
      </section>

      {recent.length ? (
        <Collection
          title="Recently viewed"
          entries={recent}
          loading={collection.loading}
          onRetry={collection.refresh}
        />
      ) : null}
      {watched.length ? (
        <Collection
          title="Watched history"
          entries={watched}
          loading={collection.loading}
          onRetry={collection.refresh}
        />
      ) : null}
      {rated.length ? (
        <Collection
          title="Your rated titles"
          entries={rated}
          loading={collection.loading}
          onRetry={collection.refresh}
          icon={<Star size={20} className="text-foreground" />}
        />
      ) : null}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListVideo;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <Icon className="text-foreground" size={20} />
      <p className="mt-4 text-3xl font-semibold text-foreground">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function Collection({
  title,
  entries,
  loading,
  onRetry,
  icon,
}: {
  title: string;
  entries: CollectionEntry[];
  loading: boolean;
  onRetry: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      </div>
      <CollectionGrid entries={entries} loading={loading} onRetry={onRetry} />
    </section>
  );
}
