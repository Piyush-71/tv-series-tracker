"use client";

import { useSyncExternalStore } from "react";
import {
  createTrackerData,
  importTrackerData,
  legacyWatchlistKey,
  markRecentlyViewed,
  toggleEpisodeWatched,
  trackerStorageKey,
  type TrackerData,
  type TrackerReminder,
} from "@/lib/tracker";

const serverSnapshot = createTrackerData();
let clientSnapshot: TrackerData | null = null;
const listeners = new Set<() => void>();

function readSnapshot() {
  if (clientSnapshot) return clientSnapshot;

  const saved = window.localStorage.getItem(trackerStorageKey);
  if (saved) {
    try {
      clientSnapshot = importTrackerData(saved);
      return clientSnapshot;
    } catch {
      window.localStorage.removeItem(trackerStorageKey);
    }
  }

  const initial = createTrackerData();
  initial.preferences.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const legacy = window.localStorage.getItem(legacyWatchlistKey);
  if (legacy) {
    try {
      const ids = JSON.parse(legacy) as unknown;
      if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) initial.watchlistIds = ids;
    } catch {
      // A malformed legacy value should not prevent the new tracker from starting.
    }
  }

  clientSnapshot = initial;
  persist(initial);
  return initial;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

function handleStorage(event: StorageEvent) {
  if (event.key !== trackerStorageKey || !event.newValue) return;
  try {
    clientSnapshot = importTrackerData(event.newValue);
    emit();
  } catch {
    // Ignore invalid data written by another tab.
  }
}

function persist(data: TrackerData) {
  window.localStorage.setItem(trackerStorageKey, JSON.stringify(data));
  window.localStorage.setItem(legacyWatchlistKey, JSON.stringify(data.watchlistIds));
}

function emit() {
  listeners.forEach((listener) => listener());
}

function update(updater: (current: TrackerData) => TrackerData) {
  const next = updater(readSnapshot());
  clientSnapshot = next;
  persist(next);
  emit();
}

export function useTracker() {
  const data = useSyncExternalStore(subscribe, readSnapshot, () => serverSnapshot);

  return {
    data,
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
      update((current) => toggleEpisodeWatched(current, titleId, episodeKey));
    },
    markViewed(id: string) {
      update((current) => markRecentlyViewed(current, id));
    },
    setRating(id: string, rating: number | null) {
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
    setReleaseOverride(id: string, releaseDate: string | null) {
      update((current) => {
        const releaseOverrides = { ...current.releaseOverrides };
        if (releaseDate) releaseOverrides[id] = releaseDate;
        else delete releaseOverrides[id];
        return { ...current, releaseOverrides };
      });
    },
    setReminder(reminder: TrackerReminder | null, id: string) {
      update((current) => {
        const reminders = { ...current.reminders };
        if (reminder) reminders[id] = reminder;
        else delete reminders[id];
        return { ...current, reminders };
      });
    },
    updateReminderStatus(id: string, status: TrackerReminder["status"]) {
      update((current) => {
        const reminder = current.reminders[id];
        if (!reminder || reminder.status === status) return current;
        return { ...current, reminders: { ...current.reminders, [id]: { ...reminder, status } } };
      });
    },
    addSearch(query: string) {
      const value = query.trim();
      if (!value) return;
      update((current) => ({
        ...current,
        searchHistory: [value, ...current.searchHistory.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 10),
      }));
    },
    removeSearch(query: string) {
      update((current) => ({ ...current, searchHistory: current.searchHistory.filter((item) => item !== query) }));
    },
    setPreferences(preferences: Partial<TrackerData["preferences"]>) {
      update((current) => ({
        ...current,
        preferences: { ...current.preferences, ...preferences },
      }));
    },
    replaceData(next: TrackerData) {
      update(() => next);
    },
    reset() {
      const next = createTrackerData();
      next.preferences.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      update(() => next);
    },
  };
}
