import { ensureSchema, getDb } from "./turso.server";

/**
 * intervals.icu integration — the single data source for the app.
 * The user authorises intervals.icu, which itself is connected to Strava,
 * so activities flow in without any Strava OAuth on our side.
 */

const API = "https://intervals.icu/api/v1";
// The OAuth token endpoint lives at the API *root* (not under /api/v1):
//   https://intervals.icu/api/oauth/token
const OAUTH_TOKEN_URL = "https://intervals.icu/api/oauth/token";

export type IntervalsTokens = {
  session_id: string;
  athlete_id: string;
  athlete_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
};

// Valid intervals.icu scopes are ACTIVITY, WELLNESS, CALENDAR, CHATS, LIBRARY and
// SETTINGS. Planned workouts (events) are covered by the CALENDAR scope — there is
// no "EVENT" scope, so requesting one makes the authorization grant fail.
export const INTERVALS_SCOPES =
  "ACTIVITY:READ,ACTIVITY:WRITE,CALENDAR:READ,CALENDAR:WRITE,SETTINGS:READ";

export function intervalsConfig() {
  const clientId = process.env["INTERVALS_CLIENT_ID"];
  const apiKey = process.env["INTERVALS_API_KEY"];
  if (!clientId || !apiKey) throw new Error("intervals.icu credentials are not configured");
  // intervals.icu OAuth requires a numeric client_id (integer).
  // Users sometimes set it as "i670840" (athlete-id format) — strip the leading "i".
  const numericClientId = clientId.replace(/^i/i, "");
  return { clientId: numericClientId, apiKey };
}

/** Strip leading "i" prefix so athlete IDs work in API paths as integers. */
function normalizeAthleteId(id: string): string {
  return id.replace(/^i/i, "");
}

/**
 * The OAuth redirect URI used both when building the authorize URL and when
 * exchanging the code. Hardcoded to the production domain (no env var needed).
 *
 * ⚠ This exact URL must also be registered on the intervals.icu app
 * (Manage App → Redirect URI's), otherwise OAuth refuses the redirect.
 */
export const INTERVALS_REDIRECT_URI = "https://plans3.lovable.app/api/intervals/callback";

export function authorizeUrl(redirectUri: string, state: string) {
  const { clientId } = intervalsConfig();
  const url = new URL("https://intervals.icu/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INTERVALS_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, apiKey } = intervalsConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: apiKey,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`intervals.icu token exchange failed (${res.status})`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    athlete_id?: string;
    athlete?: { id?: string; name?: string };
  };
}

export async function saveTokens(t: IntervalsTokens) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO intervals_tokens (session_id, athlete_id, athlete_name, access_token, refresh_token, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            athlete_id=excluded.athlete_id, athlete_name=excluded.athlete_name,
            access_token=excluded.access_token, refresh_token=excluded.refresh_token,
            expires_at=excluded.expires_at`,
    args: [t.session_id, t.athlete_id, t.athlete_name, t.access_token, t.refresh_token, t.expires_at],
  });
}

export async function loadTokens(sessionId: string): Promise<IntervalsTokens | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT * FROM intervals_tokens WHERE session_id = ?`,
    args: [sessionId],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    session_id: sessionId,
    athlete_id: String(row["athlete_id"]),
    athlete_name: (row["athlete_name"] as string) ?? null,
    access_token: row["access_token"] as string,
    refresh_token: (row["refresh_token"] as string) ?? null,
    expires_at: Number(row["expires_at"]),
  };
}

export async function deleteTokens(sessionId: string) {
  await ensureSchema();
  await getDb().execute({
    sql: "DELETE FROM intervals_tokens WHERE session_id = ?",
    args: [sessionId],
  });
}

/**
 * Revoke an access token on intervals.icu so webhooks stop and the grant is
 * closed. Best-effort: if the remote call fails (already revoked, no network)
 * we still drop the local token.
 */
