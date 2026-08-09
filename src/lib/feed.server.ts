import { ensureSchema, getDb } from "./turso.server";
import { storeActivity } from "./strava.server";

/**
 * "Zero OAuth" importer: pulls activities from a feed URL (RSS/Atom, JSON, or
 * a Strava page reachable with a session token) and stores them like webhook
 * deliveries, so the dashboard and SSE stream stay identical.
 */

export type FeedSource = {
  url: string;
  token: string | null;
  athleteKey: number;
  lastSync: number | null;
  lastError: string | null;
};

let schemaReady: Promise<void> | null = null;

async function ensureFeedSchema() {
  await ensureSchema();
  if (!schemaReady) {
    schemaReady = getDb()
      .execute(
        `CREATE TABLE IF NOT EXISTS feed_sources (
           session_id TEXT PRIMARY KEY,
           url TEXT NOT NULL,
           token TEXT,
           athlete_key INTEGER NOT NULL,
           last_sync INTEGER,
           last_error TEXT
         )`,
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

function hashKey(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Negative range keeps feed-sourced athletes distinct from real Strava ids.
  return -(Math.abs(h) % 2000000000) - 1;
}

/** Strava athlete id when the URL points at a Strava profile / training log. */
function athleteKeyFor(url: string): number {
  const m = /strava\.com\/athletes\/(\d+)/i.exec(url);
  if (m && m[1]) return -Number(m[1]);
  return hashKey(url);
}

export async function saveFeed(sessionId: string, url: string, token: string | null) {
  await ensureFeedSchema();
  const athleteKey = athleteKeyFor(url);
  await getDb().execute({
    sql: `INSERT INTO feed_sources (session_id, url, token, athlete_key, last_sync, last_error)
          VALUES (?, ?, ?, ?, NULL, NULL)
          ON CONFLICT(session_id) DO UPDATE SET
            url=excluded.url, token=excluded.token, athlete_key=excluded.athlete_key,
            last_error=NULL`,
    args: [sessionId, url, token, athleteKey],
  });
  return athleteKey;
}

export async function loadFeed(sessionId: string): Promise<FeedSource | null> {
  await ensureFeedSchema();
  const rs = await getDb().execute({
    sql: `SELECT url, token, athlete_key, last_sync, last_error FROM feed_sources WHERE session_id = ?`,
    args: [sessionId],
  });
  const row = rs.rows[0];
  if (!row) return null;
  return {
    url: row["url"] as string,
    token: (row["token"] as string) ?? null,
    athleteKey: Number(row["athlete_key"]),
    lastSync: row["last_sync"] === null ? null : Number(row["last_sync"]),
    lastError: (row["last_error"] as string) ?? null,
  };
}

export async function deleteFeed(sessionId: string) {
  await ensureFeedSchema();
  await getDb().execute({ sql: `DELETE FROM feed_sources WHERE session_id = ?`, args: [sessionId] });
}

async function markSync(sessionId: string, error: string | null) {
  await getDb().execute({
    sql: `UPDATE feed_sources SET last_sync = ?, last_error = ? WHERE session_id = ?`,
    args: [Date.now(), error, sessionId],
  });
}

/* ------------------------------- parsing -------------------------------- */

type Raw = Record<string, unknown>;

function seconds(text: string): number {
  const hms = /(\d+)\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}))?/.exec(text);
  if (hms) {
    const a = Number(hms[1]);
    const b = Number(hms[2]);
    const c = hms[3] === undefined ? null : Number(hms[3]);
    return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  }
  let total = 0;
  const h = /(\d+(?:[.,]\d+)?)\s*h/i.exec(text);
  const m = /(\d+(?:[.,]\d+)?)\s*(?:min|m\b)/i.exec(text);
  const s = /(\d+(?:[.,]\d+)?)\s*s\b/i.exec(text);
  if (h?.[1]) total += Number(h[1].replace(",", ".")) * 3600;
  if (m?.[1]) total += Number(m[1].replace(",", ".")) * 60;
  if (s?.[1]) total += Number(s[1].replace(",", "."));
  return Math.round(total);
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = re.exec(xml);
  if (!m || m[1] === undefined) return null;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/** RSS / Atom feed of activities (Strava-to-RSS bridges, Garmin, etc.). */
function parseFeedXml(xml: string): Raw[] {
  const items = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  return items.map((item, index) => {
    const title = stripTags(tag(item, "title") ?? "Activité");
    const link =
      tag(item, "link") ?? /<link[^>]*href="([^"]+)"/i.exec(item)?.[1] ?? "";
    const date =
      tag(item, "pubDate") ?? tag(item, "published") ?? tag(item, "updated") ?? null;
    const body = stripTags(
      `${tag(item, "description") ?? ""} ${tag(item, "content:encoded") ?? ""} ${tag(item, "summary") ?? ""} ${title}`,
    );
    const km = /(\d+(?:[.,]\d+)?)\s*(km|kilom)/i.exec(body);
    const mi = /(\d+(?:[.,]\d+)?)\s*mi\b/i.exec(body);
    const elev = /(\d+(?:[.,]\d+)?)\s*m\s*(?:D\+|deniv|elev)/i.exec(body);
    const timePart = /(?:temps|time|durée|duration)\s*:?\s*([^,;|]+)/i.exec(body);
    const idFromLink = /activities\/(\d+)/.exec(link)?.[1];
    const distance = km?.[1]
      ? Number(km[1].replace(",", ".")) * 1000
      : mi?.[1]
        ? Number(mi[1].replace(",", ".")) * 1609.34
        : 0;
    const moving = seconds(timePart?.[1] ?? body);
    const iso = date ? new Date(date).toISOString() : null;
    return {
      id: idFromLink ? Number(idFromLink) : hashKey(link || title + index) * -1,
      name: title,
      type: /ride|vélo|velo|cycl/i.test(body) ? "Ride" : /swim|nage/i.test(body) ? "Swim" : "Run",
      start_date_local: iso,
      start_date: iso,
      distance,
      moving_time: moving,
      elapsed_time: moving,
      total_elevation_gain: elev?.[1] ? Number(elev[1].replace(",", ".")) : 0,
      average_speed: distance && moving ? distance / moving : 0,
    } satisfies Raw;
  });
}

