import type { Database } from '@/db.ts';
import { addDays, addMonths } from '@/lib/dates.ts';
import { countSpan, loggedIn } from '@/lib/streaks.ts';
import { createHabitRepository } from '@/modules/habits/repository.ts';
import type { Period } from '@/modules/stats/schemas.ts';

export interface Bucket {
  start: string;
  end: string;
  /** Build habits: habit-days that count, done, missed; rate is done ÷ days, null when nothing counts yet. */
  days: number;
  done: number;
  missed: number;
  rate: number | null;
  /** Break habits: relapses logged in the bucket. */
  relapses: number;
}

export interface StatsView {
  period: Period;
  buckets: Bucket[];
  total: Omit<Bucket, 'start' | 'end'>;
  build_habits: number;
  break_habits: number;
}

/** Week: the last 7 days by day. Month: the last 30 days by day. Year: the last 12 calendar months by month. Oldest first. */
export function bucketsOf(period: Period, today: string): { start: string; end: string }[] {
  if (period === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const start = addMonths(today, i - 11);
      return { start, end: addDays(addMonths(start, 1), -1) };
    });
  }
  const count = period === 'week' ? 7 : 30;
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i - count + 1);
    return { start: day, end: day };
  });
}

const rateOf = (days: number, done: number) => (days === 0 ? null : done / days);

export class StatsService {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /** Every active habit of the user, added up per bucket. */
  async summary(userId: string, period: Period, today: string): Promise<StatsView> {
    const habits = await createHabitRepository(this.db).listActive(userId);
    const all = habits.map((habit) => ({ type: habit.type, start: habit.startedOn, days: habit.days }));

    const buckets = bucketsOf(period, today).map(({ start, end }): Bucket => {
      let days = 0;
      let done = 0;
      let relapses = 0;
      for (const habit of all) {
        if (habit.type === 'build') {
          const span = countSpan(habit.days, habit.start, today, start, end);
          days += span.days;
          done += span.done;
        } else {
          relapses += loggedIn(habit.days, habit.start, today, start, end);
        }
      }
      return { start, end, days, done, missed: days - done, rate: rateOf(days, done), relapses };
    });

    const days = buckets.reduce((sum, bucket) => sum + bucket.days, 0);
    const done = buckets.reduce((sum, bucket) => sum + bucket.done, 0);
    return {
      period,
      buckets,
      total: {
        days,
        done,
        missed: days - done,
        rate: rateOf(days, done),
        relapses: buckets.reduce((sum, bucket) => sum + bucket.relapses, 0),
      },
      build_habits: all.filter((habit) => habit.type === 'build').length,
      break_habits: all.filter((habit) => habit.type === 'break').length,
    };
  }
}
