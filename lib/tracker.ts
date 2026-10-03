export const trackerStorageKey = "cinecount-tracker-v1";
export const legacyWatchlistKey = "cinecount-watchlist";

export type ThemePreference = "dark" | "light" | "system";

export type TrackerReminder = {
  id: string;
  title: string;
  releaseDate: string;
  leadMinutes: number;
  createdAt: string;
  status: "scheduled" | "delivered" | "missed";
};

export type TrackerData = {
  version: 1;
  watchlistIds: string[];
  watchedTitleIds: string[];
  episodeProgress: Record<string, string[]>;
  recentlyViewed: Array<{ id: string; viewedAt: string }>;
  ratings: Record<string, number>;
  notes: Record<string, string>;
  releaseOverrides: Record<string, string>;
  reminders: Record<string, TrackerReminder>;
  searchHistory: string[];
  preferences: {
    theme: ThemePreference;
    favoriteGenres: string[];
    services: string[];
    timeZone: string;
    browserNotifications: boolean;
  };
};

export function createTrackerData(): TrackerData {
  return {
    version: 1,
    watchlistIds: [],
    watchedTitleIds: [],
    episodeProgress: {},
    recentlyViewed: [],
    ratings: {},
    notes: {},
    releaseOverrides: {},
    reminders: {},
    searchHistory: [],
    preferences: {
      theme: "system",
      favoriteGenres: [],
      services: [],
      timeZone: "UTC",
      browserNotifications: false,
    },
  };
}

export function toggleEpisodeWatched(data: TrackerData, titleId: string, episodeKey: string): TrackerData {
  const watched = data.episodeProgress[titleId] ?? [];
  const next = watched.includes(episodeKey)
    ? watched.filter((key) => key !== episodeKey)
    : [...watched, episodeKey];

  return {
    ...data,
    episodeProgress: { ...data.episodeProgress, [titleId]: next },
  };
}

export function getTitleProgress(data: TrackerData, titleId: string, total: number) {
  const watched = data.episodeProgress[titleId]?.length ?? 0;
  return {
    watched,
    total,
    percent: total > 0 ? Math.round((watched / total) * 100) : 0,
  };
}

export function markRecentlyViewed(data: TrackerData, id: string, viewedAt = new Date().toISOString()): TrackerData {
  return {
    ...data,
    recentlyViewed: [{ id, viewedAt }, ...data.recentlyViewed.filter((item) => item.id !== id)].slice(0, 20),
  };
}

export function importTrackerData(value: string): TrackerData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid Cinecount tracker file");
  }

  if (!isTrackerData(parsed)) {
    throw new Error("Invalid Cinecount tracker file");
  }

  return parsed;
}

export function isTrackerData(value: unknown): value is TrackerData {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!isStringArray(value.watchlistIds) || !isStringArray(value.watchedTitleIds)) return false;
  if (!isStringArray(value.searchHistory) || !isViewedArray(value.recentlyViewed)) return false;
  if (!isStringArrayRecord(value.episodeProgress) || !isNumberRecord(value.ratings)) return false;
  if (!isStringRecord(value.notes) || !isStringRecord(value.releaseOverrides) || !isReminderRecord(value.reminders)) return false;

  const preferences = value.preferences;
  return (
    isRecord(preferences) &&
    (preferences.theme === "dark" || preferences.theme === "light" || preferences.theme === "system") &&
    isStringArray(preferences.favoriteGenres) &&
    isStringArray(preferences.services) &&
    typeof preferences.timeZone === "string" &&
    typeof preferences.browserNotifications === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isViewedArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.viewedAt === "string");
}

function isStringArrayRecord(value: unknown) {
  return isRecord(value) && Object.values(value).every(isStringArray);
}

function isNumberRecord(value: unknown) {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));
}

function isStringRecord(value: unknown) {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isReminderRecord(value: unknown) {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.releaseDate === "string" &&
        typeof item.leadMinutes === "number" &&
        typeof item.createdAt === "string" &&
        (item.status === "scheduled" || item.status === "delivered" || item.status === "missed"),
    )
  );
}
