/** Unique id generator, ported from app.js (`Date.now()` base-36 + random suffix). */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}