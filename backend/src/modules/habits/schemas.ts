import { Type } from 'typebox';
import { Body } from '@/modules/auth/schemas.ts';

/** The icons the SPA can draw (frontend/src/components/icons.tsx HABIT_ICONS). Keep the two lists equal. */
export const HABIT_ICONS = [
  'water', 'book', 'run', 'meditate', 'journal', 'sleep', 'heart', 'sun',
  'food', 'phone', 'smoke', 'coffee', 'star', 'leaf',
] as const;

/** A real calendar day, `YYYY-MM-DD` (the `iso-day` format in lib/validation.ts). */
const Day = (message: string) => Type.String({ format: 'iso-day', errorMessage: { type: message, format: message } });

const Name = Type.String({
  normalize: 'trim',
  minLength: 1,
  maxLength: 100,
  errorMessage: { type: 'Name your habit.', minLength: 'Name your habit.', maxLength: 'Use at most 100 characters.' },
});
const Icon = Type.Enum(HABIT_ICONS, { errorMessage: 'Choose an icon.' });
const HabitType = Type.Enum(['build', 'break'], { errorMessage: 'Choose build or break.' });

/** The browser's zone (`Intl…resolvedOptions().timeZone`); "today" is computed in it. */
export const TzQuery = Type.Object({
  tz: Type.String({ maxLength: 64, format: 'time-zone', default: 'UTC', errorMessage: 'Unknown time zone.' }),
});

export const LogParams = Type.Object({ id: Type.String({ maxLength: 36 }), date: Day('Use a date like 2026-09-28.') });

export const CreateHabitBody = Body(
  { name: Name, type: HabitType, icon: Icon, started_on: Type.Optional(Day('Choose a start date.')) },
  { name: 'Name your habit.', type: 'Choose build or break.', icon: 'Choose an icon.' },
);

// The type is fixed at creation: a log row means "done" for one type and "relapsed" for the other.
export const UpdateHabitBody = Body(
  { name: Name, icon: Icon, started_on: Day('Choose a start date.') },
  { name: 'Name your habit.', icon: 'Choose an icon.', started_on: 'Choose a start date.' },
);

const NullableNumber = Type.Union([Type.Number(), Type.Null()]);

export const WeekSchema = Type.Object({
  week_start: Type.String(),
  days: Type.Integer(),
  done: Type.Integer(),
  missed: Type.Integer(),
  rate: NullableNumber,
});

/** What `serializeHabit` sends. */
export const HabitSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  type: Type.Enum(['build', 'break']),
  icon: Type.String(),
  started_on: Type.String(),
  created_at: Type.String(),
  logs: Type.Array(Type.String()),
  stats: Type.Object({
    current_streak: Type.Integer(),
    longest_streak: Type.Integer(),
    total_logs: Type.Integer(),
    last_logged: Type.Union([Type.String(), Type.Null()]),
  }),
  weeks: Type.Array(WeekSchema),
});

/** What `serializeHabitSummary` sends, inside a goal. */
export const HabitSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  type: Type.Enum(['build', 'break']),
  icon: Type.String(),
  current_streak: Type.Integer(),
  longest_streak: Type.Integer(),
});
