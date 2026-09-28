import { transaction, type Database } from '@/db.ts';
import { DateOutOfRange, NotFound, StartInFuture } from '@/lib/errors.ts';
import { buildStreak, cleanStreak, longestBuildStreak, longestCleanStreak, weeklySummary, type WeekSummary } from '@/lib/streaks.ts';
import { createGoalRepository } from '@/modules/goals/repository.ts';
import { createHabitRepository, type Habit, type HabitType, type HabitWithDays } from '@/modules/habits/repository.ts';

export interface HabitStats {
  /** Build: consecutive done days. Break: clean days since the last relapse. */
  current_streak: number;
  longest_streak: number;
  /** Build: days done. Break: relapses. */
  total_logs: number;
  last_logged: string | null;
}

export interface HabitView {
  habit: Habit;
  /** Every logged day, oldest first. */
  days: string[];
  stats: HabitStats;
  /** Build habits only: the last 8 ISO weeks, newest first. Empty for break habits. */
  weeks: WeekSummary[];
}

export function viewOf({ days, ...habit }: HabitWithDays, today: string): HabitView {
  const start = habit.startedOn;
  const build = habit.type === 'build';
  return {
    habit,
    days,
    stats: {
      current_streak: build ? buildStreak(days, start, today) : cleanStreak(days, start, today),
      longest_streak: build ? longestBuildStreak(days, start, today) : longestCleanStreak(days, start, today),
      total_logs: days.length,
      last_logged: days.at(-1) ?? null,
    },
    weeks: build ? weeklySummary(days, start, today) : [],
  };
}

export class HabitService {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get habits() {
    return createHabitRepository(this.db);
  }

  async list(userId: string, today: string): Promise<HabitView[]> {
    return (await this.habits.listActive(userId)).map((habit) => viewOf(habit, today));
  }

  async get(userId: string, id: string, today: string): Promise<HabitView> {
    const habit = await this.habits.activeOne(userId, id);
    if (!habit) throw new NotFound();
    return viewOf(habit, today);
  }

  async create(
    userId: string,
    input: { name: string; type: HabitType; icon: string; started_on?: string },
    today: string,
  ): Promise<HabitView> {
    const startedOn = input.started_on ?? today;
    if (startedOn > today) throw new StartInFuture();
    const id = await this.habits.insert(userId, { name: input.name, type: input.type, icon: input.icon, startedOn });
    return this.get(userId, id, today);
  }

  async update(userId: string, id: string, input: { name: string; icon: string; started_on: string }, today: string): Promise<HabitView> {
    if (input.started_on > today) throw new StartInFuture();
    const changed = await this.habits.update(userId, id, { name: input.name, icon: input.icon, startedOn: input.started_on });
    if (changed === 0) throw new NotFound();
    return this.get(userId, id, today);
  }

  /** Archives the habit and its goals; the log stays (docs/architecture/habits.md). */
  async archive(userId: string, id: string): Promise<void> {
    const now = new Date();
    const archived = await transaction(this.db, async (tx) => {
      const count = await createHabitRepository(tx).archive(userId, id, now);
      await createGoalRepository(tx).archiveOfHabit(userId, id, now);
      return count;
    });
    if (archived === 0) throw new NotFound();
  }

  /** Marks (`logged`) or clears one day. Idempotent both ways. */
  async setLog(userId: string, id: string, day: string, logged: boolean, today: string): Promise<HabitView> {
    const habit = await this.habits.activeOne(userId, id);
    if (!habit) throw new NotFound();
    if (day < habit.startedOn || day > today) {
      throw new DateOutOfRange();
    }

    if (logged) await this.habits.addLog(habit.id, day);
    else await this.habits.removeLog(habit.id, day);
    return this.get(userId, id, today);
  }
}
