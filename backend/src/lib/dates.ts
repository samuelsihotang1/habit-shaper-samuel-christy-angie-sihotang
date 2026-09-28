/*
 * Calendar days, with no time and no zone: `YYYY-MM-DD` strings on the wire and
 * in the streak code, and day numbers (days since 1970-01-01) for arithmetic.
 * The one place a zone enters is `todayIn`: "today" is the user's date, never
 * the server's (docs/architecture/habits.md).
 */

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The date it is now in `zone`. en-CA formats as YYYY-MM-DD. */
export function todayIn(zone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** A real calendar day: rejects 2026-02-30, which `Date` would roll into March. */
export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  return fromDayNumber(toDayNumber(value)) === value;
}

export const toDayNumber = (day: string): number => Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

export const fromDayNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (day: string, days: number): string => fromDayNumber(toDayNumber(day) + days);

export const daysBetween = (from: string, to: string): number => toDayNumber(to) - toDayNumber(from);

/** The Monday of the ISO week `day` falls in. */
export function weekStart(day: string): string {
  const n = toDayNumber(day);
  const weekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  return fromDayNumber(n - weekday);
}
