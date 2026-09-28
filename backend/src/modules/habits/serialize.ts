import type { HabitView } from '@/modules/habits/service.ts';

/** The only shape a habit leaves the API in. */
export function serializeHabit({ habit, days, stats, weeks }: HabitView) {
  return {
    id: habit.id,
    name: habit.name,
    type: habit.type,
    icon: habit.icon,
    started_on: habit.startedOn,
    created_at: habit.createdAt.toISOString(),
    logs: days,
    stats,
    weeks,
  };
}

/** The short form a goal embeds. */
export function serializeHabitSummary({ habit, stats }: HabitView) {
  return {
    id: habit.id,
    name: habit.name,
    type: habit.type,
    icon: habit.icon,
    current_streak: stats.current_streak,
    longest_streak: stats.longest_streak,
  };
}
