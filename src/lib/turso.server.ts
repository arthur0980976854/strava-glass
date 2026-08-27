import { createClient, type Client } from "@libsql/client/web";

let client: Client | null = null;
let ready: Promise<void> | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = process.env["TURSO_DATABASE_URL"];
  const authToken = process.env["TURSO_AUTH_TOKEN"];
  if (!url) throw new Error("TURSO_DATABASE_URL is not configured");
  client = authToken ? createClient({ url, authToken }) : createClient({ url });
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    const db = getDb();
    ready = (async () => {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS users (
             id TEXT PRIMARY KEY,
             email TEXT NOT NULL UNIQUE,
             password_hash TEXT NOT NULL,
             salt TEXT NOT NULL,
             created_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS server_secret (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS app_state (
             session_id TEXT PRIMARY KEY,
             data TEXT NOT NULL,
             updated_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS coros_accounts (
             email TEXT PRIMARY KEY,
             athlete_name TEXT,
             created_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS session_accounts (
             session_id TEXT PRIMARY KEY,
             email TEXT NOT NULL,
             linked_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS user_state (
             user_id TEXT PRIMARY KEY,
             data TEXT NOT NULL,
             updated_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS coros_account_tokens (
             email TEXT PRIMARY KEY,
             access_token TEXT NOT NULL,
             expires_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS coros_activities (
             id TEXT PRIMARY KEY,
             athlete_id TEXT NOT NULL,
             payload TEXT NOT NULL,
             start_date TEXT,
             received_at INTEGER NOT NULL
           )`,
          `CREATE INDEX IF NOT EXISTS idx_coros_activities_athlete
             ON coros_activities (athlete_id, received_at DESC)`,
        ],
        "write",
      );
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
