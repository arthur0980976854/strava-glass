import { ensureSchema, getDb } from "./turso.server";

const COOKIE = "plans_sid";

// ------------- Signed, tamper-evident session cookie -------------
//
// The cookie holds `<sessionId>.<hmac>` where the HMAC is computed with a
// server-side secret. This prevents forging, tampering or guessing session
// ids. The secret is either provided via SESSION_SECRET or generated once and
// persisted in the database so sessions survive restarts.

async function getServerSecret(): Promise<string> {
  const envSecret = process.env["SESSION_SECRET"];
  if (envSecret) return envSecret;
  // Try to persist a stable secret in the DB so sessions survive restarts. If
  // no database is configured, fall back to an ephemeral per-process secret
  // (sessions just reset on restart, which is safe).
  try {
    await ensureSchema();
    const db = getDb();
    const rs = await db.execute({
      sql: "SELECT value FROM server_secret WHERE key = 'session' LIMIT 1",
      args: [],
    });
    const row = rs.rows[0];
    if (row) return String(row["value"]);
    const generated = crypto.randomUUID() + crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO server_secret (key, value) VALUES ('session', ?) ON CONFLICT(key) DO NOTHING",
      args: [generated],
    });
    return generated;
  } catch {
    return crypto.randomUUID() + crypto.randomUUID();
  }
}

let cachedSecret: Promise<string> | null = null;
function serverSecret(): Promise<string> {
  if (!cachedSecret) {
    cachedSecret = getServerSecret().catch((error) => {
      cachedSecret = null;
      throw error;
    });
  }
  return cachedSecret;
}

async function signSession(id: string): Promise<string> {
  const secret = await serverSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return `${id}.${Buffer.from(sig).toString("base64url")}`;
}

async function verifySession(cookieValue: string): Promise<string | null> {
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookieValue.slice(0, dot);
  const expected = await signSession(id).catch(() => null);
  if (!expected) return null;
  // Constant-time comparison
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0 ? id : null;
}

export function readSessionId(request: Request): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function newSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Resolves the caller's validated session id. If the client sent a cookie it is
 * verified against its HMAC signature (forged/tampered cookies are rejected and
 * treated as absent). Returns a new id when no valid cookie is present.
 */
export async function resolveSession(request: Request): Promise<{
  id: string;
  setCookie?: string;
}> {
  const existing = readSessionId(request);
  if (existing) {
    const verified = await verifySession(existing);
    if (verified) return { id: verified };
    // Invalid/forged cookie → issue a fresh session.
  }
  const id = newSessionId();
  return { id, setCookie: await sessionCookie(id) };
}

export async function sessionCookie(id: string): Promise<string> {
  const signed = await signSession(id);
  const maxAge = 60 * 60 * 24 * 365;
  return `${COOKIE}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}