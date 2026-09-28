import { useData } from '@/hooks/useData';
import { statsPath } from '@/services/stats';
import type { Stats, StatsPeriod } from '@/types/habits';

/** Until a new period answers, `data` is still the last one: the page dims it rather than blanking the charts. */
export const useStats = (period: StatsPeriod) => useData<Stats>(statsPath(period), { keepPreviousData: true });
