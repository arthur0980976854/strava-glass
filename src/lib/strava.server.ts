import { ensureSchema, getDb } from "./turso.server";

export type StravaTokens = {
  session_id: string;
  athlete_id: number | null;
  athlete_name: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export const STRAVA_SCOPES = "read,activity:read_all";

export function stravaConfig() {
  const clientId = process.env["STRAVA_CLIENT_ID"];
  const clientSecret = process.env["STRAVA_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Strava credentials are not configured");
  return { clientId, clientSecret };
}

export function authorizeUrl(redirectUri: string, state: string) {
  const { clientId } = stravaConfig();
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string) {
  const { clientId, clientSecret } = stravaConfig();
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed (${res.status})`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id: number; firstname?: string; lastname?: string };
  };
}

export async function saveTokens(sessionId: string, t: StravaTokens) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO strava_tokens (session_id, athlete_id, athlete_name, access_token, refresh_token, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            athlete_id=excluded.athlete_id, athlete_name=excluded.athlete_name,
            access_token=excluded.access_token, refresh_token=excluded.refresh_token,
            expires_at=excluded.expires_at`,
    args: [sessionId, t.athlete_id, t.athlete_name, t.access_token, t.refresh_token, t.expires_at],
  });
}

export async function loadTokens(sessionId: string): Promise<StravaTokens | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT * FROM strava_tokens WHERE session_id = ?`,
    args: [sessionId],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    session_id: sessionId,
    athlete_id: row["athlete_id"] === null ? null : Number(row["athlete_id"]),
    athlete_name: (row["athlete_name"] as string) ?? null,
    access_token: row["access_token"] as string,
    refresh_token: row["refresh_token"] as string,
    expires_at: Number(row["expires_at"]),
  };
}

/** Returns a valid access token, refreshing it transparently when expired. */
export async function validAccessToken(tokens: StravaTokens): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at - 60 > now) return tokens.access_token;

  const { clientId, clientSecret } = stravaConfig();
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed (${res.status})`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  await saveTokens(tokens.session_id, { ...tokens, ...json });
  return json.access_token;
}

export type ActivityCard = {
  id: number;
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
  const speed = num(a["average_speed"]) * 3.6;
  const map = a["map"] as { summary_polyline?: string; polyline?: string } | undefined;
  let pace: string | null = null;
  if (distance > 0 && moving > 0) {
    const secPerKm = moving / (distance / 1000);
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    pace = `${m}:${String(s).padStart(2, "0")}`;
  }
  return {
    id: Number(a["id"]),
    name: (a["name"] as string) ?? "Activité",
    type: (a["sport_type"] as string) || (a["type"] as string) || "Workout",
    start_date: (a["start_date_local"] as string) ?? (a["start_date"] as string) ?? null,
    distance_km: Math.round((distance / 1000) * 100) / 100,
    moving_time_s: moving,
    elapsed_time_s: num(a["elapsed_time"]),
    elevation_m: Math.round(num(a["total_elevation_gain"])),
    speed_kmh: Math.round(speed * 10) / 10,
    pace,
    power_w: a["average_watts"] ? Math.round(num(a["average_watts"])) : null,
    heartrate_bpm: a["average_heartrate"] ? Math.round(num(a["average_heartrate"])) : null,
    max_heartrate_bpm: a["max_heartrate"] ? Math.round(num(a["max_heartrate"])) : null,
    calories: a["calories"] ? Math.round(num(a["calories"])) : null,
    polyline: map?.summary_polyline || map?.polyline || null,
  };
}

export async function fetchActivities(accessToken: string, perPage = 20) {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Strava activities request failed (${res.status})`);
  return (await res.json()) as RawActivity[];
}

export async function fetchActivity(accessToken: string, id: number) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity request failed (${res.status})`);
  return (await res.json()) as RawActivity;
}

export async function storeActivity(athleteId: number, activity: RawActivity) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO strava_activities (id, athlete_id, payload, start_date, received_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, received_at=excluded.received_at`,
    args: [
      Number(activity["id"]),
      athleteId,
      JSON.stringify(activity),
      (activity["start_date_local"] as string) ?? null,
      Date.now(),
    ],
  });
}

export async function recentStoredActivities(athleteId: number, since = 0) {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT payload, received_at FROM strava_activities
          WHERE athlete_id = ? AND received_at > ?
          ORDER BY received_at DESC LIMIT 30`,
    args: [athleteId, since],
  });
  return rs.rows.map((r) => ({
    receivedAt: Number(r["received_at"]),
    activity: toCard(JSON.parse(r["payload"] as string) as RawActivity),
  }));
}

export async function sessionsForAthlete(athleteId: number): Promise<string[]> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT session_id FROM strava_tokens WHERE athlete_id = ?`,
    args: [athleteId],
  });
  return rs.rows.map((r) => r["session_id"] as string);
}
