import { randomUUID } from 'node:crypto';
import { first, run, select, type Db } from '@/db.ts';

export interface Goal {
  id: string;
  userId: string;
  habitId: string;
  title: string;
  targetDays: number | null;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalFields = Pick<Goal, 'habitId' | 'title' | 'targetDays' | 'notes'>;

const GOAL_COLUMNS = `id, user_id AS userId, habit_id AS habitId, title, target_days AS targetDays, notes,
  archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt`;

export function createGoalRepository(db: Db) {
  return {
    listActive: (userId: string) =>
      select<Goal>(db, `SELECT ${GOAL_COLUMNS} FROM goals WHERE user_id = ? AND archived_at IS NULL ORDER BY created_at, id`, [userId]),

    one: (userId: string, id: string) => first<Goal>(db, `SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ? AND user_id = ?`, [id, userId]),

    async insert(userId: string, fields: GoalFields): Promise<string> {
      const id = randomUUID();
      const now = new Date();
      await run(
        db,
        'INSERT INTO goals (id, user_id, habit_id, title, target_days, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, fields.habitId, fields.title, fields.targetDays, fields.notes, now, now],
      );
      return id;
    },

    /** Answers how many rows it changed: 0 for a stranger's, archived or missing goal. */
    update: (userId: string, id: string, fields: GoalFields) =>
      run(
        db,
        'UPDATE goals SET habit_id = ?, title = ?, target_days = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ? AND archived_at IS NULL',
        [fields.habitId, fields.title, fields.targetDays, fields.notes, new Date(), id, userId],
      ),

    remove: (userId: string, id: string) => run(db, 'DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]),

    archiveOfHabit: (userId: string, habitId: string, at: Date) =>
      run(db, 'UPDATE goals SET archived_at = ?, updated_at = ? WHERE habit_id = ? AND user_id = ? AND archived_at IS NULL', [at, at, habitId, userId]),
  };
}
