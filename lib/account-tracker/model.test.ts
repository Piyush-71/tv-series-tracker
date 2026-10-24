import { describe, expect, it } from "vitest";
import { createTrackerData } from "@/lib/tracker";
import {
  accountData,
  mergeTrackerChanges,
  migrateLocalTracker,
  parseAccountSnapshot,
} from "./model";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
describe("account tracker reconciliation", () => {
  it("keeps concurrent additions and removals without restoring unchanged stale entries", () => {
    const base = createTrackerData();
    base.watchlistIds = ["tv-1", "tv-2"];
    const local = clone(base);
    local.watchlistIds = ["tv-2", "tv-3"];
    const remote = clone(base);
    remote.watchlistIds = ["tv-1", "tv-4"];
    expect(mergeTrackerChanges(base, local, remote).watchlistIds).toEqual([
      "tv-4",
      "tv-3",
    ]);
  });
  it("merges progress per episode, notes per title and preferences per field", () => {
    const base = createTrackerData();
    base.notes = { a: "before", b: "before" };
    base.episodeProgress = { a: ["s1e1"] };
    const local = clone(base);
    local.notes.a = "local edit";
    local.episodeProgress.a.push("s1e2");
    local.preferences.timeZone = "Asia/Kolkata";
    const remote = clone(base);
    remote.notes.b = "remote edit";
    remote.episodeProgress.a = ["s1e3"];
    remote.preferences.theme = "dark";
    const result = mergeTrackerChanges(base, local, remote);
    expect(result.notes).toEqual({ a: "local edit", b: "remote edit" });
    expect(result.episodeProgress.a).toEqual(["s1e3", "s1e2"]);
    expect(result.preferences).toMatchObject({
      theme: "dark",
      timeZone: "Asia/Kolkata",
    });
  });
  it("migrates account-scoped legacy data once without replacing newer cloud values", () => {
    const local = createTrackerData();
    local.watchlistIds = ["tv-1"];
    local.notes = { a: "old", b: "local only" };
    local.preferences.browserNotifications = true;
    const remote = createTrackerData();
    remote.watchlistIds = ["tv-2"];
    remote.notes = { a: "cloud" };
    const migrated = migrateLocalTracker(local, remote);
    expect(migrated.watchlistIds).toEqual(["tv-1", "tv-2"]);
    expect(migrated.notes).toEqual({ a: "cloud", b: "local only" });
    expect(migrated.preferences.browserNotifications).toBe(true);
    expect(accountData(migrated).preferences.browserNotifications).toBe(false);
  });
  it("retains explicit deletions and safely handles arbitrary record keys", () => {
    const base = createTrackerData();
    base.notes.a = "delete me";
    const local = clone(base);
    delete local.notes.a;
    const remote = clone(base);
    remote.notes.b = "remote";
    expect(mergeTrackerChanges(base, local, remote).notes).toEqual({
      b: "remote",
    });
    local.notes = JSON.parse('{"__proto__":"safe string"}');
    expect(
      Object.hasOwn(
        mergeTrackerChanges(base, local, remote).notes,
        "__proto__",
      ),
    ).toBe(true);
    local.episodeProgress = JSON.parse('{"__proto__":["s1e1"]}');
    expect(
      mergeTrackerChanges(base, local, remote).episodeProgress["__proto__"],
    ).toEqual(["s1e1"]);
    expect({}).not.toHaveProperty("polluted");
  });
  it("rejects invalid server data and mismatched revisions", () => {
    expect(() => parseAccountSnapshot({ data: null, revision: 1 })).toThrow();
    expect(() => parseAccountSnapshot({ data: {}, revision: 1 })).toThrow();
    expect(() =>
      parseAccountSnapshot({ data: createTrackerData(), revision: 0 }),
    ).toThrow();
    expect(parseAccountSnapshot({ data: null, revision: 0 })).toEqual({
      data: null,
      revision: 0,
    });
  });
});
