import type { Habit } from '@/types/habits';

// Keyed by the habit object: every answer from the API is a new object, so a
// check-in gets a fresh set and an unchanged habit keeps its own.
const logged = new WeakMap<Habit, Set<string>>();

/** A habit's logged days as a Set: cards and calendars ask it about each day, against up to a year of logs. */
export function loggedDays(habit: Habit): Set<string> {
  let days = logged.get(habit);
  if (!days) {
    days = new Set(habit.logs);
    logged.set(habit, days);
  }
  return days;
}
