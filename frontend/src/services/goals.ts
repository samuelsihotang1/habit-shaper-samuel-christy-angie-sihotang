import { api } from '@/services/api';
import type { Goal, GoalInput } from '@/types/habits';
import { timeZone } from '@/utils/dates';

const tz = () => `tz=${encodeURIComponent(timeZone())}`;

/** Also the SWR key (hooks/useGoals.ts). */
export const goalsPath = () => `/goals?${tz()}`;

export const createGoal = (input: GoalInput) => api.post<Goal>(goalsPath(), input);

export const updateGoal = (id: string, input: GoalInput) => api.put<Goal>(`/goals/${encodeURIComponent(id)}?${tz()}`, input);

export const deleteGoal = (id: string) => api.delete<null>(`/goals/${encodeURIComponent(id)}`);
