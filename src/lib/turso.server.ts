import { createClient, type Client } from "@libsql/client/web";

let client: Client | null = null;
let ready: Promise<void> | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = process.env["TURSO_DATABASE_URL"];
  const authToken = process.env["TURSO_AUTH_TOKEN"];
  if (!url) throw new Error("TURSO_DATABASE_URL is not configured");
  client = createClient({ url, authToken });
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    const db = getDb();
    ready = (async () => {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS app_state (
             session_id TEXT PRIMARY KEY,
             data TEXT NOT NULL,
             updated_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS strava_tokens (
             session_id TEXT PRIMARY KEY,
             athlete_id INTEGER,
             athlete_name TEXT,
             access_token TEXT NOT NULL,
             refresh_token TEXT NOT NULL,
             expires_at INTEGER NOT NULL
           )`,
          `CREATE TABLE IF NOT EXISTS strava_activities (
             id INTEGER PRIMARY KEY,
             athlete_id INTEGER NOT NULL,
             payload TEXT NOT NULL,
             start_date TEXT,
             received_at INTEGER NOT NULL
           )`,
          `CREATE INDEX IF NOT EXISTS idx_activities_athlete
             ON strava_activities (athlete_id, received_at DESC)`,
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
