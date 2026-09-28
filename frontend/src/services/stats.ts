import type { StatsPeriod } from '@/types/habits';
import { timeZone } from '@/utils/dates';

/** The SWR key (hooks/useStats.ts). Sends the zone like every habit request: the buckets end on the browser's today. */
export const statsPath = (period: StatsPeriod) => `/stats?period=${period}&tz=${encodeURIComponent(timeZone())}`;
