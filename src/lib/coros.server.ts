import { createHash } from "node:crypto";
import { ensureSchema, getDb } from "./turso.server";

/**
 * COROS Training Hub integration — the single data source for the app.
 *
 * This uses the (undocumented, community-reverse-engineered) Training Hub API:
 *   https://teameuapi.coros.com (Europe) / teamapi.coros.com / teamcnapi.coros.com
 *
 * It authenticates with the COROS account e-mail + password (MD5), then lists
 * activities and downloads each one's TCX file to extract the metrics. The API
 * is not public and could change or break at any time.
 *
 * Each COROS login creates (or reuses) an account keyed by the COROS e-mail.
 * The session is linked to that account, so the same account on another device
 * retrieves the same planning data and activities.
 */

const DEFAULT_API_URL = "https://teameuapi.coros.com"; // Europe

export type CorosTokens = {
  email: string;
  athlete_name: string | null;
  access_token: string;
  expires_at: number;
};

/** COROS sportType → frontend sport type (same values as the old intervals.js map). */
const SPORT_TYPES: Record<number, string> = {
  100: "Run",
  101: "Run",
  102: "TrailRun",
  103: "Run",
  104: "Hike",
  105: "Hike",
  106: "Hike",
  200: "Ride",
  201: "VirtualRide",
  202: "Ride",
  203: "GravelRide",
  204: "MountainBikeRide",
  205: "MountainBikeRide",
  299: "Ride",
  300: "Swim",
  301: "Swim",
  400: "Workout",
  401: "Workout",
  402: "WeightTraining",
  500: "NordicSki",
  501: "NordicSki",
  502: "NordicSki",
  503: "NordicSki",
  700: "Rowing",
  701: "Rowing",
  702: "Rowing",
  704: "Rowing",
  705: "Workout",
  706: "Workout",
  800: "Workout",
  801: "Workout",
  900: "Walk",
  901: "Workout",
  902: "Workout",
  10000: "Workout",
  10001: "Workout",
  10002: "NordicSki",
  10003: "Hike",
};

/** All sport type codes (modeList) — request everything. */
const ALL_MODES = Object.keys(SPORT_TYPES).join(",");

/** API base URL — defaults to Europe; can be overridden via COROS_API_URL. */
export function corosApiUrl(): string {
  return process.env["COROS_API_URL"] ?? DEFAULT_API_URL;
}

type CorosEnvelope<T> = { apiCode: string; message: string; result: string; data: T };

async function parseEnvelope<T>(res: Response): Promise<CorosEnvelope<T>> {
  const json = (await res.json()) as CorosEnvelope<T>;
  if (json.result !== "0000") {
    throw new Error(`Coros: ${json.message || `résultat ${json.result}`}`);
  }
  return json;
}

/**
 * Log in with the COROS account (e-mail + password submitted from the login
 * page); returns the access token. The password is only used to build the MD5
 * hash for the request — it is never stored.
 */
