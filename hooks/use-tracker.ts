"use client";

import { normalizeTimeZone } from "@/lib/timezone";
import { useContext, useSyncExternalStore } from "react";
import { TrackerStoreContext } from "@/components/tracker/tracker-provider";
import { emptyTrackerSnapshot } from "@/lib/tracker-store";
import { getReminderTarget, reconcileReleaseOverride } from "@/lib/tracker-reminders";
import type { MediaTitle } from "@/types/media";
import {
  createTrackerData,
  importTrackerData,
  isEpisodeKey,
  markRecentlyViewed,
  toggleEpisodeWatched,
  type TrackerData,
  type TrackerReminder,
} from "@/lib/tracker";

export function useTracker() {
  const store = useContext(TrackerStoreContext);
  if (!store) throw new Error("useTracker must be used within TrackerProvider");
  const data = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => emptyTrackerSnapshot,
  );
  const update = store.update;

  return {
    data,
    isReady: store.isReady,
    isCurrentScope: store.isActive,
    toggleWatchlist(id: string) {
      update((current) => ({
        ...current,
        watchlistIds: current.watchlistIds.includes(id)
          ? current.watchlistIds.filter((item) => item !== id)
          : [...current.watchlistIds, id],
      }));
    },
    toggleTitleWatched(id: string) {
      update((current) => ({
        ...current,
        watchedTitleIds: current.watchedTitleIds.includes(id)
          ? current.watchedTitleIds.filter((item) => item !== id)
          : [...current.watchedTitleIds, id],
      }));
    },
    toggleEpisode(titleId: string, episodeKey: string) {
      if (!isEpisodeKey(episodeKey)) return;
      update((current) => toggleEpisodeWatched(current, titleId, episodeKey));
    },
    markViewed(id: string) {
      update((current) => markRecentlyViewed(current, id));
    },
    setRating(id: string, rating: number | null) {
      if (rating !== null && !Number.isFinite(rating)) return;
      update((current) => {
        const ratings = { ...current.ratings };
        if (rating === null) delete ratings[id];
        else ratings[id] = Math.max(1, Math.min(5, rating));
        return { ...current, ratings };
      });
    },
    setNote(id: string, note: string) {
      update((current) => {
        const notes = { ...current.notes };
        if (note.trim()) notes[id] = note;
        else delete notes[id];
        return { ...current, notes };
      });
    },
    setReleaseOverride(
      id: string,
      releaseDate: string | null,
      officialTarget?: string | null,
    ) {
      update((current) =>
        reconcileReleaseOverride(current, id, releaseDate, officialTarget),
      );
    },
    setReminder(reminder: TrackerReminder | null, id: string) {
      update((current) => {
        const reminders = { ...current.reminders };
        if (reminder) {
          reminders[id] = reminder;
          importTrackerData(JSON.stringify({ ...current, reminders }));
        } else delete reminders[id];
        return { ...current, reminders };
      });
    },
    scheduleReminder(title: MediaTitle, browserNotifications: boolean) {
      update((current) => {
        // Permission prompts can outlive an override edit. Resolve the target
        // inside the active store update, rather than from the opening render.
        const releaseDate = getReminderTarget(title, current.releaseOverrides[title.id]);
        if (!releaseDate || current.reminders[title.id]) return current;
        return {
          ...current,
          preferences: { ...current.preferences, browserNotifications },
          reminders: {
            ...current.reminders,
            [title.id]: {
              id: title.id, title: title.title, releaseDate,
              originalReleaseDate: getReminderTarget(title),
              leadMinutes: 1440, createdAt: new Date().toISOString(), status: "scheduled",
            },
          },
        };
      });
    },
    updateReminderStatus(id: string, status: TrackerReminder["status"]) {
      update((current) => {
        const reminder = current.reminders[id];
        if (!reminder || reminder.status === status) return current;
        return {
          ...current,
          reminders: { ...current.reminders, [id]: { ...reminder, status } },
        };
      });
    },
    addSearch(query: string) {
      const value = query.trim();
      if (!value) return;
      update((current) => ({
        ...current,
        searchHistory: [
          value,
          ...current.searchHistory.filter(
            (item) => item.toLowerCase() !== value.toLowerCase(),
          ),
        ].slice(0, 10),
      }));
    },
    removeSearch(query: string) {
      update((current) => ({
        ...current,
        searchHistory: current.searchHistory.filter((item) => item !== query),
      }));
    },
    setPreferences(preferences: Partial<TrackerData["preferences"]>) {
      update((current) => ({
        ...current,
        preferences: {
          ...current.preferences,
          ...preferences,
          timeZone: normalizeTimeZone(
            preferences.timeZone ?? current.preferences.timeZone,
          ),
        },
      }));
    },
    replaceData(next: TrackerData) {
      const validated = importTrackerData(JSON.stringify(next));
      update(() => validated);
    },
    reset() {
      const next = createTrackerData();
      next.preferences.timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      update(() => next);
    },
  };
}
