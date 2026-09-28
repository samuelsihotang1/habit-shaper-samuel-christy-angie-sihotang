import type { Database } from '@/db.ts';
import { HabitNotFound, NotFound } from '@/lib/errors.ts';
import { createGoalRepository, type Goal, type GoalFields } from '@/modules/goals/repository.ts';
import { createHabitRepository } from '@/modules/habits/repository.ts';
import { viewOf, type HabitView } from '@/modules/habits/service.ts';

export interface GoalInput {
  habit_id: string;
  title: string;
  target_days?: number | null;
  notes?: string | null;
}

export interface GoalView {
  goal: Goal;
  habit: HabitView;
}

export class GoalService {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get goals() {
    return createGoalRepository(this.db);
  }

  async list(userId: string, today: string): Promise<GoalView[]> {
    return this.withHabits(userId, await this.goals.listActive(userId), today);
  }

  async create(userId: string, input: GoalInput, today: string): Promise<GoalView> {
    await this.assertHabit(userId, input.habit_id);
    const id = await this.goals.insert(userId, fields(input));
    return this.one(userId, id, today);
  }

  async update(userId: string, id: string, input: GoalInput, today: string): Promise<GoalView> {
    await this.assertHabit(userId, input.habit_id);
    if ((await this.goals.update(userId, id, fields(input))) === 0) throw new NotFound();
    return this.one(userId, id, today);
  }

  async remove(userId: string, id: string): Promise<void> {
    if ((await this.goals.remove(userId, id)) === 0) throw new NotFound();
  }

  private async one(userId: string, id: string, today: string): Promise<GoalView> {
    const goal = await this.goals.one(userId, id);
    if (!goal) throw new NotFound();
    return (await this.withHabits(userId, [goal], today))[0]!;
  }

  /** Each goal with its habit, the habits loaded in one query. */
  private async withHabits(userId: string, goals: Goal[], today: string): Promise<GoalView[]> {
    const habits = await createHabitRepository(this.db).byIds(userId, [...new Set(goals.map((goal) => goal.habitId))]);
    const byId = new Map(habits.map((habit) => [habit.id, viewOf(habit, today)]));
    return goals.map((goal) => ({ goal, habit: byId.get(goal.habitId)! }));
  }

  /** A stranger's habit and a missing one get the same answer (RULES.md §1.2). */
  private async assertHabit(userId: string, habitId: string): Promise<void> {
    if (!(await createHabitRepository(this.db).activeOne(userId, habitId))) {
      throw new HabitNotFound();
    }
  }
}

function fields(input: GoalInput): GoalFields {
  return {
    habitId: input.habit_id,
    title: input.title,
    targetDays: input.target_days ?? null,
    notes: input.notes ? input.notes : null,
  };
}
