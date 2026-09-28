/*
 * Calendar days as `YYYY-MM-DD`, the same shape the API uses. "Today" is this
 * browser's date; every habit request also sends the zone (`?tz=`) so the
 * server agrees on it (docs/architecture/habits.md).
 */

const DAY_MS = 86_400_000;

// Building an Intl.DateTimeFormat costs far more than formatting with one, and a
// calendar or a month of statistics formats hundreds of days per render.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, cached);
  }
  return cached;
}

export const timeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** en-CA formats as YYYY-MM-DD. */
export const today = (now: Date = new Date()): string =>
  formatter('en-CA', { timeZone: timeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const toNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
const fromNumber = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (day: string, days: number): string => fromNumber(toNumber(day) + days);

export const daysBetween = (from: string, to: string): number => toNumber(to) - toNumber(from);

/** The Monday of the ISO week `day` falls in. */
export function weekStart(day: string): string {
  const n = toNumber(day);
  return fromNumber(n - ((new Date(n * DAY_MS).getUTCDay() + 6) % 7));
}

/** Monday to Sunday of the week holding `day`. */
export const weekOf = (day: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i));

/** Formats a calendar day without letting the browser's zone shift it. */
export const formatDay = (day: string, options: Intl.DateTimeFormatOptions): string =>
  formatter('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));

export const firstOfMonth = (day: string): string => `${day.slice(0, 7)}-01`;

export function addMonths(day: string, months: number): string {
  const date = new Date(`${firstOfMonth(day)}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** The days of `day`'s month, padded with nulls so the grid starts on a Monday. */
export function monthGrid(day: string): (string | null)[] {
  const first = firstOfMonth(day);
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const length = daysBetween(first, addMonths(first, 1));
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length }, (_, i) => addDays(first, i))];
}
