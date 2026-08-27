/**
 * Aggregation & reporting logic, ported from app.js: KPIs, per-sport counters,
 * weekly aggregates, objective resolution and shared lookup helpers.
 * Pure — takes state/sessions explicitly and never touches the DOM.
 */

import {
  CYCLE_TYPES,
  PALETTE,
  TYPE_PALETTE,
  type Cycle,
  type Session,
  type SportGroup,
  type SubCycle,
  type SubSubCycle,
  type AppState,
} from "./model";

import { inRange, isoDate, parseISO, todayISO, getMonday } from "./dates";
import { isSwim } from "./intensity";

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function sportColor(name: string, sports: AppState["sports"]): string {
  const s = sports.find((x) => x.name === name);
  return s ? s.color : PALETTE[0]!;
}

export function cycleColor(c: Cycle): string {
  return c.color ? c.color : CYCLE_TYPES[c.type].color;
}

/** Display label for a cycle (custom label for "libre", else the type name). */
export function cycleLabel(c: Cycle): string {
  return c.type === "libre" && c.label ? c.label : CYCLE_TYPES[c.type].label;
}

export function activeCycleForDate(dateISO: string, state: Pick<AppState, "cycles">): Cycle | undefined {
  return state.cycles.find((c) => dateISO >= c.start && dateISO <= c.end);
}

export function activeSubForDate(
  dateISO: string,
  state: Pick<AppState, "subcycles">,
): SubCycle | undefined {
  return state.subcycles.find((c) => dateISO >= c.start && dateISO <= c.end);
}

export function activeSubSubForDate(
  dateISO: string,
  state: Pick<AppState, "subsubcycles">,
): SubSubCycle | undefined {
  return state.subsubcycles.find((c) => dateISO >= c.start && dateISO <= c.end);
}

/** Stable color derived from an arbitrary string (session type). */
export function typeColor(type: string): string {
  let h = 0;
  for (let i = 0; i < type.length; i++) {
    h = (h << 5) - h + type.charCodeAt(i);
    h |= 0;
  }
  return TYPE_PALETTE[Math.abs(h) % TYPE_PALETTE.length]!;
}

export function sportUnit(name: string): string {
  return isSwim(name) ? "m" : "km";
}

