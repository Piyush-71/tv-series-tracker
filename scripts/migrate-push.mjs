import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before running the push migration.");
const sql = neon(process.env.DATABASE_URL);
const migration = await readFile(
  new URL("../db/migrations/001_web_push.sql", import.meta.url),
  "utf8",
);
await sql.transaction(
  migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => sql.query(statement)),
);
console.log("Web Push tables and indexes are ready.");
