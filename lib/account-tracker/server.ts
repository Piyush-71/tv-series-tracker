import { neon } from "@neondatabase/serverless";
import {
  accountData,
  parseAccountSnapshot,
  type AccountSnapshot,
} from "./model";
import type { TrackerData } from "@/lib/tracker";

function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Account storage is not configured");
  return neon(process.env.DATABASE_URL);
}
export async function readAccountTracker(
  userId: string,
): Promise<AccountSnapshot> {
  const sql = database();
  const [row] =
    await sql`SELECT data, revision FROM account_trackers WHERE user_id = ${userId}`;
  return row ? parseAccountSnapshot(row) : { data: null, revision: 0 };
}

/** Compare-and-swap prevents stale browsers and overlapping requests losing data. */
export async function writeAccountTracker(
  userId: string,
  revision: number,
  data: TrackerData,
): Promise<AccountSnapshot | null> {
  const sql = database();
  const json = JSON.stringify(accountData(data));
  const rows =
    revision === 0
      ? await sql`INSERT INTO account_trackers (user_id, data) VALUES (${userId}, ${json}::jsonb)
        ON CONFLICT (user_id) DO NOTHING RETURNING data, revision`
      : await sql`UPDATE account_trackers SET data = ${json}::jsonb,
        revision = revision + 1, updated_at = now()
        WHERE user_id = ${userId} AND revision = ${revision} RETURNING data, revision`;
  return rows[0] ? parseAccountSnapshot(rows[0]) : null;
}
