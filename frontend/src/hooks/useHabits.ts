import { useMemo } from 'react';
import { upsert, useCache, useData, without } from '@/hooks/useData';
import { createHabit, deleteHabit, habitPath, habitsPath, setLog, updateHabit } from '@/services/habits';
import type { Habit, HabitInput } from '@/types/habits';

export const useHabits = () => useData<Habit[]>(habitsPath());

export const useHabit = (id: string) => useData<Habit>(habitPath(id));

/**
 * Every write answers with the habit as it now stands, streaks included, and
 * that answer replaces both cached copies. Goals and statistics count the
 * same logs, so they are fetched again rather than patched here.
 */
export function useHabitActions() {
  const { mutate, revalidate } = useCache();

  return useMemo(() => {
    const keep = (habit: Habit): Habit => {
      void mutate(habitPath(habit.id), habit, { revalidate: false });
      void mutate(habitsPath(), upsert(habit), { revalidate: false });
      revalidate('/goals', '/stats');
      return habit;
    };

    return {
      setLog: async (id: string, day: string, logged: boolean) => keep((await setLog(id, day, logged)).data),
      create: async (input: HabitInput) => keep((await createHabit(input)).data),
      update: async (id: string, input: Omit<HabitInput, 'type'>) => keep((await updateHabit(id, input)).data),
      async remove(id: string) {
        await deleteHabit(id);
        void mutate(habitsPath(), without<Habit>(id), { revalidate: false });
        // Left cached, Back would show the habit again: SWR keeps the old data beside the 404.
        void mutate(habitPath(id), undefined, { revalidate: false });
        revalidate('/goals', '/stats');
      },
    };
  }, [mutate, revalidate]);
}
