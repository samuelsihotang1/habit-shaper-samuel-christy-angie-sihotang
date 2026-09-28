import { addDays, daysBetween, fromDayNumber, toDayNumber, weekStart } from '@/lib/dates.ts';

/*
 * Streaks are computed from the log on every read, never stored
 * (docs/architecture/habits.md). Every input is a `YYYY-MM-DD` day; `logged`
 * may be unsorted and hold days outside [startedOn, today], which are ignored.
 */

export interface WeekSummary {
  week_start: string;
  /** Days of this week that count: on or after the start day, before today, and today once it is done. */
  days: number;
  done: number;
  missed: number;
  /** done ÷ days, 0–1; null when no day of the week counts yet. */
  rate: number | null;
}

function inRange(logged: string[], startedOn: string, today: string): Set<number> {
  const from = toDayNumber(startedOn);
  const to = toDayNumber(today);
  return new Set(logged.map(toDayNumber).filter((n) => n >= from && n <= to));
}

/** Consecutive done days ending today, or ending yesterday while today is still open. */
export function buildStreak(logged: string[], startedOn: string, today: string): number {
  const days = inRange(logged, startedOn, today);
  let cursor = toDayNumber(today);
  if (!days.has(cursor)) cursor -= 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function longestBuildStreak(logged: string[], startedOn: string, today: string): number {
  const days = [...inRange(logged, startedOn, today)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1]! + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/**
 * Day 1, 2, 3 … since the day after the last relapse, or since the start day.
 * Today counts as a clean day until a relapse is logged on it, which makes it 0.
 */
export function cleanStreak(relapses: string[], startedOn: string, today: string): number {
  const days = [...inRange(relapses, startedOn, today)];
  if (days.length === 0) return daysBetween(startedOn, today) + 1;
  const last = Math.max(...days);
  return toDayNumber(today) - last;
}

export function longestCleanStreak(relapses: string[], startedOn: string, today: string): number {
  const days = [...inRange(relapses, startedOn, today)].sort((a, b) => a - b);
  let best = 0;
  let from = toDayNumber(startedOn);
  for (const relapse of days) {
    best = Math.max(best, relapse - from);
    from = relapse + 1;
  }
  return Math.max(best, toDayNumber(today) - from + 1);
}

/** Done and counted days of one build habit between `from` and `to`, both inclusive. */
export interface SpanCount {
  /** Days that count: on or after the start day, before today, and today once it is done. */
  days: number;
  done: number;
}

/**
 * Today is still open, as in `buildStreak`: it counts once it is done and is
 * never a missed day. Days before `startedOn` or after today never count.
 */
export function countSpan(logged: string[], startedOn: string, today: string, from: string, to: string): SpanCount {
  const days = inRange(logged, startedOn, today);
  const last = toDayNumber(today);
  const first = Math.max(toDayNumber(from), toDayNumber(startedOn));
  const end = Math.min(toDayNumber(to), days.has(last) ? last : last - 1);
  let done = 0;
  for (let n = first; n <= end; n += 1) if (days.has(n)) done += 1;
  return { days: Math.max(0, end - first + 1), done };
}

/** Days of `logged` between `from` and `to`, both inclusive: a break habit's relapses in a span. */
export function loggedIn(logged: string[], startedOn: string, today: string, from: string, to: string): number {
  const lo = Math.max(toDayNumber(from), toDayNumber(startedOn));
  const hi = Math.min(toDayNumber(to), toDayNumber(today));
  return [...inRange(logged, startedOn, today)].filter((n) => n >= lo && n <= hi).length;
}

/** ISO weeks (Monday–Sunday) from the one holding `today` back to the one holding `startedOn`, newest first, at most `limit`. */
export function weeklySummary(logged: string[], startedOn: string, today: string, limit = 8): WeekSummary[] {
  const first = toDayNumber(weekStart(startedOn));
  const weeks: WeekSummary[] = [];
  for (let start = weekStart(today); weeks.length < limit && toDayNumber(start) >= first; start = addDays(start, -7)) {
    const { days, done } = countSpan(logged, startedOn, today, start, fromDayNumber(toDayNumber(start) + 6));
    weeks.push({ week_start: start, days, done, missed: days - done, rate: days === 0 ? null : done / days });
  }
  return weeks;
}
