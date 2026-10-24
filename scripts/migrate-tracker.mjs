import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Set DATABASE_URL_UNPOOLED or DATABASE_URL before running the tracker migration.",
  );
const sql = neon(url);
const migration = await readFile(
  new URL("../db/migrations/002_account_tracker.sql", import.meta.url),
  "utf8",
);
await sql.query(migration);
console.log("Account tracker storage is ready.");
