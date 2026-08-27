/**
 * Data model + constants for the training planner ("Plan's").
 * Extracted from the legacy public/plans/app.js monolith so it can be tested
 * and reused from React components. Pure — no DOM, no global mutable state.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type Sport = { name: string; color: string };

export type CycleType = "base" | "developpement" | "specifique" | "affutage" | "recuperation" | "libre";

export type Cycle = {
  id: string;
  type: CycleType;
  label?: string | null;
  start: string;
  end: string;
  color?: string;
};

export type SubCycle = {
  id: string;
  cycleId: string;
  name: string;
  start: string;
  end: string;
  objective?: string;
  objectiveKm?: number | null;
};

export type SubSubCycle = {
  id: string;
  subId: string;
  name: string;
  start: string;
  end: string;
  objective?: string;
  objectiveKm?: number | null;
};

export type SeasonGoal = {
  id: string;
  name: string;
  date: string;
  target?: string;
};

export type IntensityKey = "endurance" | "seuil" | "vma";

export type Segment = { name: string; km: number; intensity: IntensityKey };

export type Session = {
  id: string;
  date: string;
  sport: string;
  sessionType?: string;
  detail?: string;
  objective?: string;
  name?: string;
  status: "planned" | "done";
  durationPlanned?: number | null;
  actual?: {
    duration?: number;
    bpmAvg?: number | null;
    rpe?: number | null;
    charge?: number;
    plaisir?: number | null;
    distance?: number;
    elevation?: number;
    segments?: Segment[];
  } | null;
};

export type SportGroup = { id: string; name: string; sports: string[] };

export type SessionTemplate = {
  id: string;
  name: string;
  sport: string;
  sessionType?: string;
  detail?: string;
  objective?: string;
  durationPlanned?: number | null;
};

export type Profile = {
  firstName: string;
  lastName: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  vma: number | null;
  hrMax: number | null;
  hrRest: number | null;
  zones: { min: number; max: number }[];
  weeklyTargetHours: number | null;
  weeklyTargetKm: number | null;
};

export type Season = { start: string | null; end: string | null };

export type AppState = {
  profile: Profile;
  sports: Sport[];
  sessionTypes: string[];
  cycleNames: string[];
  season: Season;
  cycles: Cycle[];
  subcycles: SubCycle[];
  subsubcycles: SubSubCycle[];
  seasonGoals: SeasonGoal[];
  weekTypes: Record<string, string>;
  weekObjectives: Record<string, string>;
  sessionTemplates: SessionTemplate[];
  sportGroups: SportGroup[];
  sessions: Session[];
};

export type SportField =
  | { key: string; label: string; unit: string; type?: "number" | "text" }
  | { key: string; label: string; unit: string; type: "text" };

// ---------------------------------------------------------------------------
// Constants (ported verbatim from app.js)
// ---------------------------------------------------------------------------

export const CYCLE_TYPES: Record<CycleType, { label: string; color: string }> = {
  base: { label: "Base", color: "#2563EB" },
  developpement: { label: "Développement", color: "#8B5CF6" },
  specifique: { label: "Spécifique", color: "#F97316" },
  affutage: { label: "Affûtage", color: "#EC4899" },
  recuperation: { label: "Récupération", color: "#10B981" },
  libre: { label: "Libre", color: "#64748B" },
};

export const WEEK_TYPE_OPTIONS = ["—", "Charge", "Décharge / Récupération", "Test", "Compétition", "Libre"];

export const DEFAULT_SPORTS: Sport[] = [
  { name: "Course à pied", color: "#2563EB" },
  { name: "Trail", color: "#F97316" },
  { name: "Vélo", color: "#0EA5E9" },
  { name: "Natation", color: "#06B6D4" },
  { name: "Musculation", color: "#8B5CF6" },
  { name: "Autre", color: "#64748B" },
];

export const PALETTE = [
  "#2563EB",
  "#0EA5E9",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#64748B",
];

export const TYPE_PALETTE = [
  "#2563EB",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#0EA5E9",
  "#F97316",
  "#EC4899",
];

export const DEFAULT_SESSION_TYPES = ["Endurance", "Sortie longue", "VMA", "Seuil", "Dénivelé"];

export const CMP_METRICS: Record<string, string> = {
  km: "Kilométrage",
  deniv: "Dénivelé",
  duree: "Durée (h)",
  charge: "Charge",
  rpe: "RPE moyen",
  plaisir: "Plaisir moyen",
};

export const ZONE_PCT: [number, number][] = [
  [50, 60],
  [60, 70],
  [70, 80],
  [80, 90],
  [90, 100],
];

export const VMA_PCTS = [70, 80, 90, 100, 110];

export const SPORT_FIELD_DEFS: Record<string, SportField[]> = {
  "Course à pied": [
    { key: "distance", label: "Distance", unit: "km" },
    { key: "elevation", label: "Dénivelé D+", unit: "m" },
    { key: "paceAvg", label: "Allure moyenne", unit: "min/km", type: "text" },
  ],
  "Trail": [
    { key: "distance", label: "Distance", unit: "km" },
    { key: "elevation", label: "Dénivelé D+", unit: "m" },
    { key: "paceAvg", label: "Allure moyenne", unit: "min/km", type: "text" },
  ],
  "Vélo": [
    { key: "distance", label: "Distance", unit: "km" },
    { key: "elevation", label: "Dénivelé D+", unit: "m" },
    { key: "speedAvg", label: "Vitesse moyenne", unit: "km/h" },
    { key: "powerAvg", label: "Puissance moyenne", unit: "W" },
  ],
  "Natation": [
    { key: "distance", label: "Distance", unit: "m" },
    { key: "lengths", label: "Nombre de longueurs", unit: "" },
    { key: "paceAvg", label: "Allure moyenne", unit: "/100m", type: "text" },
  ],
  "Musculation": [
    { key: "sets", label: "Séries", unit: "" },
    { key: "reps", label: "Répétitions", unit: "" },
    { key: "load", label: "Charge soulevée", unit: "kg" },
  ],
};

export const DEFAULT_SPORT_FIELDS: SportField[] = [
  { key: "distance", label: "Distance", unit: "km" },
  { key: "elevation", label: "Dénivelé D+", unit: "m" },
];

export const STORAGE_KEY = "plans-app-data";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function defaultProfile(): Profile {
  return {
    firstName: "",
    lastName: "",
    age: null,
    height: null,
    weight: null,
    vma: null,
    hrMax: null,
    hrRest: null,
    zones: [],
    weeklyTargetHours: null,
    weeklyTargetKm: null,
  };
}

export function defaultState(): AppState {
  return {
    profile: defaultProfile(),
    sports: DEFAULT_SPORTS.map((s) => ({ ...s })),
    sessionTypes: DEFAULT_SESSION_TYPES.slice(),
    cycleNames: [],
    season: { start: null, end: null },
    cycles: [],
    subcycles: [],
    subsubcycles: [],
    seasonGoals: [],
    weekTypes: {},
    weekObjectives: {},
    sessionTemplates: [],
    sportGroups: [],
    sessions: [],
  };
}