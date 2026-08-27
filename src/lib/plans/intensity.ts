/**
 * Intensity classification (Endurance / Seuil / VMA) per session, ported from
 * app.js. Pure functions — no DOM access.
 */

import type { IntensityKey, Session } from "./model";

export const INTENSITIES: Record<IntensityKey, { label: string; color: string }> = {
  endurance: { label: "Endurance", color: "#10B981" },
  seuil: { label: "Seuil", color: "#F97316" },
  vma: { label: "VMA", color: "#EF4444" },
};

export function isRunSport(name: string | null | undefined): boolean {
  return /course|trail|run/i.test(name || "");
}

export function isSwim(name: string | null | undefined): boolean {
  return /natation|swim/i.test(name || "");
}

export function isBike(name: string | null | undefined): boolean {
  return /vélo|velo|bike|ride/i.test(name || "");
}

/**
 * Split a session's distance (km) into intensity buckets. Explicit per-segment
 * breakdown wins; otherwise the session name/type is classified heuristically.
 */
export function sessionIntensityKm(s: Session): Record<IntensityKey, number> {
  const out: Record<IntensityKey, number> = { endurance: 0, seuil: 0, vma: 0 };
  if (!s.actual) return out;
  const segs = s.actual.segments;
  if (segs && segs.length) {
    segs.forEach((g) => {
      const key = (g.intensity || "endurance") as IntensityKey;
      out[key] = (out[key] || 0) + (+g.km || 0);
    });
    return out;
  }
  if (!isRunSport(s.sport)) return out;
  const km = +(s.actual.distance || 0);
  if (!km) return out;
  const t = `${s.sessionType || ""} ${s.name || ""}`;
  if (/vma|fractionn|interval/i.test(t)) out.vma = km;
  else if (/seuil|tempo|allure sp/i.test(t)) out.seuil = km;
  else out.endurance = km;
  return out;
}

/** Aggregate intensity totals across a list of sessions. */
export function intensityTotals(sessions: Session[]): Record<IntensityKey, number> {
  const tot: Record<IntensityKey, number> = { endurance: 0, seuil: 0, vma: 0 };
  sessions.forEach((s) => {
    const k = sessionIntensityKm(s);
    tot.endurance += k.endurance;
    tot.seuil += k.seuil;
    tot.vma += k.vma;
  });
  return tot;
}