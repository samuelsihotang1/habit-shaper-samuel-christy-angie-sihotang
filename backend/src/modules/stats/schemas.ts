import { Type } from 'typebox';
import { TzQuery } from '@/modules/habits/schemas.ts';

export const PERIODS = ['week', 'month', 'year'] as const;
export type Period = (typeof PERIODS)[number];

const PeriodSchema = Type.Enum(PERIODS);

// Required, with a default: Ajv fills a missing key from `default` before it checks `required`.
export const StatsQuery = Type.Object({
  tz: TzQuery.properties.tz,
  period: Type.Enum(PERIODS, { default: 'week', errorMessage: 'Choose week, month or year.' }),
});

const Counts = {
  /** Build habits: habit-days that count, done, missed; rate is done ÷ days, null when nothing counts yet. */
  days: Type.Integer(),
  done: Type.Integer(),
  missed: Type.Integer(),
  rate: Type.Union([Type.Number(), Type.Null()]),
  /** Break habits: relapses logged. */
  relapses: Type.Integer(),
};

/** What `serializeStats` sends. */
export const StatsSchema = Type.Object({
  period: PeriodSchema,
  buckets: Type.Array(Type.Object({ start: Type.String(), end: Type.String(), ...Counts })),
  total: Type.Object(Counts),
  build_habits: Type.Integer(),
  break_habits: Type.Integer(),
});
