export type HabitType = 'build' | 'break';

export interface WeekSummary {
  week_start: string;
  days: number;
  done: number;
  missed: number;
  rate: number | null;
}

export interface HabitStats {
  /** Build: consecutive done days. Break: clean days since the last relapse. */
  current_streak: number;
  longest_streak: number;
  /** Build: days done. Break: relapses. */
  total_logs: number;
  last_logged: string | null;
}

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  icon: string;
  started_on: string;
  created_at: string;
  /** Every logged day, oldest first: done days for build, relapses for break. */
  logs: string[];
  stats: HabitStats;
  /** Build only: the last 8 ISO weeks, newest first. */
  weeks: WeekSummary[];
}

export interface HabitInput {
  name: string;
  type: HabitType;
  icon: string;
  started_on: string;
}

export interface Goal {
  id: string;
  title: string;
  target_days: number | null;
  notes: string | null;
  created_at: string;
  habit: Pick<Habit, 'id' | 'name' | 'type' | 'icon'> & { current_streak: number; longest_streak: number };
  progress: { days: number; ratio: number | null; achieved: boolean };
}

export interface GoalInput {
  habit_id: string;
  title: string;
  target_days: number | null;
  notes: string | null;
}

export type StatsPeriod = 'week' | 'month' | 'year';

export interface StatsCounts {
  /** Build habits: habit-days that counted, done, missed; rate is done ÷ days, null when nothing counted yet. */
  days: number;
  done: number;
  missed: number;
  rate: number | null;
  /** Break habits: relapses logged. */
  relapses: number;
}

export interface Stats {
  period: StatsPeriod;
  /** Week: the last 7 days by day. Month: the last 30 days by day. Year: the last 12 months by month. Oldest first. */
  buckets: (StatsCounts & { start: string; end: string })[];
  total: StatsCounts;
  build_habits: number;
  break_habits: number;
}
