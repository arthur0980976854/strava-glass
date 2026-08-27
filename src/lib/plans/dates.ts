/**
 * Pure date & time helpers, ported from public/plans/app.js.
 * All operate on local-time ISO dates ("YYYY-MM-DD") as the planner does.
 */

export const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export const MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export const MONTHS_FULL = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function parseISO(s: string): Date {
  const p = s.split("-");
  return new Date(+p[0]!, +p[1]! - 1, +p[2]!);
}

export function todayISO(now: Date = new Date()): string {
  return isoDate(now);
}

/** "17 janv." */
export function fmtShort(s: string): string {
  const d = parseISO(s);
  return d.getDate() + " " + MONTHS_FR[d.getMonth()];
}

/** Formats minutes as "3h05" or "45 min". */
export function fmtMin(min: number): string {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h${String(rem).padStart(2, "0")}` : `${rem} min`;
}

/** Monday of the week containing d, at 00:00 local. */
export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** The 7 dates of the week, offset by `offset` weeks from the current week. */
export function weekDays(offset = 0, now: Date = new Date()): Date[] {
  const monday = getMonday(now);
  monday.setDate(monday.getDate() + offset * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

/** True when an ISO date falls within the ISO range [d0, d1]. */
export function inRange(dateISO: string, d0: Date, d1: Date): boolean {
  const d = parseISO(dateISO);
  return d >= d0 && d <= d1;
}

export function sortDesc(a: { date: string }, b: { date: string }): number {
  return b.date.localeCompare(a.date);
}

export function sortAscBy(k: string) {
  return (a: Record<string, string>, b: Record<string, string>) =>
    a[k]!.localeCompare(b[k]!);
}

/** The last `n` weeks ending on the current (Monday-based) week. */
export function weeksBack(n: number, now: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
}[] {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const monday = getMonday(now);
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      start,
      end,
      label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    });
  }
  return weeks;
}

/** Consecutive Monday-based weeks covering [start, end] (falls back to last 4). */
export function weeksInRange(start: Date, end: Date): {
  start: Date;
  end: Date;
  label: string;
}[] {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const monday = getMonday(start);
  while (monday <= end) {
    const e = new Date(monday);
    e.setDate(e.getDate() + 6);
    weeks.push({
      start: new Date(monday),
      end: e,
      label: monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    });
    monday.setDate(monday.getDate() + 7);
  }
  return weeks.length ? weeks : weeksBack(4);
}

/**
 * Builds the 42 cells of a month calendar view: the grid always starts on the
 * Monday before (or on) the 1st of the month and spans 6 weeks.
 */
export function buildMonthDays(cursor: Date): Date[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}