/** JSON payloads: Strava API shape, training-log shape, or a plain array. */
function parseJson(value: unknown): Raw[] {
  const list: unknown = Array.isArray(value)
    ? value
    : ((value as Raw)?.["activities"] ??
      (value as Raw)?.["items"] ??
      (value as Raw)?.["data"] ??
      []);
  if (!Array.isArray(list)) return [];
  return list.map((entry, index) => {
    const a = entry as Raw;
    const distance = Number(a["distance"] ?? 0);
    const moving = Number(a["moving_time"] ?? a["elapsed_time"] ?? 0);
    const iso =
      (a["start_date_local"] as string) ??
      (a["start_date"] as string) ??
      (a["start_date_local_raw"] ? new Date(Number(a["start_date_local_raw"]) * 1000).toISOString() : null);
    return {
      ...a,
      id: Number(a["id"] ?? hashKey(String(a["name"] ?? index) + index) * -1),
      name: (a["name"] as string) ?? "Activité",
      type: (a["sport_type"] as string) ?? (a["type"] as string) ?? "Workout",
      start_date_local: iso,
      start_date: iso,
      distance,
      moving_time: moving,
      elapsed_time: Number(a["elapsed_time"] ?? moving),
      total_elevation_gain: Number(a["total_elevation_gain"] ?? a["elev_gain"] ?? 0),
      average_speed: Number(a["average_speed"] ?? (distance && moving ? distance / moving : 0)),
    } satisfies Raw;
  });
}

/** Strava HTML pages embed their data as JSON inside data-react-props. */
function parseStravaHtml(html: string): Raw[] {
  const props = html.match(/data-react-props="([^"]+)"/g) ?? [];
  for (const chunk of props) {
    const encoded = chunk.slice('data-react-props="'.length, -1);
    const json = encoded
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    try {
      const parsed = JSON.parse(json) as Raw;
      const found = parseJson(parsed);
      if (found.length) return found;
    } catch {
      /* not the block we need */
    }
  }
  return [];
}

function buildHeaders(url: string, token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    accept: "application/json, application/rss+xml, application/xml, text/html;q=0.9,*/*;q=0.8",
  };
  if (token) {
    if (/strava\.com/i.test(url)) {
      headers["cookie"] = token.includes("=") ? token : `_strava4_session=${token}`;
    } else {
      headers["authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export type SyncResult = { imported: number; total: number; error: string | null };

/** Fetches the configured feed and upserts every activity it can read. */
export async function syncFeed(sessionId: string): Promise<SyncResult> {
  const feed = await loadFeed(sessionId);
  if (!feed) return { imported: 0, total: 0, error: null };

  try {
    const res = await fetch(feed.url, { headers: buildHeaders(feed.url, feed.token), redirect: "follow" });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(
        res.status === 403 || res.status === 401
          ? "Accès refusé (403). Cette page Strava exige une session : colle ton cookie _strava4_session dans le champ Jeton."
          : `La source a répondu ${res.status}`,
      );
    }

    const trimmed = body.trim();
    let raw: Raw[] = [];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      raw = parseJson(JSON.parse(trimmed));
    } else if (/<rss|<feed|<item[\s>]/i.test(trimmed)) {
      raw = parseFeedXml(trimmed);
    } else {
      raw = parseStravaHtml(trimmed);
      if (!raw.length && /sign in|log in|connexion/i.test(trimmed)) {
        throw new Error(
          "Strava renvoie une page de connexion : ajoute ton cookie _strava4_session dans le champ Jeton.",
        );
      }
    }

    const usable = raw.filter((a) => a["start_date"] || a["distance"]);
    for (const activity of usable) await storeActivity(feed.athleteKey, activity);
    await markSync(sessionId, usable.length ? null : "Aucune activité lisible dans cette source.");
    return {
      imported: usable.length,
      total: raw.length,
      error: usable.length ? null : "Aucune activité lisible dans cette source.",
    };
  } catch (error) {
    const message = (error as Error).message;
    await markSync(sessionId, message);
    return { imported: 0, total: 0, error: message };
  }
}