export async function revokeIntervalsToken(sessionId: string) {
  const tokens = await loadTokens(sessionId);
  if (!tokens) return;
  try {
    await fetch("https://intervals.icu/api/v1/disconnect-app", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
  } catch {
    /* best-effort — token is dropped locally regardless */
  }
  await deleteTokens(sessionId);
}

export type ActivityCard = {
  id: string;
  name: string;
  type: string;
  start_date: string | null;
  distance_km: number;
  moving_time_s: number;
  elapsed_time_s: number;
  elevation_m: number;
  speed_kmh: number;
  pace: string | null;
  power_w: number | null;
  heartrate_bpm: number | null;
  max_heartrate_bpm: number | null;
  calories: number | null;
  polyline: string | null;
};

type RawActivity = Record<string, unknown>;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function toCard(a: RawActivity): ActivityCard {
  const distance = num(a["distance"]);
  const moving = num(a["moving_time"]);
  const elapsed = num(a["elapsed_time"]);
  const speed = num(a["average_speed"]) * 3.6;
  let pace: string | null = null;
  if (distance > 0 && moving > 0) {
    const secPerKm = moving / (distance / 1000);
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    pace = `${m}:${String(s).padStart(2, "0")}`;
  }
  const watts = a["icu_average_watts"] ?? a["average_watts"];
  return {
    id: String(a["id"]),
    name: (a["name"] as string) ?? "Activité",
    type: (a["type"] as string) || "Workout",
    start_date: (a["start_date_local"] as string) ?? (a["start_date"] as string) ?? null,
    distance_km: Math.round((distance / 1000) * 100) / 100,
    moving_time_s: moving,
    elapsed_time_s: elapsed || moving,
    elevation_m: Math.round(num(a["total_elevation_gain"])),
    speed_kmh: Math.round(speed * 10) / 10,
    pace,
    power_w: watts ? Math.round(num(watts)) : null,
    heartrate_bpm: a["average_heartrate"] ? Math.round(num(a["average_heartrate"])) : null,
    max_heartrate_bpm: a["max_heartrate"] ? Math.round(num(a["max_heartrate"])) : null,
    calories: a["calories"] ? Math.round(num(a["calories"])) : null,
    polyline: null,
  };
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
}

export async function fetchActivities(tokens: IntervalsTokens, days = 120) {
  const aid = normalizeAthleteId(tokens.athlete_id);
  const url = `${API}/athlete/${encodeURIComponent(aid)}/activities?oldest=${isoDaysAgo(days)}&newest=${new Date().toISOString().slice(0, 10)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!res.ok) {
    // intervals.icu issues access tokens with no refresh flow. A 401/403 means
    // the grant was revoked or replaced, so the only recovery is to reconnect.
    if (res.status === 401 || res.status === 403) {
      throw new Error("Accès intervals.icu refusé (token invalide ou expiré) — reconnecte-toi");
    }
    throw new Error(`intervals.icu activities request failed (${res.status})`);
  }
  const json = (await res.json()) as RawActivity[];
  return Array.isArray(json) ? json : [];
}

export async function fetchAthlete(accessToken: string, athleteId: string) {
  const aid = normalizeAthleteId(athleteId);
  const res = await fetch(`${API}/athlete/${encodeURIComponent(aid)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id?: string; name?: string };
}

export async function storeActivity(athleteId: string, activity: RawActivity) {
  await ensureSchema();
  const aid = normalizeAthleteId(athleteId);
  await getDb().execute({
    sql: `INSERT INTO intervals_activities (id, athlete_id, payload, start_date, received_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, received_at=excluded.received_at`,
    args: [
      String(activity["id"]),
      aid,
      JSON.stringify(activity),
      (activity["start_date_local"] as string) ?? null,
      Date.now(),
    ],
  });
}

export async function recentStoredActivities(athleteId: string, since = 0) {
  await ensureSchema();
  const aid = normalizeAthleteId(athleteId);
  const rs = await getDb().execute({
    sql: `SELECT payload, received_at FROM intervals_activities
          WHERE athlete_id = ? AND received_at > ?
          ORDER BY received_at DESC LIMIT 50`,
    args: [aid, since],
  });
  return rs.rows.map((r) => ({
    receivedAt: Number(r["received_at"]),
    activity: toCard(JSON.parse(r["payload"] as string) as RawActivity),
  }));
}
