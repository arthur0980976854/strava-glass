/**
 * Mapping between the app's local sport names (used across the UI, e.g. the
 * "Course à pied" fields and session library) and the intervals.icu activity
 * `type` values. Shared by every API route that talks to intervals.icu so the
 * mapping can never diverge between them.
 */

export const SPORT_TYPE_MAP: Record<string, string> = {
  "Course à pied": "Run",
  "Trail": "TrailRun",
  "Vélo": "Ride",
  "Vélo route": "Ride",
  "Gravel": "GravelRide",
  "VTT": "MountainBikeRide",
  "Natation": "Swim",
  "Triathlon": "Triathlon",
  "Marche": "Walk",
  "Randonnée": "Hike",
  "Musculation": "WeightTraining",
  "Yoga": "Yoga",
  "Escalade": "RockClimbing",
  "Aviron": "Rowing",
  "Ski nordique": "NordicSki",
  "Ski alpin": "AlpineSki",
  "Autre": "Workout",
};

export function toIntervalsType(sport: string): string {
  return SPORT_TYPE_MAP[sport] ?? "Workout";
}