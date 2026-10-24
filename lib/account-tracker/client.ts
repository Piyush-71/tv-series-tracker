import {
  accountData,
  equalTrackerValues,
  migrateLocalTracker,
  mergeTrackerChanges,
  parseAccountSnapshot,
  type AccountSnapshot,
} from "./model";
import { createTrackerData } from "@/lib/tracker";
import type { createTrackerStore } from "@/lib/tracker-store";

export function connectAccountTracker(
  store: ReturnType<typeof createTrackerStore>,
) {
  const userId = store.userId;
  if (!userId) return () => {};
  let base: AccountSnapshot = store.readCloudBase() ?? {
    data: null,
    revision: 0,
  };
  let migrating = store.readCloudBase() === null;
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const current = () => !stopped && store.isActive();
  const apply = (
    data: ReturnType<typeof store.read>,
    remote: AccountSnapshot,
  ) => {
    store.applyCloud(data, remote);
    base = remote;
    migrating = false;
  };
  async function request(method: "GET" | "PUT", data?: unknown) {
    const response = await fetch("/api/tracker", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      ...(method === "PUT"
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data),
          }
        : {}),
    });
    if (response.status === 409) return null;
    if (!response.ok)
      throw new Error(
        response.status === 413
          ? "Tracker exceeds the sync size limit. Export a backup from Profile."
          : "Account sync is unavailable. Your changes are saved on this device and will retry when connected.",
      );
    const body = await response.json();
    if (body.userId !== userId)
      throw new Error("The account has changed. Reload to reconnect sync.");
    return parseAccountSnapshot(body);
  }
  async function sync() {
    if (!current()) return;
    if (running) return;
    running = true;
    clearTimeout(timer);
    store.setSync({ status: "syncing", message: "Syncing your account…" });
    let success = false;
    try {
      // Always read before writing, including after offline edits and retries.
      let remote = await request("GET");
      if (!current() || !remote) return;
      // Another tab may have acknowledged a newer base while GET was in flight.
      base = store.readCloudBase() ?? base;
      migrating = store.readCloudBase() === null;
      if (remote.revision < base.revision)
        throw new Error(
          "Your account changed in another tab. Retry sync shortly.",
        );
      const local = store.read();
      const merged = migrating
        ? remote.data
          ? migrateLocalTracker(local, remote.data)
          : local
        : mergeTrackerChanges(
            base.data ?? createTrackerData(),
            local,
            remote.data ?? createTrackerData(),
          );
      apply(merged, remote);
      for (let attempt = 0; attempt < 5 && current(); attempt++) {
        const sent = store.read();
        const data = accountData(sent);
        if (remote.data && equalTrackerValues(data, remote.data)) {
          success = true;
          break;
        }
        const saved = await request("PUT", {
          userId,
          revision: remote.revision,
          data,
        });
        if (!current()) return;
        if (!saved) {
          const latest = await request("GET");
          if (!current() || !latest) return;
          const rebased = mergeTrackerChanges(
            remote.data ?? createTrackerData(),
            store.read(),
            latest.data ?? createTrackerData(),
          );
          apply(rebased, latest);
          remote = latest;
          continue;
        }
        // Edits made while PUT was in flight remain pending for the next pass.
        const rebased = mergeTrackerChanges(sent, store.read(), saved.data!);
        apply(rebased, saved);
        remote = saved;
        if (equalTrackerValues(accountData(rebased), saved.data)) {
          success = true;
          break;
        }
      }
      if (current()) {
        if (!success)
          throw new Error(
            "Your account is changing on another device. Retry sync shortly; local changes are saved.",
          );
        store.setSync({ status: "synced", message: "Saved to your account" });
      }
    } catch (error) {
      if (current())
        store.setSync({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Account sync failed. Your changes remain on this device.",
        });
    } finally {
      running = false;
    }
  }
  function schedule() {
    if (!current()) return;
    if (running) return;
    clearTimeout(timer);
    store.setSync({ status: "syncing", message: "Saving your changes…" });
    timer = setTimeout(() => void sync(), 350);
  }
  const retry = () => {
    void sync();
  };
  const focus = () => {
    if (document.visibilityState === "visible") retry();
  };
  const unsubscribe = store.subscribeChanges(schedule);
  store.setSyncRetry(retry);
  window.addEventListener("online", retry);
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", focus);
  // Refresh active sessions so another device's edits arrive without a reload.
  const interval = setInterval(focus, 60_000);
  void sync();
  return () => {
    stopped = true;
    controller.abort();
    clearTimeout(timer);
    clearInterval(interval);
    unsubscribe();
    store.setSyncRetry(() => {});
    window.removeEventListener("online", retry);
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", focus);
  };
}
