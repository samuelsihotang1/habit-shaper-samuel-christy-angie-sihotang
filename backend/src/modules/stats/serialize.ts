import type { StatsView } from '@/modules/stats/service.ts';

/** The only shape statistics leave the API in. */
export function serializeStats({ period, buckets, total, build_habits, break_habits }: StatsView) {
  return {
    period,
    buckets: buckets.map(({ start, end, days, done, missed, rate, relapses }) => ({ start, end, days, done, missed, rate, relapses })),
    total: { days: total.days, done: total.done, missed: total.missed, rate: total.rate, relapses: total.relapses },
    build_habits,
    break_habits,
  };
}
