// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  claimPushJobs,
  finishPushJob,
  removeExpiredPushDevice,
  removePushDevice,
  syncPushDevice,
} from "./store";
import type { PushSnapshot } from "./model";

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

function snapshot(): PushSnapshot {
  return {
    deviceToken: "a".repeat(64),
    userId: "alice",
    timeZone: "UTC",
    subscription: {
      endpoint: "https://fcm.googleapis.com/example",
      keys: { p256dh: "test", auth: "test" },
    },
    reminders: [
      {
        id: "tv-42",
        title: "Private title",
        releaseDate: new Date(Date.now() + 3600_000).toISOString(),
        leadMinutes: 120,
        createdAt: "2026-10-21T00:00:00Z",
        status: "scheduled",
      },
    ],
  };
}

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://test";
  state.db = new PGlite();
  await state.db.exec(
    await readFile(
      new URL("../../db/migrations/001_web_push.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30_000);
beforeEach(async () => {
  await state.db!.exec("TRUNCATE web_push_devices CASCADE");
});
afterAll(async () => {
  await state.db?.close();
  delete process.env.DATABASE_URL;
});

describe("durable push storage (real PostgreSQL queries)", () => {
  it("preserves delivered status across repeated browser snapshots", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    const [job] = await claimPushJobs("first-run");
    expect(job.subscription).toEqual(data.subscription);
    expect(await claimPushJobs("overlapping-run")).toEqual([]);
    await finishPushJob(job, true);
    expect(await syncPushDevice(data)).toEqual([
      expect.objectContaining({ id: "tv-42", status: "delivered" }),
    ]);
    expect(await claimPushJobs("next-run")).toEqual([]);
  });
  it("reschedules changed targets and ignores stale delivery acknowledgments", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    const [old] = await claimPushJobs("old-run");
    data.reminders[0].releaseDate = new Date(
      Date.now() + 1800_000,
    ).toISOString();
    await syncPushDevice(data);
    await finishPushJob(old, true);
    expect(await claimPushJobs("new-run")).toHaveLength(1);
  });
  it("backs off temporary failures and recovers abandoned leases", async () => {
    await syncPushDevice(snapshot());
    const [job] = await claimPushJobs("failed-run");
    await finishPushJob(job, false);
    expect(await claimPushJobs("too-soon")).toEqual([]);
    await state.db!.exec(
      "UPDATE web_push_reminders SET retry_at = now() - interval '1 second'",
    );
    const [retry] = await claimPushJobs("retry");
    expect(retry.attempts).toBe(2);
    await state.db!.exec(
      "UPDATE web_push_reminders SET lease_until = now() - interval '1 second'",
    );
    expect(await claimPushJobs("recovered")).toHaveLength(1);
  });
  it("cancels removed reminders and revokes subscriptions using only the device capability", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    await syncPushDevice({ ...data, reminders: [] });
    expect(await claimPushJobs("cancelled")).toEqual([]);
    await syncPushDevice(data);
    await removePushDevice(data.deviceToken);
    expect(
      (await state.db!.query("SELECT * FROM web_push_reminders")).rows,
    ).toEqual([]);
  });
  it("does not inherit old account delivery status when a browser changes owners", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    const [job] = await claimPushJobs("alice");
    await finishPushJob(job, true);
    await syncPushDevice({ ...data, userId: "bob" });
    expect(await claimPushJobs("bob")).toHaveLength(1);
  });

  it("replaces a recovered subscription without retaining another account's reminders", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    const next = {
      ...data,
      deviceToken: "b".repeat(64),
      userId: "bob",
      reminders: [],
    };
    await syncPushDevice(next);
    expect(
      (await state.db!.query("SELECT user_id FROM web_push_devices")).rows,
    ).toEqual([{ user_id: "bob" }]);
    expect(await claimPushJobs("recovered")).toEqual([]);
  });
  it("removes expired endpoints without deleting a replacement subscription", async () => {
    const data = snapshot();
    await syncPushDevice(data);
    const [old] = await claimPushJobs("old");
    data.subscription.endpoint += "-replacement";
    await syncPushDevice(data);
    await removeExpiredPushDevice(old);
    expect(
      (await state.db!.query("SELECT * FROM web_push_devices")).rows,
    ).toHaveLength(1);
    await removeExpiredPushDevice({ ...old, subscription: data.subscription });
    expect(
      (await state.db!.query("SELECT * FROM web_push_devices")).rows,
    ).toEqual([]);
  });
  it("marks past releases missed without sending late notifications", async () => {
    const data = snapshot();
    data.reminders[0].releaseDate = "2020-01-01T00:00:00Z";
    await syncPushDevice(data);
    expect(await claimPushJobs("late")).toEqual([]);
    expect(await syncPushDevice(data)).toEqual([
      expect.objectContaining({ status: "missed" }),
    ]);
  });
});
