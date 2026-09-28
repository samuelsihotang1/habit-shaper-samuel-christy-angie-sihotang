import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addDays, todayIn } from '@/lib/dates.ts';
import { bearer, count, db, register, useApp } from './helpers.ts';

const app = useApp();
const today = () => todayIn('UTC');

async function habit(token: string, type: 'build' | 'break' = 'build', startedOn = today()) {
  const response = await app().inject({
    method: 'POST',
    url: '/api/habits?tz=UTC',
    headers: bearer(token),
    payload: { name: type === 'build' ? 'Run' : 'Junk food', type, icon: type === 'build' ? 'run' : 'food', started_on: startedOn },
  });
  return response.json().data.id as string;
}

const addGoal = (token: string, payload: Record<string, unknown>) =>
  app().inject({ method: 'POST', url: '/api/goals?tz=UTC', headers: bearer(token), payload });

describe('goals', () => {
  it('needs a session', async () => {
    assert.equal((await app().inject({ method: 'GET', url: '/api/goals' })).statusCode, 401);
  });

  it('links a goal to a break habit and measures it by the clean streak', async () => {
    const { token } = await register(app());
    const habitId = await habit(token, 'break', addDays(today(), -4));

    const response = await addGoal(token, { habit_id: habitId, title: 'A clean month', target_days: 30, notes: 'One day at a time' });

    assert.equal(response.statusCode, 201);
    assert.partialDeepStrictEqual(response.json().data, {
      title: 'A clean month',
      target_days: 30,
      notes: 'One day at a time',
      habit: { id: habitId, type: 'break', current_streak: 5 },
      progress: { days: 5, ratio: 5 / 30, achieved: false },
    });
  });

  it('marks a build goal achieved once the streak reaches the target', async () => {
    const { token } = await register(app());
    const habitId = await habit(token, 'build', addDays(today(), -1));
    for (const date of [addDays(today(), -1), today()]) {
      await app().inject({ method: 'PUT', url: `/api/habits/${habitId}/logs/${date}?tz=UTC`, headers: bearer(token), payload: {} });
    }

    const goal = (await addGoal(token, { habit_id: habitId, title: 'Two days', target_days: 2 })).json().data;
    assert.deepEqual(goal.progress, { days: 2, ratio: 1, achieved: true });

    const open = (await addGoal(token, { habit_id: habitId, title: 'Keep going' })).json().data;
    assert.partialDeepStrictEqual(open, { target_days: null, notes: null, progress: { ratio: null, achieved: false } });
  });

  it('edits and removes a goal', async () => {
    const { token } = await register(app());
    const run = await habit(token);
    const quit = await habit(token, 'break');
    const { id } = (await addGoal(token, { habit_id: run, title: 'Run', target_days: 7 })).json().data;

    const edited = await app().inject({
      method: 'PUT',
      url: `/api/goals/${id}?tz=UTC`,
      headers: bearer(token),
      payload: { habit_id: quit, title: 'Quit junk food', target_days: 14, notes: null },
    });
    assert.partialDeepStrictEqual(edited.json().data, { title: 'Quit junk food', target_days: 14, habit: { id: quit, type: 'break' } });

    assert.equal((await app().inject({ method: 'DELETE', url: `/api/goals/${id}`, headers: bearer(token) })).statusCode, 200);
    assert.deepEqual((await app().inject({ method: 'GET', url: '/api/goals', headers: bearer(token) })).json().data, []);
  });

  it('refuses a missing title, a bad target and a habit that is not yours', async () => {
    const owner = await register(app(), 'ana@example.com');
    const stranger = await register(app(), 'ben@example.com');
    const theirs = await habit(owner.token);

    const invalid = await addGoal(stranger.token, { habit_id: theirs, title: '', target_days: 0 });
    assert.equal(invalid.statusCode, 422);
    assert.ok(['title', 'target_days'].every((field) => field in invalid.json().errors));

    const foreign = await addGoal(stranger.token, { habit_id: theirs, title: 'Steal it' });
    assert.equal(foreign.json().code, 'goals.habitNotFound');
    assert.equal(typeof foreign.json().errors.habit_id[0], 'string');
  });

  it("never edits or deletes someone else's goal", async () => {
    const owner = await register(app(), 'ana@example.com');
    const stranger = await register(app(), 'ben@example.com');
    const { id } = (await addGoal(owner.token, { habit_id: await habit(owner.token), title: 'Mine' })).json().data;
    const strangerHabit = await habit(stranger.token);

    const edit = await app().inject({
      method: 'PUT',
      url: `/api/goals/${id}`,
      headers: bearer(stranger.token),
      payload: { habit_id: strangerHabit, title: 'Yours' },
    });
    assert.equal(edit.statusCode, 404);
    assert.equal((await app().inject({ method: 'DELETE', url: `/api/goals/${id}`, headers: bearer(stranger.token) })).statusCode, 404);
    assert.deepEqual((await app().inject({ method: 'GET', url: '/api/goals', headers: bearer(stranger.token) })).json().data, []);
    assert.equal(await count('goals', "id = ? AND title = 'Mine'", [id]), 1);
  });

  it('archives a goal with its habit', async () => {
    const { token } = await register(app());
    const habitId = await habit(token);
    await addGoal(token, { habit_id: habitId, title: 'Run' });

    await app().inject({ method: 'DELETE', url: `/api/habits/${habitId}`, headers: bearer(token) });

    assert.deepEqual((await app().inject({ method: 'GET', url: '/api/goals', headers: bearer(token) })).json().data, []);
    assert.equal(await count('goals'), 1);
  });
});
