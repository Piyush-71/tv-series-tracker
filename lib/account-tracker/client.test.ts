import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTrackerStore } from "@/lib/tracker-store";
import { createTrackerData, getTrackerStorageKey } from "@/lib/tracker";
import { connectAccountTracker } from "./client";
import { accountData, type AccountSnapshot } from "./model";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
let remote: AccountSnapshot;
let unavailable = false;
const stops: Array<() => void> = [];
function start(id = "alice") {
  const store = createTrackerStore(id);
  store.activate();
  const stop = connectAccountTracker(store);
  stops.push(() => {
    stop();
    store.deactivate();
  });
  return store;
}
const synced = async (store: ReturnType<typeof start>) =>
  waitFor(() => expect(store.readSync().status).toBe("synced"), {
    timeout: 3000,
  });
beforeEach(() => {
  localStorage.clear();
  remote = { data: null, revision: 0 };
  unavailable = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) => {
      if (unavailable) throw new Error("offline");
      if (options.method === "GET")
        return Response.json({ userId: "alice", ...clone(remote) });
      const input = JSON.parse(String(options.body));
      if (input.revision !== remote.revision)
        return new Response(null, { status: 409 });
      remote = { data: input.data, revision: remote.revision + 1 };
      return Response.json({ userId: input.userId, ...clone(remote) });
    }),
  );
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.unstubAllGlobals();
});
it("migrates only the signed-in account's local data and restores it in a fresh browser", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  data.notes = { "tv-42": "Personal note" };
  data.preferences.browserNotifications = true;
  localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(data));
  localStorage.setItem(
    getTrackerStorageKey(null),
    JSON.stringify({ ...data, watchlistIds: ["guest-only"] }),
  );
  const first = start();
  await synced(first);
  expect(remote.data?.watchlistIds).toEqual(["tv-42"]);
  expect(remote.data?.preferences.browserNotifications).toBe(false);
  stops.splice(0).forEach((stop) => stop());
  localStorage.clear();
  const second = start();
  await synced(second);
  expect(second.read().notes).toEqual(data.notes);
  expect(second.read().watchlistIds).toEqual(["tv-42"]);
  expect(second.read().preferences.browserNotifications).toBe(false);
});
it("retains remote-only titles during initial migration and then respects remote removals", async () => {
  const local = createTrackerData();
  local.watchlistIds = ["tv-local"];
  const cloud = createTrackerData();
  cloud.watchlistIds = ["tv-cloud"];
  localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(local));
  remote = { data: cloud, revision: 1 };
  const first = start();
  await synced(first);
  expect(first.read().watchlistIds).toEqual(["tv-local", "tv-cloud"]);
  stops.splice(0).forEach((stop) => stop());
  remote = {
    data: { ...remote.data!, watchlistIds: [] },
    revision: remote.revision + 1,
  };
  const second = start();
  await synced(second);
  expect(second.read().watchlistIds).toEqual([]);
});
it("persists offline edits across reload and retries them without restoring a removed title", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  remote = { data, revision: 1 };
  const first = start();
  await synced(first);
  unavailable = true;
  first.update((current) => ({
    ...current,
    watchlistIds: [],
    notes: { a: "Offline edit" },
  }));
  stops.splice(0).forEach((stop) => stop());
  const second = start();
  await waitFor(() => expect(second.readSync().status).toBe("error"));
  expect(second.read().notes.a).toBe("Offline edit");
  unavailable = false;
  second.retrySync();
  await synced(second);
  expect(remote.data?.watchlistIds).toEqual([]);
  expect(remote.data?.notes.a).toBe("Offline edit");
});
it("rebases concurrent writes after a revision conflict", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-1"];
  remote = { data, revision: 1 };
  const store = start();
  await synced(store);
  const original = vi.mocked(fetch).getMockImplementation()!;
  let conflict = true;
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    if (options?.method === "PUT" && conflict) {
      conflict = false;
      remote = { data: { ...data, watchlistIds: ["tv-remote"] }, revision: 2 };
      return new Response(null, { status: 409 });
    }
    return original(url, options);
  });
  store.update((current) => ({
    ...current,
    watchlistIds: [...current.watchlistIds, "tv-local"],
  }));
  await synced(store);
  expect(remote.data?.watchlistIds).toEqual(["tv-remote", "tv-local"]);
});
it("preserves edits made while a save is in flight", async () => {
  const store = start();
  await synced(store);
  const original = vi.mocked(fetch).getMockImplementation()!;
  let release!: () => void;
  let held = false;
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    const response = await original(url, options);
    if (options?.method === "PUT" && !held) {
      held = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return response;
  });
  store.update((current) => ({ ...current, notes: { a: "First edit" } }));
  await waitFor(() => expect(held).toBe(true));
  store.update((current) => ({
    ...current,
    notes: { ...current.notes, b: "Second edit" },
  }));
  release();
  await synced(store);
  expect(remote.data?.notes).toEqual({ a: "First edit", b: "Second edit" });
});
it("ignores late responses after sign-out and never uploads guest data", async () => {
  let release!: (response: Response) => void;
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const store = start();
  stops.splice(0).forEach((stop) => stop());
  const data = createTrackerData();
  data.notes = { a: "Alice private" };
  release(Response.json({ userId: "alice", data, revision: 1 }));
  await Promise.resolve();
  await Promise.resolve();
  expect(localStorage.getItem(getTrackerStorageKey("alice"))).toBeNull();
  const guest = createTrackerStore(null);
  guest.activate();
  guest.update((current) => ({ ...current, watchlistIds: ["guest"] }));
  connectAccountTracker(guest)();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.read().notes).toEqual({});
});
it("refuses a response for a different authenticated account", async () => {
  const data = createTrackerData();
  data.notes = { a: "Bob private" };
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ userId: "bob", data, revision: 1 }),
  );
  const store = start();
  await waitFor(() => expect(store.readSync().status).toBe("error"));
  expect(store.read().notes).toEqual({});
  expect(
    localStorage.getItem(`${getTrackerStorageKey("alice")}:cloud-v1`),
  ).toBeNull();
});
it("keeps the cloud base and pending local snapshot together when reloading", async () => {
  const cloud = createTrackerData();
  cloud.watchlistIds = ["cloud-only"];
  localStorage.setItem(
    `${getTrackerStorageKey("alice")}:cloud-v1`,
    JSON.stringify({
      data: accountData(cloud),
      revision: 5,
      local: { ...cloud, notes: { a: "Pending" } },
    }),
  );
  // The older compatibility mirror may lag behind the atomic envelope.
  localStorage.setItem(
    getTrackerStorageKey("alice"),
    JSON.stringify(createTrackerData()),
  );
  remote = { data: cloud, revision: 5 };
  const store = start();
  await synced(store);
  expect(remote.data?.watchlistIds).toEqual(["cloud-only"]);
  expect(remote.data?.notes.a).toBe("Pending");
});

it("does not turn browser-cache eviction into account deletion", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  remote = { data, revision: 1 };
  const store = start();
  const unsubscribe = store.subscribe(() => {});
  stops.push(unsubscribe);
  await synced(store);
  localStorage.clear();
  window.dispatchEvent(
    new StorageEvent("storage", { key: null, newValue: null }),
  );
  store.retrySync();
  await synced(store);
  expect(remote.data?.watchlistIds).toEqual(["tv-42"]);
});

it("settles after PostgreSQL reorders JSON object keys instead of repeatedly saving", async () => {
  const data = createTrackerData();
  data.notes = { z: "last", a: "first" };
  localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(data));
  const original = vi.mocked(fetch).getMockImplementation()!;
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    const response = await original(url, options);
    const body = await response.json();
    if (body.data)
      body.data.notes = Object.fromEntries(
        Object.entries(body.data.notes).sort(([a], [b]) => a.localeCompare(b)),
      );
    return Response.json(body);
  });
  const store = start();
  await synced(store);
  expect(
    vi
      .mocked(fetch)
      .mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
  expect(store.read().notes).toEqual(data.notes);
});
