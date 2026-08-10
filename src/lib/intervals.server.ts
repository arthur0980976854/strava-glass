import { ensureSchema, getDb } from "./turso.server";

/**
 * intervals.icu integration — the single data source for the app.
 * The user authorises intervals.icu, which itself is connected to Strava,
 * so activities flow in without any Strava OAuth on our side.
 */

const API = "https://intervals.icu/api/v1";

export type IntervalsTokens = {
  session_id: string;
  athlete_id: string;
  athlete_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
};

export const INTERVALS_SCOPES = "ACTIVITY:READ,SETTINGS:READ";

/**
 * Nettoie les identifiants pour retirer le préfixe "i" (ex: "i670840" -> "670840")
 * si un ID explicite est manipulé en local.
 */
function cleanId(id: unknown): string {
  if (!id) return "";
  return String(id).replace(/^i/i, "");
}

export function intervalsConfig() {
  const clientId = process.env["INTERVALS_CLIENT_ID"];
  const apiKey = process.env["INTERVALS_API_KEY"];
  if (!clientId || !apiKey) throw new Error("intervals.icu credentials are not configured");
  return { clientId, apiKey };
}

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
  const res = await fetch(`${API}/oauth/token`, {
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
  const safeAthleteId = cleanId(t.athlete_id) || "0";

  await getDb().execute({
    sql: `INSERT INTO intervals_tokens (session_id, athlete_id, athlete_name, access_token, refresh_token, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            athlete_id=excluded.athlete_id, athlete_name=excluded.athlete_name,
            access_token=excluded.access_token, refresh_token=excluded.refresh_token,
            expires_at=excluded.expires_at`,
    args: [t.session_id, safeAthleteId, t.athlete_name, t.access_token, t.refresh_token, t.expires_at],
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
    athlete_id: cleanId(row["athlete_id"]) || "0",
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
    let m = Math.floor(secPerKm / 60);
    let s = Math.round(secPerKm % 60);
    if (s >= 60) {
      m += 1;
      s = 0;
    }
    pace = `${m}:${String(s).padStart(2, "0")}`;
  }

  const watts = a["icu_average_watts"] ?? a["average_watts"];
  const rawPolyline = (a["map"] as Record<string, unknown> | undefined)?.summary_polyline ?? a["polyline"];

  return {
    id: cleanId(a["id"]),
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
    polyline: typeof rawPolyline === "string" ? rawPolyline : null,
  };
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
}

/**
 * Utilise l'identifiant "0" qui est résolu automatiquement par l'API
 * Intervals.icu vers l'athlète correspondant au Bearer token OAuth fourni.
 */
export async function fetchActivities(tokens: IntervalsTokens, days = 120) {
  const url = `${API}/athlete/0/activities?oldest=${isoDaysAgo(days)}&newest=${new Date().toISOString().slice(0, 10)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorDetail = await res.text().catch(() => "");
    throw new Error(`intervals.icu activities request failed (${res.status}): ${errorDetail}`);
  }

  const json = (await res.json()) as RawActivity[];
  return Array.isArray(json) ? json : [];
}

/**
 * Récupère le profil du compte connecté via "/athlete/0"
 */
export async function fetchAthlete(accessToken: string, _athleteId?: string) {
  const res = await fetch(`${API}/athlete/0`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  return (await res.json()) as { id?: string; name?: string };
}

export async function storeActivity(athleteId: string, activity: RawActivity) {
  await ensureSchema();
  const safeAthleteId = cleanId(athleteId) || "0";
  const safeActivityId = cleanId(activity["id"]);

  await getDb().execute({
    sql: `INSERT INTO intervals_activities (id, athlete_id, payload, start_date, received_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, received_at=excluded.received_at`,
    args: [
      safeActivityId,
      safeAthleteId,
      JSON.stringify(activity),
      (activity["start_date_local"] as string) ?? null,
      Date.now(),
    ],
  });
}

export async function recentStoredActivities(athleteId: string, since = 0) {
  await ensureSchema();
  const safeAthleteId = cleanId(athleteId) || "0";

  const rs = await getDb().execute({
    sql: `SELECT payload, received_at FROM intervals_activities
          WHERE athlete_id = ? AND received_at > ?
          ORDER BY received_at DESC LIMIT 50`,
    args: [safeAthleteId, since],
  });
  return rs.rows.map((r) => ({
    receivedAt: Number(r["received_at"]),
    activity: toCard(JSON.parse(r["payload"] as string) as RawActivity),
  }));
}
