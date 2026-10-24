// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createTrackerData } from "@/lib/tracker";
import { readAccountTracker, writeAccountTracker } from "./server";

const state = vi.hoisted(() => ({ db: null as PGlite | null }));
vi.mock("@neondatabase/serverless", () => ({
  neon: () => {
    const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce(
        (query, part, index) => query + (index ? `$${index}` : "") + part,
        "",
      );
      return {
        text,
        values,
        then: (
          resolve: (value: unknown) => void,
          reject: (error: unknown) => void,
        ) =>
          state
            .db!.query(text, values)
            .then((result) => result.rows)
            .then(resolve, reject),
      };
    };
    sql.transaction = (queries: Array<{ text: string; values: unknown[] }>) =>
      state.db!.transaction(async (tx) => {
        const results = [];
        for (const query of queries)
          results.push((await tx.query(query.text, query.values)).rows);
        return results;
      });
    return sql;
  },
}));

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://test");
  state.db = new PGlite();
  const migration = await readFile(
    new URL("../../db/migrations/002_account_tracker.sql", import.meta.url),
    "utf8",
  );
  await state.db.exec(migration);
  await state.db.exec(migration);
}, 30_000);
beforeEach(async () => {
  await state.db!.exec("TRUNCATE account_trackers");
});
afterAll(async () => {
  await state.db?.close();
  vi.unstubAllEnvs();
});

it("persists complete tracker data for another device and isolates accounts", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  data.notes = { "tv-42": "Private note" };
  data.preferences.browserNotifications = true;
  expect(await readAccountTracker("alice")).toEqual({
    data: null,
    revision: 0,
  });
  const saved = await writeAccountTracker("alice", 0, data);
  expect(saved?.revision).toBe(1);
  expect((await readAccountTracker("alice")).data?.notes).toEqual(data.notes);
  expect(
    (await readAccountTracker("alice")).data?.preferences.browserNotifications,
  ).toBe(false);
  expect(await readAccountTracker("bob")).toEqual({ data: null, revision: 0 });
});
it("rejects both duplicate initialization and stale updates without losing deletions", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  await writeAccountTracker("alice", 0, data);
  expect(await writeAccountTracker("alice", 0, createTrackerData())).toBeNull();
  const cleared = await writeAccountTracker("alice", 1, createTrackerData());
  expect(cleared?.revision).toBe(2);
  expect(await writeAccountTracker("alice", 1, data)).toBeNull();
  expect((await readAccountTracker("alice")).data?.watchlistIds).toEqual([]);
  expect(await writeAccountTracker("bob", 2, data)).toBeNull();
});
