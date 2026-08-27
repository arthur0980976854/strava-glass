import { describe, it, expect } from "vitest";

import { defaultState, type AppState, type Session } from "./model";
import {
  isoDate,
  parseISO,
  fmtMin,
  fmtShort,
  getMonday,
  inRange,
  weeksBack,
  buildMonthDays,
  todayISO,
} from "./dates";
import { computeZones, bpmZone, vmaRows } from "./zones";
import { isSwim, isRunSport, sessionIntensityKm, intensityTotals } from "./intensity";
import { fmtPace, round1, paceFor } from "./pace";
import {
  weekObjectiveFor,
  weekObjectiveKm,
  computeKPIs,
  computeSportCounters,
  weekAgg,
  periodSummary,
  currentWeek,
  cycleLabel,
  sportColor,
  typeColor,
} from "./agg";

// ---------------------------------------------------------------------------
// dates
// ---------------------------------------------------------------------------

describe("dates", () => {
  it("isoDate formats local date as YYYY-MM-DD", () => {
    expect(isoDate(new Date(2025, 6, 5))).toBe("2025-07-05");
    expect(isoDate(new Date(2025, 0, 1))).toBe("2025-01-01");
  });

  it("parseISO parses back to local date", () => {
    const d = parseISO("2025-07-05");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(5);
  });

  it("fmtMin formats hours and minutes", () => {
    expect(fmtMin(185)).toBe("3h05");
    expect(fmtMin(45)).toBe("45 min");
    expect(fmtMin(0)).toBe("0 min");
  });

  it("fmtShort returns day + abbreviated month", () => {
    expect(fmtShort("2025-07-05")).toBe("5 juil.");
  });

  it("getMonday returns the Monday of the current week", () => {
    // 2025-07-02 is a Wednesday → Monday is 2025-06-30
    const monday = getMonday(new Date(2025, 6, 2));
    expect(isoDate(monday)).toBe("2025-06-30");
  });

  it("inRange honors inclusive boundaries", () => {
    const d0 = parseISO("2025-07-01");
    const d1 = parseISO("2025-07-07");
    expect(inRange("2025-07-01", d0, d1)).toBe(true);
    expect(inRange("2025-07-07", d0, d1)).toBe(true);
    expect(inRange("2025-07-08", d0, d1)).toBe(false);
  });

  it("weeksBack returns n consecutive Monday-based weeks", () => {
    const weeks = weeksBack(3, new Date(2025, 6, 2)); // Wednesday 2025-07-02
    expect(weeks).toHaveLength(3);
    expect(weeks[2]!.start.getDay()).toBe(1); // Monday
    // last week's Monday is the Monday of the current week
    expect(isoDate(weeks[2]!.start)).toBe("2025-06-30");
  });

  it("buildMonthDays returns 42 cells starting on a Monday", () => {
    const days = buildMonthDays(new Date(2025, 6, 1));
    expect(days).toHaveLength(42);
    expect(days[0]!.getDay()).toBe(1); // Monday
  });

  it("todayISO returns today's local date", () => {
    const now = new Date(2025, 6, 2);
    expect(todayISO(now)).toBe("2025-07-02");
  });
});

// ---------------------------------------------------------------------------
// zones / VMA
// ---------------------------------------------------------------------------

describe("zones", () => {
  it("computeZones derives zones from hrMax when custom zones absent", () => {
    const state = defaultState();
    state.profile.hrMax = 190;
    const zones = computeZones(state.profile);
    expect(zones).toHaveLength(5);
    expect(zones[0]).toEqual({ min: 95, max: 114 });
    expect(zones[4]).toEqual({ min: 171, max: 190 });
  });

  it("computeZones honours custom zones when 5 provided", () => {
    const state = defaultState();
    state.profile.zones = [
      { min: 100, max: 120 },
      { min: 120, max: 140 },
      { min: 140, max: 160 },
      { min: 160, max: 180 },
      { min: 180, max: 200 },
    ];
    expect(computeZones(state.profile)).toHaveLength(5);
    expect(computeZones(state.profile)[0]).toEqual({ min: 100, max: 120 });
  });

  it("bpmZone maps a heart rate to 1-based zone", () => {
    const state = defaultState();
    state.profile.hrMax = 190;
    expect(bpmZone(100, state.profile)).toBe(1);
    expect(bpmZone(150, state.profile)).toBe(3);
    expect(bpmZone(185, state.profile)).toBe(5);
    expect(bpmZone(null, state.profile)).toBeNull();
  });

  it("vmaRows computes speed and pace per km", () => {
    const rows = vmaRows(14);
    expect(rows).toHaveLength(5);
    expect(rows[0]!.pct).toBe(70);
    expect(rows[0]!.speedKmh).toBeCloseTo(9.8, 1);
  });
});

