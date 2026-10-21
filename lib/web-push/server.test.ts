import { beforeEach, afterEach, expect, it, vi } from "vitest";
import webpush from "web-push";
import {
  claimPushJobs,
  finishPushJob,
  removeExpiredPushDevice,
  type ClaimedPushJob,
} from "./store";
import { deliverPushReminders, validCronAuthorization } from "./server";

vi.mock("web-push", () => ({ default: { sendNotification: vi.fn() } }));
vi.mock("./store", () => ({
  claimPushJobs: vi.fn(),
  finishPushJob: vi.fn(),
  removeExpiredPushDevice: vi.fn(),
}));
const job: ClaimedPushJob = {
  device_id: "device",
  reminder_id: "tv-42",
  fingerprint: "fingerprint",
  title: "Example",
  release_date: "2099-01-01T00:00:00Z",
  expires_at: "2099-01-01T00:00:00Z",
  subscription: {
    endpoint: "https://fcm.googleapis.com/example",
    keys: { p256dh: "key", auth: "auth" },
  },
  attempts: 1,
  lease_token: "lease",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "long-random-secret");
  vi.mocked(claimPushJobs).mockResolvedValue([job]);
  vi.mocked(webpush.sendNotification).mockResolvedValue({
    statusCode: 201,
    body: "",
    headers: {},
  });
});
afterEach(() => vi.unstubAllEnvs());
it("requires an exact bearer secret and rejects missing configuration", () => {
  expect(validCronAuthorization("Bearer long-random-secret")).toBe(true);
  expect(validCronAuthorization("Bearer wrong")).toBe(false);
  expect(validCronAuthorization(null)).toBe(false);
  vi.stubEnv("CRON_SECRET", "");
  expect(validCronAuthorization("Bearer ")).toBe(false);
});
it("sends visible, expiring notifications with a stable deduplication tag", async () => {
  expect(await deliverPushReminders()).toEqual({
    accepted: 1,
    failed: 0,
    expired: 0,
  });
  const [, payload, options] = vi.mocked(webpush.sendNotification).mock
    .calls[0];
  expect(JSON.parse(payload as string)).toMatchObject({
    title: "Example is nearly here",
    tag: "cinecount-fingerprint",
    expiresAt: job.expires_at,
  });
  expect(options).toMatchObject({ timeout: 10_000, TTL: 86_400 });
  expect(finishPushJob).toHaveBeenCalledWith(job, true);
});
it.each([404, 410])(
  "removes permanently expired endpoints (%s)",
  async (statusCode) => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode });
    expect(await deliverPushReminders()).toEqual({
      accepted: 0,
      failed: 0,
      expired: 1,
    });
    expect(removeExpiredPushDevice).toHaveBeenCalledWith(job);
  },
);
it("keeps temporary failures queued for retry", async () => {
  vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 503 });
  expect(await deliverPushReminders()).toEqual({
    accepted: 0,
    failed: 1,
    expired: 0,
  });
  expect(finishPushJob).toHaveBeenCalledWith(job, false);
  expect(removeExpiredPushDevice).not.toHaveBeenCalled();
});
