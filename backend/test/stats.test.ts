import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addDays, todayIn } from '@/lib/dates.ts';
import { bucketsOf } from '@/modules/stats/service.ts';
import { bearer, register, useApp } from './helpers.ts';

const app = useApp();
const today = () => todayIn('UTC');

async function habit(token: string, payload: Record<string, unknown>) {
  const response = await app().inject({ method: 'POST', url: '/api/habits?tz=UTC', headers: bearer(token), payload });
  return response.json().data.id as string;
}

const log = (token: string, id: string, date: string) =>
  app().inject({ method: 'PUT', url: `/api/habits/${id}/logs/${date}?tz=UTC`, headers: bearer(token), payload: {} });

const stats = (token: string, period: string) =>
  app().inject({ method: 'GET', url: `/api/stats?tz=UTC&period=${period}`, headers: bearer(token) });

describe('stats', () => {
  it('needs a session', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/stats' });
    assert.equal(response.statusCode, 401);
  });

  it('buckets the last 7 days, the last 30 days, and the last 12 months, oldest first', () => {
    assert.deepEqual(bucketsOf('week', '2026-09-28').map((b) => b.start), [
      '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28',
    ]);
    const month = bucketsOf('month', '2026-09-28');
    assert.equal(month.length, 30);
    assert.deepEqual(month[0], { start: '2026-08-30', end: '2026-08-30' });
    const year = bucketsOf('year', '2026-09-28');
    assert.deepEqual(year[0], { start: '2025-10-01', end: '2025-10-31' });
    assert.deepEqual(year[4], { start: '2026-02-01', end: '2026-02-28' });
    assert.deepEqual(year[11], { start: '2026-09-01', end: '2026-09-30' });
  });

  it('adds up build days and break relapses for the period', async () => {
    const { token } = await register(app());
    const read = await habit(token, { name: 'Read', type: 'build', icon: 'book', started_on: addDays(today(), -3) });
    const smoke = await habit(token, { name: 'Smoking', type: 'break', icon: 'smoke', started_on: addDays(today(), -10) });
    await log(token, read, addDays(today(), -3));
    await log(token, read, addDays(today(), -1));
    await log(token, smoke, addDays(today(), -2));
    await log(token, smoke, addDays(today(), -9));

    const week = (await stats(token, 'week')).json().data;
    assert.equal(week.buckets.length, 7);
    // Three days that counted (today is still open), two of them done; one relapse inside the week.
    assert.deepEqual(week.total, { days: 3, done: 2, missed: 1, rate: 2 / 3, relapses: 1 });
    assert.partialDeepStrictEqual(week.buckets.at(-2), { start: addDays(today(), -1), days: 1, done: 1, rate: 1 });
    assert.partialDeepStrictEqual(week.buckets.at(-1), { start: today(), days: 0, rate: null });
    assert.partialDeepStrictEqual(week, { period: 'week', build_habits: 1, break_habits: 1 });

    const month = (await stats(token, 'month')).json().data;
    assert.equal(month.total.relapses, 2);
    const year = (await stats(token, 'year')).json().data;
    assert.equal(year.buckets.length, 12);
    assert.partialDeepStrictEqual(year.total, { days: 3, done: 2, relapses: 2 });
  });

  it("never counts someone else's habits", async () => {
    const ana = await register(app());
    const id = await habit(ana.token, { name: 'Read', type: 'build', icon: 'book', started_on: addDays(today(), -2) });
    await log(ana.token, id, addDays(today(), -1));

    const budi = await register(app(), 'budi@example.com');
    const data = (await stats(budi.token, 'week')).json().data;
    assert.deepEqual(data.total, { days: 0, done: 0, missed: 0, rate: null, relapses: 0 });
    assert.equal(data.build_habits, 0);
  });

  it('refuses an unknown period', async () => {
    const { token } = await register(app());
    const response = await stats(token, 'decade');
    assert.equal(response.statusCode, 422);
  });
});
