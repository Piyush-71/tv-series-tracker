import {
  createTrackerData,
  importTrackerData,
  type TrackerData,
} from "@/lib/tracker";

export type AccountSnapshot = { data: TrackerData | null; revision: number };

/** Browser notification consent belongs to a device, never to an account. */
export function accountData(data: TrackerData): TrackerData {
  const keys = Object.keys(createTrackerData()) as Array<keyof TrackerData>;
  const clean = Object.fromEntries(
    keys.map((key) => [key, data[key]]),
  ) as TrackerData;
  return {
    ...clean,
    preferences: {
      theme: data.preferences.theme,
      timeZone: data.preferences.timeZone,
      favoriteGenres: data.preferences.favoriteGenres,
      services: data.preferences.services,
      browserNotifications: false,
    },
  };
}

export function parseAccountSnapshot(value: unknown): AccountSnapshot {
  if (
    !value ||
    typeof value !== "object" ||
    !("revision" in value) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !("data" in value)
  )
    throw new Error("Invalid account snapshot");
  const revision = Number(value.revision);
  if ((value.data === null) !== (revision === 0))
    throw new Error("Invalid account revision");
  return {
    revision,
    data:
      value.data === null
        ? null
        : accountData(importTrackerData(JSON.stringify(value.data))),
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

/** PostgreSQL JSONB may return object keys in a different order. */
export function equalTrackerValues(a: unknown, b: unknown) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
function mergeSet(base: string[], local: string[], remote: string[]) {
  const before = new Set(base),
    after = new Set(local);
  return [
    ...new Set([
      ...remote.filter((id) => !before.has(id) || after.has(id)),
      ...local.filter((id) => !before.has(id)),
    ]),
  ];
}
function mergeRecord<T>(
  base: Record<string, T>,
  local: Record<string, T>,
  remote: Record<string, T>,
) {
  return Object.fromEntries(
    [
      ...new Set([
        ...Object.keys(base),
        ...Object.keys(local),
        ...Object.keys(remote),
      ]),
    ].flatMap((key) => {
      const has = (record: Record<string, T>) => Object.hasOwn(record, key);
      const changed =
        has(base) !== has(local) || !equalTrackerValues(base[key], local[key]);
      const source = changed ? local : remote;
      return has(source) ? [[key, source[key]]] : [];
    }),
  );
}

/** Replay only this device's changes on the newest account snapshot. */
export function mergeTrackerChanges(
  base: TrackerData,
  local: TrackerData,
  remote: TrackerData,
): TrackerData {
  const episodeProgress = Object.fromEntries(
    [
      ...new Set([
        ...Object.keys(base.episodeProgress),
        ...Object.keys(local.episodeProgress),
        ...Object.keys(remote.episodeProgress),
      ]),
    ].map((id) => [
      id,
      mergeSet(
        Object.hasOwn(base.episodeProgress, id) ? base.episodeProgress[id] : [],
        Object.hasOwn(local.episodeProgress, id)
          ? local.episodeProgress[id]
          : [],
        Object.hasOwn(remote.episodeProgress, id)
          ? remote.episodeProgress[id]
          : [],
      ),
    ]),
  );
  const preferences = { ...remote.preferences };
  for (const key of Object.keys(preferences) as Array<
    keyof TrackerData["preferences"]
  >) {
    if (key === "browserNotifications") continue;
    if (!equalTrackerValues(base.preferences[key], local.preferences[key]))
      Object.assign(preferences, { [key]: local.preferences[key] });
  }
  const viewed = mergeRecord(
    Object.fromEntries(base.recentlyViewed.map((item) => [item.id, item])),
    Object.fromEntries(local.recentlyViewed.map((item) => [item.id, item])),
    Object.fromEntries(remote.recentlyViewed.map((item) => [item.id, item])),
  );
  return {
    version: 1,
    watchlistIds: mergeSet(
      base.watchlistIds,
      local.watchlistIds,
      remote.watchlistIds,
    ),
    watchedTitleIds: mergeSet(
      base.watchedTitleIds,
      local.watchedTitleIds,
      remote.watchedTitleIds,
    ),
    episodeProgress,
    ratings: mergeRecord(base.ratings, local.ratings, remote.ratings),
    notes: mergeRecord(base.notes, local.notes, remote.notes),
    releaseOverrides: mergeRecord(
      base.releaseOverrides,
      local.releaseOverrides,
      remote.releaseOverrides,
    ),
    reminders: mergeRecord(base.reminders, local.reminders, remote.reminders),
    recentlyViewed: Object.values(viewed)
      .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt))
      .slice(0, 20),
    searchHistory: [
      ...local.searchHistory.filter(
        (item) => !base.searchHistory.includes(item),
      ),
      ...mergeSet(
        base.searchHistory,
        local.searchHistory,
        remote.searchHistory,
      ).filter(
        (item) =>
          base.searchHistory.includes(item) ||
          !local.searchHistory.includes(item),
      ),
    ].slice(0, 10),
    preferences: {
      ...preferences,
      browserNotifications: local.preferences.browserNotifications,
    },
  };
}

/** One-time migration adds local records; existing account values win conflicts. */
export function migrateLocalTracker(
  local: TrackerData,
  remote: TrackerData,
): TrackerData {
  const merged = mergeTrackerChanges(createTrackerData(), remote, local);
  return {
    ...merged,
    preferences: {
      ...remote.preferences,
      browserNotifications: local.preferences.browserNotifications,
    },
  };
}
