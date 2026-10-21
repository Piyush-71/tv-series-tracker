import { randomUUID, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { claimPushJobs, finishPushJob, removeExpiredPushDevice } from "./store";

export function pushConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT &&
    process.env.CRON_SECRET,
  );
}

export function validCronAuthorization(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function deliverPushReminders() {
  const jobs = await claimPushJobs(randomUUID());
  const result = { accepted: 0, failed: 0, expired: 0 };
  // Bound outgoing concurrency and socket timeouts to fit one cron invocation.
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(
      jobs.slice(offset, offset + 5).map(async (job) => {
        try {
          const exact = job.release_date.includes("T");
          await webpush.sendNotification(
            job.subscription,
            JSON.stringify({
              title: exact
                ? `${job.title} is nearly here`
                : `${job.title} is scheduled for ${job.release_date}`,
              body: exact
                ? "Your Cinecount release reminder is due."
                : "Date-only schedule. Exact airtime has not been announced.",
              tag: `cinecount-${job.fingerprint}`,
              url: "/profile#reminders",
              expiresAt: job.expires_at,
            }),
            {
              vapidDetails: {
                subject: process.env.VAPID_SUBJECT!,
                publicKey: process.env.VAPID_PUBLIC_KEY!,
                privateKey: process.env.VAPID_PRIVATE_KEY!,
              },
              TTL: Math.max(
                0,
                Math.min(
                  86_400,
                  Math.floor((Date.parse(job.expires_at) - Date.now()) / 1000),
                ),
              ),
              timeout: 10_000,
            },
          );
          await finishPushJob(job, true);
          result.accepted++;
        } catch (error) {
          const status =
            error && typeof error === "object" && "statusCode" in error
              ? error.statusCode
              : undefined;
          if (status === 404 || status === 410) {
            await removeExpiredPushDevice(job);
            result.expired++;
          } else {
            await finishPushJob(job, false);
            result.failed++;
            console.error(
              JSON.stringify({
                event: "push.failed",
                status: typeof status === "number" ? status : null,
              }),
            );
          }
        }
      }),
    );
  }
  return result;
}
