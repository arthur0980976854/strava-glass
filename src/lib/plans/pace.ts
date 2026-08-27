/**
 * Pace ("allure") & speed calculations, ported from app.js. Pure functions.
 */

import { isBike, isSwim } from "./intensity";

/** Rounds to 1 decimal. */
export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Formats seconds-per-unit as m'ss" (e.g. 4'30"). */
export function fmtPace(minPerUnit: number): string {
  let m = Math.floor(minPerUnit);
  let s = Math.round((minPerUnit - m) * 60);
  if (s === 60) {
    m++;
    s = 0;
  }
  return `${m}'${String(s).padStart(2, "0")}"`;
}

export type PaceResult = {
  label: "Allure moyenne" | "Vitesse moyenne";
  /** Display string for the value with unit suffix. */
  display: string;
  /** Raw value written back into the metric field. */
  raw: string;
};

/**
 * Compute pace / speed given duration (minutes), sport name and the raw
 * distance from the sport's metric field (km for run/bike, **metres for swim**)
 * — mirroring the planner's per-sport field units.
 * - Swim → min per 100 m
 * - Bike → km/h
 * - Else → min per km
 * Returns null when duration or distance are missing.
 */
export function paceFor(
  sport: string,
  durationMin: number,
  distance: number,
): PaceResult | null {
  if (!durationMin || !distance) return null;
  if (isSwim(sport)) {
    const p = fmtPace(durationMin / (distance / 100));
    return { label: "Allure moyenne", display: `${p} /100m`, raw: p };
  }
  if (isBike(sport)) {
    const speed = round1(distance / (durationMin / 60));
    return { label: "Vitesse moyenne", display: `${speed} km/h`, raw: String(speed) };
  }
  const p = fmtPace(durationMin / distance);
  return { label: "Allure moyenne", display: `${p} /km`, raw: p };
}