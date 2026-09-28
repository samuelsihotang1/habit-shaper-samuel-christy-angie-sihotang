import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addDays, todayIn } from '@/lib/dates.ts';
import { bearer, count, db, register, useApp } from './helpers.ts';

const app = useApp();
const today = () => todayIn('UTC');

async function createHabit(token: string, payload: Record<string, unknown> = {}) {
  const response = await app().inject({
    method: 'POST',
    url: '/api/habits?tz=UTC',
    headers: bearer(token),
    payload: { name: 'Read', type: 'build', icon: 'book', ...payload },
  });
  return response;
}

const log = (token: string, id: string, date: string, method: 'PUT' | 'DELETE' = 'PUT') =>
  app().inject({ method, url: `/api/habits/${id}/logs/${date}?tz=UTC`, headers: bearer(token), payload: method === 'PUT' ? {} : undefined });

describe('habits', () => {
  it('needs a session', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/habits' });
    assert.equal(response.statusCode, 401);
  });

  it('refuses a request without a session before it reads the body', async () => {
    const response = await app().inject({ method: 'POST', url: '/api/habits?tz=UTC', payload: { name: '', icon: 'rocket' } });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'auth.unauthenticated');
  });

  it('creates a build habit that starts today with an empty streak', async () => {
    const { token } = await register(app());
    const response = await createHabit(token);

    assert.equal(response.statusCode, 201);
    assert.partialDeepStrictEqual(response.json().data, {
      name: 'Read',
      type: 'build',
      icon: 'book',
      started_on: today(),
      logs: [],
      stats: { current_streak: 0, longest_streak: 0, total_logs: 0, last_logged: null },
    });
    // Today is still open: not done yet is not missed yet.
    assert.partialDeepStrictEqual(response.json().data.weeks[0], { days: 0, done: 0, missed: 0, rate: null });
  });

  it('refuses an unknown icon, an empty name and a start in the future', async () => {
    const { token } = await register(app());

    const bad = await createHabit(token, { name: ' ', icon: 'rocket' });
    assert.equal(bad.statusCode, 422);
    assert.ok(['name', 'icon'].every((field) => field in bad.json().errors));

    const future = await createHabit(token, { started_on: addDays(today(), 1) });
    assert.equal(future.json().code, 'habits.startInFuture');
    assert.equal(typeof future.json().errors.started_on[0], 'string');
  });

  it('marks and clears a day, and counts the streak from the log', async () => {
    const { token } = await register(app());
    const { id } = (await createHabit(token, { started_on: addDays(today(), -5) })).json().data;

    await log(token, id, addDays(today(), -2));
    await log(token, id, addDays(today(), -1));
    const marked = await log(token, id, today());
    assert.partialDeepStrictEqual(marked.json().data.stats, { current_streak: 3, longest_streak: 3, total_logs: 3 });

    // Twice is the same as once.
    assert.equal((await log(token, id, today())).json().data.stats.total_logs, 3);

    const cleared = await log(token, id, addDays(today(), -1), 'DELETE');
    assert.partialDeepStrictEqual(cleared.json().data.stats, { current_streak: 1, longest_streak: 1, total_logs: 2 });
    assert.deepEqual(cleared.json().data.logs, [addDays(today(), -2), today()]);
  });

  it('refuses a day before the start or after today', async () => {
    const { token } = await register(app());
    const { id } = (await createHabit(token)).json().data;

    for (const date of [addDays(today(), -1), addDays(today(), 1)]) {
      const response = await log(token, id, date);
      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, 'habits.dateOutOfRange');
    }
    assert.equal((await log(token, id, '2026-02-30')).statusCode, 422);
  });

  it("uses the browser's zone for today", async () => {
    const { token } = await register(app());
    const response = await app().inject({
      method: 'POST',
      url: '/api/habits?tz=Pacific/Kiritimati',
      headers: bearer(token),
      payload: { name: 'Read', type: 'build', icon: 'book' },
    });
    assert.equal(response.json().data.started_on, todayIn('Pacific/Kiritimati'));

    const unknown = await app().inject({ method: 'GET', url: '/api/habits?tz=Mars/Olympus', headers: bearer(token) });
    assert.equal(unknown.statusCode, 422);
  });

  it('counts a clean streak for a break habit and resets it on a relapse', async () => {
    const { token } = await register(app());
    const { id, stats } = (await createHabit(token, { name: 'Smoking', type: 'break', icon: 'smoke', started_on: addDays(today(), -9) })).json().data;
    assert.equal(stats.current_streak, 10);

    const relapsed = await log(token, id, today());
    assert.partialDeepStrictEqual(relapsed.json().data.stats, { current_streak: 0, longest_streak: 9 });
    assert.deepEqual(relapsed.json().data.weeks, []);

    const undone = await log(token, id, today(), 'DELETE');
    assert.equal(undone.json().data.stats.current_streak, 10);
  });

  it('edits the name, icon and start, but not the type', async () => {
    const { token } = await register(app());
    const { id } = (await createHabit(token)).json().data;

    const response = await app().inject({
      method: 'PUT',
      url: `/api/habits/${id}?tz=UTC`,
      headers: bearer(token),
      payload: { name: 'Read 20 pages', icon: 'star', started_on: addDays(today(), -3), type: 'break' },
    });
    assert.partialDeepStrictEqual(response.json().data, { name: 'Read 20 pages', icon: 'star', type: 'build', started_on: addDays(today(), -3) });
  });

  it('archives on delete, keeping the log, and hides the habit from the list', async () => {
    const { token } = await register(app());
    const { id } = (await createHabit(token)).json().data;
    await log(token, id, today());

    assert.equal((await app().inject({ method: 'DELETE', url: `/api/habits/${id}`, headers: bearer(token) })).statusCode, 200);

    const list = await app().inject({ method: 'GET', url: '/api/habits?tz=UTC', headers: bearer(token) });
    assert.deepEqual(list.json().data, []);
    assert.equal(await count('habit_logs', 'habit_id = ?', [id]), 1);
    assert.equal((await app().inject({ method: 'GET', url: `/api/habits/${id}`, headers: bearer(token) })).statusCode, 404);
  });

  it("never shows, logs, edits or deletes someone else's habit", async () => {
    const owner = await register(app(), 'ana@example.com');
    const stranger = await register(app(), 'ben@example.com');
    const { id } = (await createHabit(owner.token)).json().data;

    assert.deepEqual((await app().inject({ method: 'GET', url: '/api/habits', headers: bearer(stranger.token) })).json().data, []);
    assert.equal((await app().inject({ method: 'GET', url: `/api/habits/${id}`, headers: bearer(stranger.token) })).statusCode, 404);
    assert.equal((await log(stranger.token, id, today())).statusCode, 404);
    const edit = await app().inject({
      method: 'PUT',
      url: `/api/habits/${id}`,
      headers: bearer(stranger.token),
      payload: { name: 'Mine now', icon: 'book', started_on: today() },
    });
    assert.equal(edit.statusCode, 404);
    assert.equal((await app().inject({ method: 'DELETE', url: `/api/habits/${id}`, headers: bearer(stranger.token) })).statusCode, 404);

    assert.equal(await count('habits', "id = ? AND name = 'Read' AND archived_at IS NULL", [id]), 1);
    assert.equal(await count('habit_logs'), 0);
  });
});