// ---------------------------------------------------------------------------
// intensity / pace
// ---------------------------------------------------------------------------

describe("intensity & pace", () => {
  it("classifies swim and run sports", () => {
    expect(isSwim("Natation")).toBe(true);
    expect(isSwim("Course à pied")).toBe(false);
    expect(isRunSport("Trail")).toBe(true);
    expect(isRunSport("Natation")).toBe(false);
  });

  it("sessionIntensityKm uses explicit segments when present", () => {
    const done: Session = {
      id: "1",
      date: "2025-07-02",
      sport: "Course à pied",
      status: "done",
      actual: {
        segments: [
          { name: "A", km: 4, intensity: "endurance" },
          { name: "B", km: 2, intensity: "vma" },
        ],
      },
    };
    expect(sessionIntensityKm(done)).toEqual({ endurance: 4, seuil: 0, vma: 2 });
  });

  it("sessionIntensityKm classifies by name heuristically otherwise", () => {
    const run: Session = {
      id: "2",
      date: "2025-07-02",
      sport: "Course à pied",
      sessionType: "VMA",
      status: "done",
      actual: { distance: 8 },
    };
    expect(sessionIntensityKm(run)).toEqual({ endurance: 0, seuil: 0, vma: 8 });

    const easy: Session = {
      id: "3",
      date: "2025-07-03",
      sport: "Course à pied",
      sessionType: "Endurance",
      status: "done",
      actual: { distance: 10 },
    };
    expect(sessionIntensityKm(easy)).toEqual({ endurance: 10, seuil: 0, vma: 0 });
  });

  it("intensityTotals sums across sessions", () => {
    const s1: Session = {
      id: "1",
      date: "2025-07-02",
      sport: "Course à pied",
      status: "done",
      actual: { segments: [{ name: "A", km: 4, intensity: "endurance" }] },
    };
    const s2: Session = {
      id: "2",
      date: "2025-07-03",
      sport: "Course à pied",
      sessionType: "Seuil",
      status: "done",
      actual: { distance: 6 },
    };
    expect(intensityTotals([s1, s2])).toEqual({ endurance: 4, seuil: 6, vma: 0 });
  });

  it("fmtPace formats min/km", () => {
    expect(fmtPace(6)).toBe("6'00\"");
    expect(fmtPace(4.5)).toBe("4'30\"");
  });

  it("round1 rounds to 1 decimal", () => {
    expect(round1(3.14159)).toBe(3.1);
  });

  it("paceFor computes run pace, bike speed and swim pacing", () => {
    // Run: 10 km in 60 min → 6'00" /km
    expect(paceFor("Course à pied", 60, 10)?.display).toBe(`6'00" /km`);
    // Bike: 20 km in 60 min → 20 km/h
    expect(paceFor("Vélo", 60, 20)?.display).toBe("20 km/h");
    // Swim: distance field is in metres — 1000 m in 30 min → 3'00" /100m
    expect(paceFor("Natation", 30, 1000)?.display).toBe(`3'00\" /100m`);
    // Missing distance → null
    expect(paceFor("Course à pied", 60, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// aggregations
// ---------------------------------------------------------------------------

function statesWithSession(session: Partial<Session>): AppState {
  const state = defaultState();
  state.sessions = [
    {
      id: "s1",
      date: "2025-07-02",
      sport: "Course à pied",
      sessionType: "Endurance",
      status: "done",
      actual: { duration: 60, distance: 10, charge: 50, rpe: 5, plaisir: 7, elevation: 100 },
      ...session,
    },
  ];
  return state;
}

describe("agg", () => {
  it("weekObjectiveFor resolves from sub-sub-cycle first", () => {
    const state = defaultState();
    state.subsubcycles.push({
      id: "ss",
      subId: "sub",
      name: "Bloc charge",
      start: "2025-06-30",
      end: "2025-07-06",
      objective: "60 km",
    });
    expect(weekObjectiveFor("2025-07-01", state)).toEqual({
      text: "60 km",
      source: "Bloc charge",
    });
  });

  it("weekObjectiveKm parses the km figure from an objective text", () => {
    const state = defaultState();
    state.subsubcycles.push({
      id: "ss",
      subId: "sub",
      name: "X",
      start: "2025-06-30",
      end: "2025-07-06",
      objective: "Essai 62km puis récup",
    });
    expect(weekObjectiveKm("2025-07-01", state)).toBe(62);
  });

  it("computeKPIs sums done sessions of the week", () => {
    const state = defaultState();
    state.sessions = [
      {
        id: "1",
        date: "2025-07-02",
        sport: "Course à pied",
        status: "done",
        actual: { duration: 90, charge: 60 },
      },
      {
        id: "2",
        date: "2025-07-03",
        sport: "Vélo",
        status: "done",
        actual: { duration: 30, charge: 20 },
      },
      {
        id: "3",
        date: "2025-07-04",
        sport: "Course à pied",
        status: "planned",
      },
    ];
    const { cards } = computeKPIs(weekDaysOf("2025-07-02"), state.sessions);
    const volume = cards.find((c) => c.label.includes("Volume"));
    expect(volume?.value).toBe("2.0");
    const done = cards.find((c) => c.label.includes("Séances"));
    expect(done?.value).toBe("2 / 3");
  });

  it("computeSportCounters aggregates per sport", () => {
    const state = defaultState();
    state.sessions = [
      { id: "1", date: "2025-07-02", sport: "Course à pied", status: "done", actual: { distance: 10, duration: 60, elevation: 120 } },
      { id: "2", date: "2025-07-03", sport: "Course à pied", status: "done", actual: { distance: 5, duration: 30 } },
    ];
    const counters = computeSportCounters(
      weekDaysOf("2025-07-02"),
      state.sessions,
      state.sports,
      [],
    );
    const run = counters.find((c) => c.name === "Course à pied");
    expect(run?.dist).toBe(15);
    expect(run?.n).toBe(2);
    expect(run?.deniv).toBe(120);
  });

  it("weekAgg computes per-week stats", () => {
    const weeks = [
      { start: parseISO("2025-06-30"), end: parseISO("2025-07-06") },
    ];
    const state = statesWithSession({
      sport: "Course à pied",
      actual: { duration: 60, distance: 10, elevation: 100, charge: 50, rpe: 6, plaisir: 7 },
    });
    const agg = weekAgg(weeks, state.sessions);
    expect(agg[0]!.km).toBe(10);
    expect(agg[0]!.duree).toBeCloseTo(1);
    expect(agg[0]!.rpe).toBe(6);
  });

  it("periodSummary tallies planned/done and volumes", () => {
    const state = defaultState();
    state.sessions = [
      { id: "1", date: "2025-07-02", sport: "Course à pied", status: "done", actual: { duration: 60, distance: 10, elevation: 100 } },
      { id: "2", date: "2025-07-03", sport: "Vélo", status: "planned" },
    ];
    const sum = periodSummary("2025-06-30", "2025-07-06", state.sessions);
    expect(sum.planned).toBe(2);
    expect(sum.done).toBe(1);
    expect(sum.hours).toBeCloseTo(1);
  });

  it("cycleLabel returns custom label for libre cycles", () => {
    expect(cycleLabel({ id: "1", type: "libre", label: "Stage alt.", start: "a", end: "b" })).toBe("Stage alt.");
    expect(cycleLabel({ id: "2", type: "base", start: "a", end: "b" })).toBe("Base");
  });

  it("sportColor falls back to the palette first color", () => {
    expect(sportColor("Volleyball", [{ name: "Course à pied", color: "#123456" }])).toBe("#2563EB");
    expect(sportColor("Course à pied", [{ name: "Course à pied", color: "#123456" }])).toBe("#123456");
  });

  it("typeColor is stable for the same input", () => {
    expect(typeColor("Seuil")).toBe(typeColor("Seuil"));
    expect(typeColor("VMA")).not.toBe(""); 
  });
});

function weekDaysOf(dateISO: string): Date[] {
  const monday = getMonday(parseISO(dateISO));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

describe("currentWeek", () => {
  it("resolves refDate to today within the week, else Monday", () => {
    const res = currentWeek(0, new Date(2025, 2, 5)); // Wednesday 2025-03-05
    expect(res.days).toHaveLength(7);
    // Wednesday 2025-03-05 is within its own week
    expect(res.refDate).toBe("2025-03-05");
  });
});