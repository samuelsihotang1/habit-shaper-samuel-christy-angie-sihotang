import { serializeHabitSummary } from '@/modules/habits/serialize.ts';
import type { GoalView } from '@/modules/goals/service.ts';

/** Progress is the linked habit's current streak against `target_days`. */
export function serializeGoal({ goal, habit }: GoalView) {
  const streak = habit.stats.current_streak;
  const target = goal.targetDays;
  return {
    id: goal.id,
    title: goal.title,
    target_days: target,
    notes: goal.notes,
    created_at: goal.createdAt.toISOString(),
    habit: serializeHabitSummary(habit),
    progress: {
      days: streak,
      /** 0–1, capped; null for a goal without a target. */
      ratio: target ? Math.min(streak / target, 1) : null,
      achieved: target ? streak >= target : false,
    },
  };
}
