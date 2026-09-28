import { useMemo } from 'react';
import { upsert, useCache, useData, without } from '@/hooks/useData';
import { createGoal, deleteGoal, goalsPath, updateGoal } from '@/services/goals';
import type { Goal, GoalInput } from '@/types/habits';

export const useGoals = () => useData<Goal[]>(goalsPath());

/** Each write patches the cached list with the goal the API answered. */
export function useGoalActions() {
  const { mutate } = useCache();

  return useMemo(() => {
    const keep = (goal: Goal): Goal => {
      void mutate(goalsPath(), upsert(goal), { revalidate: false });
      return goal;
    };

    return {
      create: async (input: GoalInput) => keep((await createGoal(input)).data),
      update: async (id: string, input: GoalInput) => keep((await updateGoal(id, input)).data),
      async remove(id: string) {
        await deleteGoal(id);
        void mutate(goalsPath(), without<Goal>(id), { revalidate: false });
      },
    };
  }, [mutate]);
}
