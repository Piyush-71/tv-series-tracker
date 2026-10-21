import { describe, expect, it } from "vitest";
import { parsePushSnapshot, pushJob } from "./model";

export const exampleSnapshot = () => ({
  deviceToken: "a".repeat(64),
  userId: "alice",
  timeZone: "Asia/Kolkata",
  subscription: {
    endpoint: "https://fcm.googleapis.com/fcm/send/example",
    keys: {
      p256dh: Buffer.alloc(65, 4).toString("base64url"),
      auth: Buffer.alloc(16, 1).toString("base64url"),
    },
  },
  reminders: [
    {
      id: "tv-42",
      title: "Example",
      releaseDate: "2099-03-04",
      createdAt: "2026-10-21T00:00:00Z",
      leadMinutes: 1440,
      status: "scheduled" as const,
    },
  ],
});

describe("push input validation", () => {
  it("accepts a browser subscription and bounds reminder data", () => {
    expect(parsePushSnapshot(exampleSnapshot()).userId).toBe("alice");
    expect(() =>
      parsePushSnapshot({
        ...exampleSnapshot(),
        reminders: Array(201).fill(exampleSnapshot().reminders[0]),
      }),
    ).toThrow(/200/);
  });
  it.each([
    "http://fcm.googleapis.com/push",
    "https://127.0.0.1/push",
    "https://example.com/push",
    "https://fcm.googleapis.com.evil.test/push",
    "https://user:password@fcm.googleapis.com/push",
    "https://fcm.googleapis.com:8443/push",
  ])("rejects unsafe push URLs: %s", (endpoint) => {
    const input = exampleSnapshot();
    input.subscription.endpoint = endpoint;
    expect(() => parsePushSnapshot(input)).toThrow(/endpoint/);
  });
  it.each([
    "https://updates.push.services.mozilla.com/wpush/v2/test",
    "https://web.push.apple.com/test",
    "https://wns2-par02p.notify.windows.com/test",
  ])("accepts vendor endpoint %s", (endpoint) => {
    const input = exampleSnapshot();
    input.subscription.endpoint = endpoint;
    expect(parsePushSnapshot(input).subscription.endpoint).toBe(endpoint);
  });
  it("rejects malformed dates, keys, timezone and repeated identities", () => {
    const input = exampleSnapshot();
    expect(() =>
      parsePushSnapshot({ ...input, timeZone: "fake/timezone" }),
    ).toThrow(/timezone/);
    expect(() =>
      parsePushSnapshot({ ...input, deviceToken: "guessable" }),
    ).toThrow(/token/);
    expect(() =>
      parsePushSnapshot({
        ...input,
        reminders: [...input.reminders, ...input.reminders],
      }),
    ).toThrow(/reminder/);
    input.reminders[0].releaseDate = "2026-02-30";
    expect(() => parsePushSnapshot(input)).toThrow(/reminder/);
    input.subscription.keys.auth = "wrong";
    expect(() => parsePushSnapshot(input)).toThrow(/keys/);
  });
});

describe("background reminder timing", () => {
  it("preserves exact airtimes and lead minutes", () => {
    const reminder = {
      ...exampleSnapshot().reminders[0],
      releaseDate: "2099-03-04T18:00:00Z",
      leadMinutes: 30,
    };
    expect(pushJob(reminder, "Asia/Kolkata")).toMatchObject({
      due_at: "2099-03-04T17:30:00.000Z",
      expires_at: "2099-03-04T18:00:00.000Z",
    });
    expect(pushJob(reminder, "UTC").fingerprint).toBe(
      pushJob(reminder, "Asia/Kolkata").fingerprint,
    );
  });
  it("uses the device calendar for date-only reminders", () => {
    expect(
      pushJob(exampleSnapshot().reminders[0], "Asia/Kolkata"),
    ).toMatchObject({
      due_at: "2099-03-02T18:30:00.000Z",
      expires_at: "2099-03-04T18:30:00.000Z",
    });
  });
  it("accounts for daylight-saving transitions when deriving calendar boundaries", () => {
    expect(
      pushJob(
        { ...exampleSnapshot().reminders[0], releaseDate: "2026-03-08" },
        "America/New_York",
      ),
    ).toMatchObject({
      due_at: "2026-03-07T05:00:00.000Z",
      expires_at: "2026-03-09T04:00:00.000Z",
    });
  });
  it("changes identity after rescheduling or explicitly creating a new reminder", () => {
    const reminder = exampleSnapshot().reminders[0];
    const first = pushJob(reminder, "UTC").fingerprint;
    expect(
      pushJob({ ...reminder, createdAt: "2026-10-22T00:00:00Z" }, "UTC")
        .fingerprint,
    ).not.toBe(first);
    expect(
      pushJob({ ...reminder, releaseDate: "2099-04-05" }, "UTC").fingerprint,
    ).not.toBe(first);
  });
});