export function sportDistance(s: Session): number {
  return s.actual?.distance || 0;
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export type Objective = { text: string; source: string | null };

/** Resolve the week objective: sub-sub-cycle → sub-cycle → ad-hoc week object. */
export function weekObjectiveFor(
  mondayISO: string,
  state: AppState,
): Objective | null {
  const ss = state.subsubcycles.find(
    (x) => mondayISO >= x.start && mondayISO <= x.end && x.objective,
  );
  if (ss) return { text: ss.objective!, source: ss.name };
  const sub = state.subcycles.find(
    (x) => mondayISO >= x.start && mondayISO <= x.end && x.objective,
  );
  if (sub) return { text: sub.objective!, source: sub.name };
  if (state.weekObjectives[mondayISO])
    return { text: state.weekObjectives[mondayISO], source: null };
  return null;
}

/** The numeric (km) objective for a week, if any. */
export function weekObjectiveKm(mondayISO: string, state: AppState): number {
  const ss = state.subsubcycles.find(
    (x) => mondayISO >= x.start && mondayISO <= x.end && x.objectiveKm,
  );
  if (ss) return +ss.objectiveKm!;
  const sub = state.subcycles.find(
    (x) => mondayISO >= x.start && mondayISO <= x.end && x.objectiveKm,
  );
  if (sub) return +sub.objectiveKm!;
  const obj = weekObjectiveFor(mondayISO, state);
  if (obj) {
    const m = String(obj.text).match(/(\d+(?:[.,]\d+)?)\s*km/i);
    if (m) return +m[1]!.replace(",", ".");
  }
  return state.profile.weeklyTargetKm ? +state.profile.weeklyTargetKm : 0;
}

// ---------------------------------------------------------------------------
// Dashboard KPIs & sport counters
// ---------------------------------------------------------------------------

export type KpiCard = {
  label: string;
  value: string;
  unit: string;
  pct?: number;
};

export function computeKPIs(days: Date[], sessions: Session[]): { cards: KpiCard[]; label: string } {
  const d0 = days[0]!;
  const d1 = days[6]!;
  const weekSessions = sessions.filter((s) => inRange(s.date, d0, d1));
  const done = weekSessions.filter((s) => s.status === "done");
  const volumeH = done.reduce((a, s) => a + (s.actual?.duration || 0), 0) / 60;
  const ratio = weekSessions.length ? Math.round((done.length / weekSessions.length) * 100) : 0;

  const cards: KpiCard[] = [
    { label: "Volume horaire — semaine", value: volumeH.toFixed(1), unit: "h" },
    {
      label: "Séances réalisées",
      value: `${done.length} / ${weekSessions.length}`,
      unit: "",
      pct: ratio,
    },
    {
      label: "Sports pratiqués",
      value: String(new Set(done.map((s) => s.sport)).size),
      unit: "",
    },
    {
      label: "Charge cumulée",
      value: Math.round(done.reduce((a, s) => a + (s.actual?.charge || 0), 0)).toLocaleString("fr-FR"),
      unit: "",
    },
  ];

  const label = `${isoDate(d0)} — ${isoDate(d1)}`;
  return { cards, label };
}

export type SportCounter = {
  name: string;
  color: string;
  dist: number;
  unit: string;
  deniv: number;
  min: number;
  n: number;
  sub?: string | null;
};

/** Distance / D+ counters per sport, honouring user "sport groups". */
export function computeSportCounters(
  days: Date[],
  sessions: Session[],
  sports: AppState["sports"],
  sportGroups: SportGroup[],
): SportCounter[] {
  const d0 = days[0]!;
  const d1 = days[6]!;
  const done = sessions.filter((s) => s.status === "done" && inRange(s.date, d0, d1));

  const bySport: Record<string, { dist: number; deniv: number; min: number; n: number }> = {};
  done.forEach((s) => {
    const sp = s.sport || "Autre";
    if (!bySport[sp]) bySport[sp] = { dist: 0, deniv: 0, min: 0, n: 0 };
    bySport[sp]!.dist += sportDistance(s);
    bySport[sp]!.deniv += s.actual?.elevation || 0;
    bySport[sp]!.min += s.actual?.duration || 0;
    bySport[sp]!.n++;
  });

  const used: Record<string, boolean> = {};
  const cards: SportCounter[] = [];

  (sportGroups || []).forEach((g) => {
    const agg = { dist: 0, deniv: 0, min: 0, n: 0 };
    let any = false;
    (g.sports || []).forEach((sp) => {
      used[sp] = true;
      const d = bySport[sp];
      if (!d) return;
      any = true;
      agg.dist += d.dist;
      agg.deniv += d.deniv;
      agg.min += d.min;
      agg.n += d.n;
    });
    if (any) {
      const firstSport = g.sports?.[0] || "";
      cards.push({
        name: g.name,
        color: sportColor(firstSport, sports),
        dist: agg.dist,
        unit: (g.sports || []).every(isSwim) ? "m" : "km",
        deniv: agg.deniv,
        min: agg.min,
        n: agg.n,
        sub: (g.sports || []).join(" + "),
      });
    }
  });

  Object.keys(bySport).forEach((sp) => {
    if (used[sp]) return;
    const d = bySport[sp]!;
    cards.push({
      name: sp,
      color: sportColor(sp, sports),
      dist: d.dist,
      unit: sportUnit(sp),
      deniv: d.deniv,
      min: d.min,
      n: d.n,
      sub: null,
    });
  });

  return cards;
}

// ---------------------------------------------------------------------------
// Weekly aggregation (statistics view)
// ---------------------------------------------------------------------------

export type WeekAgg = {
  km: number;
  metres: number;
  deniv: number;
  duree: number;
  charge: number;
  rpe: number;
  plaisir: number;
  count: number;
};

export function weekAgg(
  weeks: { start: Date; end: Date }[],
  doneSessions: Session[],
): WeekAgg[] {
  return weeks.map((w) => {
    const inW = doneSessions.filter((s) => {
      const d = parseISO(s.date);
      return d >= w.start && d <= w.end;
    });
    const km = inW
      .filter((s) => !isSwim(s.sport))
      .reduce((a, s) => a + (s.actual?.distance || 0), 0);
    const metres = inW
      .filter((s) => isSwim(s.sport))
      .reduce((a, s) => a + (s.actual?.distance || 0), 0);
    const deniv = inW.reduce((a, s) => a + (s.actual?.elevation || 0), 0);
    const duree = inW.reduce((a, s) => a + (s.actual?.duration || 0), 0) / 60;
    const charge = inW.reduce((a, s) => a + (s.actual?.charge || 0), 0);
    const rpeVals = inW.map((s) => s.actual?.rpe).filter((v): v is number => !!v);
    const rpe = rpeVals.length ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : 0;
    const plaisirVals = inW.map((s) => s.actual?.plaisir).filter((v): v is number => !!v);
    const plaisir = plaisirVals.length
      ? +(plaisirVals.reduce((a, b) => a + b, 0) / plaisirVals.length).toFixed(1)
      : 0;
    return {
      km: +km.toFixed(1),
      metres: Math.round(metres),
      deniv: Math.round(deniv),
      duree: +duree.toFixed(2),
      charge: Math.round(charge),
      rpe: +rpe.toFixed(1),
      plaisir,
      count: inW.length,
    };
  });
}

/** Metric descriptor for a sport in the stats view. */
export function statsMetricFor(sportName: string): { key: string; label: string; unit: string; elev: boolean } {
  if (sportName === "all") return { key: "km", label: "Distance", unit: " km", elev: true };
  if (isSwim(sportName)) return { key: "metres", label: "Distance", unit: " m", elev: false };
  if (/muscu|renfo|gainage/i.test(sportName))
    return { key: "count", label: "Séances", unit: "", elev: false };
  return { key: "km", label: "Distance", unit: " km", elev: true };
}

export type PeriodSummary = {
  planned: number;
  done: number;
  hours: number;
  km: number;
  deniv: number;
};

/** Summary of planned/done sessions over [startISO, endISO]. */
export function periodSummary(startISO: string, endISO: string, sessions: Session[]): PeriodSummary {
  const d0 = parseISO(startISO);
  const d1 = parseISO(endISO);
  const list = sessions.filter((s) => inRange(s.date, d0, d1));
  const done = list.filter((s) => s.status === "done");
  return {
    planned: list.length,
    done: done.length,
    hours: done.reduce((a, s) => a + (s.actual?.duration || 0), 0) / 60,
    km: done.reduce((a, s) => a + (s.actual?.distance || 0), 0),
    deniv: done.reduce((a, s) => a + (s.actual?.elevation || 0), 0),
  };
}

// ---------------------------------------------------------------------------
// Week navigation (current week area)
// ---------------------------------------------------------------------------

export function currentWeek(offset: number, now = new Date()) {
  const monday = getMonday(now);
  monday.setDate(monday.getDate() + offset * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  const today = todayISO(now);
  const mondayISO = isoDate(days[0]!);
  const sundayISO = isoDate(days[6]!);
  const refDate = today >= mondayISO && today <= sundayISO ? today : mondayISO;
  return { days, mondayISO, sundayISO, refDate };
}