export async function corosLogin(email: string, password: string): Promise<string> {
  const pwd = createHash("md5").update(password).digest("hex");
  const res = await fetch(`${corosApiUrl()}/account/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountType: 2, account: email, pwd }),
  });
  if (!res.ok) throw new Error(`Coros login failed (${res.status})`);
  const { data } = await parseEnvelope<{ accessToken: string }>(res);
  if (!data.accessToken) throw new Error("Coros login refused");
  return data.accessToken;
}

type CorosActivitySummary = {
  date: number; // epoch ms
  labelId: string;
  name: string | null;
  sportType: number;
};

/** List activities (metadata only: date, labelId, name, sportType). */
async function queryActivities(accessToken: string, days: number): Promise<CorosActivitySummary[]> {
  const apiUrl = corosApiUrl();
  const start = new Date(Date.now() - days * 864e5);
  const end = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const all: CorosActivitySummary[] = [];
  let page = 1;
  let totalPage = 1;
  do {
    const url = `${apiUrl}/activity/query?size=100&pageNumber=${page}&startDay=${fmt(start)}&endDay=${fmt(end)}&modeList=${ALL_MODES}`;
    const res = await fetch(url, { headers: { accessToken } });
    if (!res.ok) throw new Error(`Coros activities failed (${res.status})`);
    const { data } = await parseEnvelope<{
      count?: number;
      dataList?: CorosActivitySummary[];
      totalPage?: number;
    }>(res);
    all.push(...(data.dataList ?? []));
    totalPage = data.totalPage ?? page;
    page += 1;
  } while (page <= totalPage);
  return all;
}

/** Download an activity's TCX file content (fileType=3 → tcx). */
async function downloadTcx(accessToken: string, labelId: string, sportType: number): Promise<string | null> {
  const url = `${corosApiUrl()}/activity/detail/download?labelId=${encodeURIComponent(labelId)}&sportType=${sportType}&fileType=3`;
  const res = await fetch(url, { method: "POST", headers: { accessToken } });
  if (!res.ok) return null;
  const { data } = await parseEnvelope<{ fileUrl?: string }>(res);
  if (!data.fileUrl) return null;
  const file = await fetch(data.fileUrl);
  if (!file.ok) return null;
  return await file.text();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
  return m?.[1] ?? null;
}

function tagAll(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const v = m[1];
    if (v !== undefined) out.push(v);
  }
  return out;
}

function sumNums(vals: string[]): number {
  return vals.reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Parse a TCX file into the fields the dashboard needs. */
function parseTcx(xml: string): {
  startDate: string | null;
  distanceM: number;
  movingTimeS: number;
  calories: number | null;
  avgHr: number | null;
  maxHr: number | null;
  elevationGainM: number;
} {
  const startDate = tag(xml, "Id")?.replace("T", " ").slice(0, 19) ?? null;
  const distanceM = sumNums(tagAll(xml, "DistanceMeters"));
  const movingTimeS = sumNums(tagAll(xml, "TotalTimeSeconds"));
  const calories = sumNums(tagAll(xml, "Calories")) || null;

  const avgBlock = tag(xml, "AverageHeartRateBpm");
  const maxBlock = tag(xml, "MaximumHeartRateBpm");
  const avgHr = avgBlock ? Number(tag(avgBlock, "Value")) || null : null;
  const maxHr = maxBlock ? Number(tag(maxBlock, "Value")) || null : null;

  // Elevation gain: sum of positive altitude deltas between consecutive points.
  const alts = tagAll(xml, "AltitudeMeters").map((v) => Number(v) || 0);
  let elevationGainM = 0;
  for (let i = 1; i < alts.length; i++) {
    const prev = alts[i - 1];
    const curr = alts[i];
    if (curr !== undefined && prev !== undefined && curr > prev) elevationGainM += curr - prev;
  }

  return { startDate, distanceM, movingTimeS, calories, avgHr, maxHr, elevationGainM: Math.round(elevationGainM) };
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

function toCard(a: CorosActivitySummary, tcx: string | null): ActivityCard {
  const parsed = tcx ? parseTcx(tcx) : null;
  const distanceM = parsed?.distanceM ?? 0;
  const moving = parsed?.movingTimeS ?? 0;
  const distance_km = Math.round((distanceM / 1000) * 100) / 100;
  const speed_kmh = moving > 0 && distanceM > 0 ? Math.round((distanceM / moving) * 3.6 * 10) / 10 : 0;
  let pace: string | null = null;
  if (distanceM > 0 && moving > 0) {
    const secPerKm = moving / (distanceM / 1000);
    pace = `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}`;
  }
  return {
    id: a.labelId,
    name: a.name ?? "Activité",
    type: SPORT_TYPES[a.sportType] ?? "Workout",
    start_date: parsed?.startDate ?? (a.date ? new Date(a.date).toISOString().slice(0, 19).replace("T", " ") : null),
    distance_km,
    moving_time_s: moving,
    elapsed_time_s: moving,
    elevation_m: parsed?.elevationGainM ?? 0,
    speed_kmh,
    pace,
    power_w: null, // not available in TCX
    heartrate_bpm: parsed?.avgHr ?? null,
    max_heartrate_bpm: parsed?.maxHr ?? null,
    calories: parsed?.calories ?? null,
    polyline: null,
  };
}

// ---------------------------------------------------------------------------
// Accounts & session links
// ---------------------------------------------------------------------------

/** Create or update a COROS account (keyed by e-mail). Returns the account. */
export async function getOrCreateAccount(
  email: string,
  athleteName: string | null,
): Promise<{ email: string; athlete_name: string | null; created_at: number }> {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO coros_accounts (email, athlete_name, created_at)
          VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET athlete_name=excluded.athlete_name`,
    args: [email, athleteName, Date.now()],
  });
  const rs = await getDb().execute({
    sql: "SELECT * FROM coros_accounts WHERE email = ?",
    args: [email],
  });
  const row = rs.rows[0];
  return {
    email,
    athlete_name: (row?.["athlete_name"] as string) ?? null,
    created_at: Number(row?.["created_at"] ?? 0),
  };
}

