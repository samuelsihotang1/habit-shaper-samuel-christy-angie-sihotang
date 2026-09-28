import { Type } from 'typebox';
import { Body } from '@/modules/auth/schemas.ts';
import { HabitSummarySchema } from '@/modules/habits/schemas.ts';

export const GoalBody = Body(
  {
    habit_id: Type.String({ minLength: 1, maxLength: 36, errorMessage: 'Choose a habit.' }),
    title: Type.String({
      normalize: 'trim',
      minLength: 1,
      maxLength: 120,
      errorMessage: { type: 'Name your goal.', minLength: 'Name your goal.', maxLength: 'Use at most 120 characters.' },
    }),
    // `multipleOf: 1` rather than `integer`, so 2.5 and "ten" get different sentences.
    target_days: Type.Optional(
      Type.Unsafe<number | null>({
        type: ['number', 'null'],
        multipleOf: 1,
        minimum: 1,
        maximum: 3650,
        errorMessage: {
          type: 'Enter a number of days.',
          multipleOf: 'Enter a whole number of days.',
          minimum: 'Use at least 1 day.',
          maximum: 'Use at most 3650 days.',
        },
      }),
    ),
    notes: Type.Optional(
      Type.Unsafe<string | null>({
        type: ['string', 'null'],
        normalize: 'trim',
        maxLength: 500,
        errorMessage: { maxLength: 'Use at most 500 characters.' },
      }),
    ),
  },
  { habit_id: 'Choose a habit.', title: 'Name your goal.' },
);

/** What `serializeGoal` sends: progress is the linked habit's current streak against `target_days`. */
export const GoalSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  target_days: Type.Union([Type.Integer(), Type.Null()]),
  notes: Type.Union([Type.String(), Type.Null()]),
  created_at: Type.String(),
  habit: HabitSummarySchema,
  progress: Type.Object({
    days: Type.Integer(),
    ratio: Type.Union([Type.Number(), Type.Null()]),
    achieved: Type.Boolean(),
  }),
});
