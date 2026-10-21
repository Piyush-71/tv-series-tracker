import {
  createTrackerData,
  getTrackerStorageKey,
  importTrackerData,
  legacyWatchlistKey,
  trackerStorageKey,
  type TrackerData,
} from "@/lib/tracker";

export const emptyTrackerSnapshot = createTrackerData();

/** One store per mounted auth boundary. Retired stores reject stale async callbacks. */
export function createTrackerStore(userId: string | null | undefined) {
  const key = userId === undefined ? null : getTrackerStorageKey(userId);
  let snapshot: TrackerData | null = null;
  let active = false;
  const listeners = new Set<() => void>();
  const initial = () => {
    const data = createTrackerData();
    data.preferences.timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    return data;
  };
  const read = () => {
    if (!key || typeof window === "undefined") return emptyTrackerSnapshot;
    if (snapshot) return snapshot;
    try {
      const saved = localStorage.getItem(key);
      if (saved) snapshot = importTrackerData(saved);
      // Existing unscoped data stays in the guest profile. Never read it for an account.
      else if (userId === null) {
        const legacy = localStorage.getItem(trackerStorageKey);
        if (legacy) snapshot = importTrackerData(legacy);
        else {
          const ids: unknown = JSON.parse(
            localStorage.getItem(legacyWatchlistKey) ?? "null",
          );
          if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
            snapshot = initial();
            snapshot.watchlistIds = ids;
          }
        }
      }
    } catch {
      // Preserve malformed storage on read; do not expose it to consumers.
    }
    snapshot ??= initial();
    return snapshot;
  };
  const emit = () => listeners.forEach((listener) => listener());
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    if (event.newValue) {
      try {
        snapshot = importTrackerData(event.newValue);
      } catch {
        return;
      }
    } else snapshot = initial();
    emit();
  };
  return {
    read,
    isActive: () => active && key !== null,
    activate() {
      active = true;
    },
    deactivate() {
      active = false;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1 && key)
        window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && key)
          window.removeEventListener("storage", onStorage);
      };
    },
    update(updater: (current: TrackerData) => TrackerData) {
      if (!active || !key) return;
      const next = updater(read());
      if (next === snapshot) return;
      snapshot = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Session remains usable when browser storage is unavailable. */
      }
      emit();
    },
  };
}
