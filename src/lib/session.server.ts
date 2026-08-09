const COOKIE = "plans_sid";

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

export function sessionCookie(id: string): string {
  const maxAge = 60 * 60 * 24 * 365;
  return `${COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

/** Returns the caller's session id, creating one when absent. */
export function resolveSession(request: Request): { id: string; setCookie?: string } {
  const existing = readSessionId(request);
  if (existing) return { id: existing };
  const id = newSessionId();
  return { id, setCookie: sessionCookie(id) };
}
