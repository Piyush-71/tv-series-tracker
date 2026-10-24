import {
  mergeTrackerChanges,
  parseAccountSnapshot,
  type AccountSnapshot,
} from "@/lib/account-tracker/model";
import {
  createTrackerData,
  getTrackerStorageKey,
  importTrackerData,
  legacyWatchlistKey,
  trackerStorageKey,
  type TrackerData,
} from "@/lib/tracker";

export const emptyTrackerSnapshot = createTrackerData();
export type TrackerSyncState = {
  status: "local" | "loading" | "syncing" | "synced" | "error";
  message: string;
};
export const localSyncState: TrackerSyncState = {
  status: "local",
  message: "Saved on this device",
};
export const loadingSyncState: TrackerSyncState = {
  status: "loading",
  message: "Connecting account sync…",
};

/** One store per mounted auth boundary. Retired stores reject stale async callbacks. */
export function createTrackerStore(userId: string | null | undefined) {
  const key = userId === undefined ? null : getTrackerStorageKey(userId);
  const cloudKey = key && userId ? `${key}:cloud-v1` : null;
  let cloudBase: AccountSnapshot | null = null;
  let snapshot: TrackerData | null = null;
  let active = false;
  const listeners = new Set<() => void>();
  const changes = new Set<() => void>();
  let syncState =
    typeof userId === "string" ? loadingSyncState : localSyncState;
  let retrySync = () => {};
  const persist = (data: TrackerData) => {
    snapshot = data;
    try {
      // Keep the acknowledged base and pending local snapshot in one atomic value.
      if (cloudKey && cloudBase)
        localStorage.setItem(
          cloudKey,
          JSON.stringify({ ...cloudBase, local: data }),
        );
      if (key) localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* Keep session usable. */
    }
  };
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
      if (cloudKey) {
        const cached = localStorage.getItem(cloudKey);
        if (cached) {
          try {
            const envelope = JSON.parse(cached);
            const remote = parseAccountSnapshot(envelope);
            snapshot = importTrackerData(JSON.stringify(envelope.local));
            cloudBase = remote;
            return snapshot;
          } catch {
            /* Fall back to the older local snapshot. */
          }
        }
      }
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
    // Evicting a browser cache is not a request to delete the account's data.
    if (
      cloudBase &&
      (event.key === null || (event.key === cloudKey && !event.newValue))
    )
      return;
    if (cloudKey && event.key === cloudKey && event.newValue) {
      try {
        const envelope = JSON.parse(event.newValue);
        const remote = parseAccountSnapshot(envelope);
        const incoming = importTrackerData(JSON.stringify(envelope.local));
        snapshot = mergeTrackerChanges(
          cloudBase?.data ?? createTrackerData(),
          read(),
          incoming,
        );
        cloudBase = remote;
      } catch {
        return;
      }
      emit();
      changes.forEach((listener) => listener());
      return;
    }
    if (cloudKey && cloudBase && event.key === key) return;
    if (event.key !== key && event.key !== null) return;
    if (event.newValue) {
      try {
        snapshot = importTrackerData(event.newValue);
      } catch {
        return;
      }
    } else snapshot = initial();
    emit();
    changes.forEach((listener) => listener());
  };
  return {
    userId,
    read,
    readSync: () => syncState,
    readCloudBase: () => {
      read();
      return cloudBase;
    },
    setSync(state: TrackerSyncState) {
      syncState = state;
      emit();
    },
    retrySync: () => retrySync(),
    setSyncRetry(retry: () => void) {
      retrySync = retry;
    },
    subscribeChanges(listener: () => void) {
      changes.add(listener);
      return () => {
        changes.delete(listener);
      };
    },
    applyCloud(data: TrackerData, remote: AccountSnapshot) {
      if (!active) return;
      cloudBase = remote;
      persist(data);
      emit();
    },
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
      persist(next);
      emit();
      changes.forEach((listener) => listener());
    },
  };
}
