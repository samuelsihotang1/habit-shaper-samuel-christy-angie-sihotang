import { randomUUID } from 'node:crypto';
import { isDuplicate, run, select, type Db } from '@/db.ts';

export type HabitType = 'build' | 'break';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  type: HabitType;
  icon: string;
  /** `YYYY-MM-DD`. */
  startedOn: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A habit with every logged day, oldest first. */
export type HabitWithDays = Habit & { days: string[] };

const HABIT_COLUMNS = `id, user_id AS userId, name, type, icon, started_on AS startedOn,
  archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt`;

export function createHabitRepository(db: Db) {
  /** One query for the habits, one for all of their logs. */
  async function withDays(where: string, params: unknown[]): Promise<HabitWithDays[]> {
    const habits = await select<Habit>(db, `SELECT ${HABIT_COLUMNS} FROM habits WHERE ${where} ORDER BY created_at, id`, params);
    if (habits.length === 0) return [];
    const logs = await select<{ habitId: string; date: string }>(
      db,
      'SELECT habit_id AS habitId, date FROM habit_logs WHERE habit_id IN (?) ORDER BY date',
      [habits.map((habit) => habit.id)],
    );
    const days = new Map(habits.map((habit) => [habit.id, [] as string[]]));
    for (const log of logs) days.get(log.habitId)!.push(log.date);
    return habits.map((habit) => ({ ...habit, days: days.get(habit.id)! }));
  }

  return {
    listActive: (userId: string) => withDays('user_id = ? AND archived_at IS NULL', [userId]),

    async activeOne(userId: string, id: string): Promise<HabitWithDays | null> {
      return (await withDays('id = ? AND user_id = ? AND archived_at IS NULL', [id, userId]))[0] ?? null;
    },

    /** Archived or not: a goal still shows the habit it was linked to. */
    byIds: (userId: string, ids: string[]) => (ids.length === 0 ? Promise.resolve([]) : withDays('user_id = ? AND id IN (?)', [userId, ids])),

    async insert(userId: string, data: Pick<Habit, 'name' | 'type' | 'icon' | 'startedOn'>): Promise<string> {
      const id = randomUUID();
      const now = new Date();
      await run(db, 'INSERT INTO habits (id, user_id, name, type, icon, started_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
        id, userId, data.name, data.type, data.icon, data.startedOn, now, now,
      ]);
      return id;
    },

    /** Answers how many rows it changed: 0 for a stranger's, archived or missing habit. */
    update: (userId: string, id: string, data: Pick<Habit, 'name' | 'icon' | 'startedOn'>) =>
      run(db, 'UPDATE habits SET name = ?, icon = ?, started_on = ?, updated_at = ? WHERE id = ? AND user_id = ? AND archived_at IS NULL', [
        data.name, data.icon, data.startedOn, new Date(), id, userId,
      ]),

    archive: (userId: string, id: string, at: Date) =>
      run(db, 'UPDATE habits SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND archived_at IS NULL', [at, at, id, userId]),

    /** Idempotent: the unique (habit_id, date) index answers for the double click. */
    async addLog(habitId: string, day: string): Promise<void> {
      try {
        await run(db, 'INSERT INTO habit_logs (id, habit_id, date, created_at) VALUES (?, ?, ?, ?)', [randomUUID(), habitId, day, new Date()]);
      } catch (error) {
        if (!isDuplicate(error)) throw error;
      }
    },

    removeLog: (habitId: string, day: string) => run(db, 'DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', [habitId, day]),
  };
}
