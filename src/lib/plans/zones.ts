/**
 * Cardio-zone & VMA calculations, ported from app.js.
 * Pure functions — no DOM access.
 */

import { VMA_PCTS, ZONE_PCT, type Profile } from "./model";

export type Zone = { min: number; max: number };

/** The 5 recommended HR zones, or the user's custom override, or derived from hrMax. */
export function computeZones(profile: Profile): Zone[] {
  if (profile.zones && profile.zones.length === 5) return profile.zones;
  const hrMax = profile.hrMax || 190;
  return ZONE_PCT.map((p) => ({
    min: Math.round((hrMax * p[0]) / 100),
    max: Math.round((hrMax * p[1]) / 100),
  }));
}

/** 1-based zone for a bpm (or null when unknown). */
export function bpmZone(bpm: number | null | undefined, profile: Profile): number | null {
  if (!bpm) return null;
  const zones = computeZones(profile);
  for (let i = 0; i < zones.length; i++) {
    if (bpm >= zones[i]!.min && bpm <= zones[i]!.max) return i + 1;
  }
  if (bpm > zones[4]!.max) return 5;
  if (bpm < zones[0]!.min) return 1;
  return null;
}

export type VmaRow = {
  pct: number;
  speedKmh: number;
  pacePerKm: string;
};

/** Pace rows for % VMA (speed + min:sec/km). */
export function vmaRows(vma: number | null): VmaRow[] {
  return VMA_PCTS.filter((_) => vma != null).map((p) => {
    const speed = (vma! * p) / 100;
    const paceMin = 60 / speed;
    const min = Math.floor(paceMin);
    const sec = Math.round((paceMin - min) * 60);
    return { pct: p, speedKmh: speed, pacePerKm: `${min}:${String(sec).padStart(2, "0")}/km` };
  });
}