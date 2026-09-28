import { api } from '@/services/api';
import type { Habit, HabitInput } from '@/types/habits';
import { timeZone } from '@/utils/dates';

/** Every habit request carries the browser's zone: the server computes "today" in it. */
const tz = () => `tz=${encodeURIComponent(timeZone())}`;

/** Also the SWR keys (hooks/useHabits.ts): the zone is part of the key, as it is part of the answer. */
export const habitsPath = () => `/habits?${tz()}`;

export const habitPath = (id: string) => `/habits/${encodeURIComponent(id)}?${tz()}`;

export const createHabit = (input: HabitInput) => api.post<Habit>(habitsPath(), input);

export const updateHabit = (id: string, input: Omit<HabitInput, 'type'>) => api.put<Habit>(habitPath(id), input);

export const deleteHabit = (id: string) => api.delete<null>(`/habits/${encodeURIComponent(id)}`);

/** Build: marks the day done. Break: logs a relapse on it. `false` clears it. */
export const setLog = (id: string, day: string, logged: boolean) => {
  const path = `/habits/${encodeURIComponent(id)}/logs/${day}?${tz()}`;
  return logged ? api.put<Habit>(path) : api.delete<Habit>(path);
};