/** Link a browser session to a COROS account. */
export async function linkSession(sessionId: string, email: string) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO session_accounts (session_id, email, linked_at)
          VALUES (?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET email=excluded.email, linked_at=excluded.linked_at`,
    args: [sessionId, email, Date.now()],
  });
}

/** E-mail of the COROS account linked to this session, or null. */
export async function sessionEmail(sessionId: string): Promise<string | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: "SELECT email FROM session_accounts WHERE session_id = ?",
    args: [sessionId],
  });
  const row = rs.rows[0];
  return row ? (row["email"] as string) : null;
}

/** Remove the session → account link (keep the account and its data). */
export async function unlinkSession(sessionId: string) {
  await ensureSchema();
  await getDb().execute({
    sql: "DELETE FROM session_accounts WHERE session_id = ?",
    args: [sessionId],
  });
}

export async function saveTokens(t: CorosTokens) {
  await ensureSchema();
  await getOrCreateAccount(t.email, t.athlete_name);
  await getDb().execute({
    sql: `INSERT INTO coros_account_tokens (email, access_token, expires_at)
          VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET
            access_token=excluded.access_token, expires_at=excluded.expires_at`,
    args: [t.email, t.access_token, t.expires_at],
  });
}

export async function loadTokens(email: string): Promise<CorosTokens | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT t.access_token, t.expires_at, a.athlete_name
          FROM coros_account_tokens t
          LEFT JOIN coros_accounts a ON a.email = t.email
          WHERE t.email = ?`,
    args: [email],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    email,
    athlete_name: (row["athlete_name"] as string) ?? null,
    access_token: row["access_token"] as string,
    expires_at: Number(row["expires_at"]),
  };
}

export async function deleteTokens(email: string) {
  await ensureSchema();
  await getDb().execute({
    sql: "DELETE FROM coros_account_tokens WHERE email = ?",
    args: [email],
  });
}

// ---------------------------------------------------------------------------
// Per-user planning state
// ---------------------------------------------------------------------------

export async function loadUserState(userId: string): Promise<string | null> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: "SELECT data FROM user_state WHERE user_id = ?",
    args: [userId],
  });
  const row = rs.rows[0];
  return row ? (row["data"] as string) : null;
}

export async function saveUserState(userId: string, data: string) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO user_state (user_id, data, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
    args: [userId, data, Date.now()],
  });
}

/**
 * Migrate a session's local state (anonymous, keyed by session id) into the
 * account's state — used on first login so nothing already planned is lost.
 */
export async function migrateSessionStateToAccount(sessionId: string, email: string) {
  await ensureSchema();
  const existing = await loadUserState(email);
  if (existing !== null) return; // account already has state — keep it
  const rs = await getDb().execute({
    sql: "SELECT data FROM app_state WHERE session_id = ?",
    args: [sessionId],
  });
  const row = rs.rows[0];
  if (row) await saveUserState(email, row["data"] as string);
}

export async function storeActivity(athleteId: string, card: ActivityCard) {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO coros_activities (id, athlete_id, payload, start_date, received_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, received_at=excluded.received_at`,
    args: [card.id, athleteId, JSON.stringify(card), card.start_date, Date.now()],
  });
}

export async function recentStoredActivities(athleteId: string, since = 0) {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: `SELECT payload, received_at FROM coros_activities
          WHERE athlete_id = ? AND received_at > ?
          ORDER BY received_at DESC LIMIT 50`,
    args: [athleteId, since],
  });
  return rs.rows.map((r) => ({
    receivedAt: Number(r["received_at"]),
    activity: JSON.parse(r["payload"] as string) as ActivityCard,
  }));
}

/**
 * Fetch activities from COROS: list metadata, then download + parse each TCX.
 * Returns the activity cards.
 */
export async function fetchActivities(accessToken: string, days = 120): Promise<ActivityCard[]> {
  const summaries = await queryActivities(accessToken, days);
  const cards: ActivityCard[] = [];
  // Download TCX for each activity (bounded to the most recent `days` worth).
  for (const s of summaries) {
    try {
      const tcx = await downloadTcx(accessToken, s.labelId, s.sportType);
      cards.push(toCard(s, tcx));
    } catch {
      cards.push(toCard(s, null)); // keep metadata-only card on download failure
    }
  }
  // Newest first.
  cards.sort((a, b) => (a.start_date && b.start_date ? b.start_date.localeCompare(a.start_date) : 0));
  return cards;
}


