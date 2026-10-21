import { neon } from "@neondatabase/serverless";
import type { PushSubscription } from "web-push";
import { deviceId, pushJob, type PushSnapshot } from "./model";

function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Web Push storage is not configured.");
  return neon(process.env.DATABASE_URL);
}

export async function syncPushDevice(snapshot: PushSnapshot) {
  const sql = database();
  const id = deviceId(snapshot.deviceToken);
  const jobs = JSON.stringify(
    snapshot.reminders.map((reminder) => pushJob(reminder, snapshot.timeZone)),
  );
  const results = await sql.transaction([
    sql`DELETE FROM web_push_devices
      WHERE (device_id = ${id} AND user_id <> ${snapshot.userId})
        OR (device_id <> ${id} AND subscription = ${JSON.stringify(snapshot.subscription)}::jsonb)`,
    sql`INSERT INTO web_push_devices (device_id, user_id, subscription)
      VALUES (${id}, ${snapshot.userId}, ${JSON.stringify(snapshot.subscription)}::jsonb)
      ON CONFLICT (device_id) DO UPDATE SET user_id = EXCLUDED.user_id,
        subscription = EXCLUDED.subscription, updated_at = now()`,
    sql`DELETE FROM web_push_reminders WHERE device_id = ${id}
      AND reminder_id NOT IN (SELECT x.reminder_id FROM jsonb_to_recordset(${jobs}::jsonb) AS x(reminder_id text))`,
    sql`INSERT INTO web_push_reminders
      (device_id, reminder_id, fingerprint, title, release_date, due_at, expires_at, status)
      SELECT ${id}, x.reminder_id, x.fingerprint, x.title, x.release_date, x.due_at, x.expires_at, x.status
      FROM jsonb_to_recordset(${jobs}::jsonb) AS x(reminder_id text, fingerprint text, title text,
        release_date text, due_at timestamptz, expires_at timestamptz, status text)
      ON CONFLICT (device_id, reminder_id) DO UPDATE SET
        title = EXCLUDED.title, release_date = EXCLUDED.release_date,
        due_at = EXCLUDED.due_at, expires_at = EXCLUDED.expires_at, fingerprint = EXCLUDED.fingerprint,
        status = CASE WHEN web_push_reminders.fingerprint = EXCLUDED.fingerprint
          THEN web_push_reminders.status ELSE EXCLUDED.status END,
        attempts = CASE WHEN web_push_reminders.fingerprint = EXCLUDED.fingerprint THEN web_push_reminders.attempts ELSE 0 END,
        retry_at = CASE WHEN web_push_reminders.fingerprint = EXCLUDED.fingerprint THEN web_push_reminders.retry_at ELSE now() END,
        lease_token = CASE WHEN web_push_reminders.fingerprint = EXCLUDED.fingerprint THEN web_push_reminders.lease_token ELSE NULL END,
        lease_until = CASE WHEN web_push_reminders.fingerprint = EXCLUDED.fingerprint THEN web_push_reminders.lease_until ELSE NULL END`,
    sql`SELECT reminder_id AS id, release_date AS "releaseDate", fingerprint, status
      FROM web_push_reminders WHERE device_id = ${id}`,
  ]);
  return results[4];
}

/** The random browser token is a revocation capability, usable even after sign-out. */
export async function removePushDevice(token: string) {
  const sql = database();
  await sql`DELETE FROM web_push_devices WHERE device_id = ${deviceId(token)}`;
}

export type ClaimedPushJob = {
  device_id: string;
  reminder_id: string;
  fingerprint: string;
  title: string;
  release_date: string;
  expires_at: string;
  subscription: PushSubscription;
  attempts: number;
  lease_token: string;
};

export async function claimPushJobs(token: string): Promise<ClaimedPushJob[]> {
  const sql = database();
  await sql`UPDATE web_push_reminders SET status = 'missed'
    WHERE status IN ('scheduled', 'sending') AND expires_at <= now()`;
  await sql`DELETE FROM web_push_devices WHERE updated_at < now() - interval '90 days'`;
  const rows = await sql`WITH due AS (
    SELECT device_id, reminder_id FROM web_push_reminders
    WHERE due_at <= now() AND expires_at > now() AND retry_at <= now()
      AND (status = 'scheduled' OR (status = 'sending' AND lease_until < now()))
    ORDER BY due_at LIMIT 25 FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE web_push_reminders r SET status = 'sending', lease_token = ${token},
      lease_until = now() + interval '5 minutes', attempts = attempts + 1
    FROM due WHERE r.device_id = due.device_id AND r.reminder_id = due.reminder_id
    RETURNING r.*
  ) SELECT claimed.*, d.subscription FROM claimed
    JOIN web_push_devices d USING (device_id)`;
  return rows as ClaimedPushJob[];
}

export async function finishPushJob(job: ClaimedPushJob, delivered: boolean) {
  const sql = database();
  await sql`UPDATE web_push_reminders SET status = ${delivered ? "delivered" : "scheduled"},
    lease_until = NULL, lease_token = NULL,
    retry_at = now() + (${Math.min(3600, 30 * 2 ** Math.min(job.attempts, 7))} * interval '1 second')
    WHERE device_id = ${job.device_id} AND reminder_id = ${job.reminder_id}
      AND fingerprint = ${job.fingerprint} AND lease_token = ${job.lease_token}`;
}

export async function removeExpiredPushDevice(job: ClaimedPushJob) {
  const sql = database();
  await sql`DELETE FROM web_push_devices WHERE device_id = ${job.device_id}
    AND subscription->>'endpoint' = ${job.subscription.endpoint}`;
}
