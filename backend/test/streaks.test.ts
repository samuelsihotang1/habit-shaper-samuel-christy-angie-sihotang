import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isIsoDay, isTimeZone, todayIn, weekStart } from '@/lib/dates.ts';
import { buildStreak, cleanStreak, longestBuildStreak, longestCleanStreak, weeklySummary } from '@/lib/streaks.ts';

// 2026-09-28 is a Monday.
const TODAY = '2026-09-28';

describe('dates', () => {
  it("takes today from the user's zone, not the server's", () => {
    const lateUtc = new Date('2026-09-28T20:30:00Z');
    assert.equal(todayIn('UTC', lateUtc), '2026-09-28');
    assert.equal(todayIn('Asia/Jakarta', lateUtc), '2026-09-29');
    assert.equal(todayIn('America/Los_Angeles', new Date('2026-09-28T03:00:00Z')), '2026-09-27');
  });

  it('accepts only real days and zones', () => {
    assert.equal(isIsoDay('2026-02-28'), true);
    assert.equal(isIsoDay('2026-02-30'), false);
    assert.equal(isIsoDay('28-09-2026'), false);
    assert.equal(isTimeZone('Asia/Jakarta'), true);
    assert.equal(isTimeZone('Mars/Olympus'), false);
  });

  it('starts an ISO week on Monday', () => {
    assert.equal(weekStart('2026-09-28'), '2026-09-28');
    assert.equal(weekStart('2026-10-04'), '2026-09-28');
    assert.equal(weekStart('2026-09-27'), '2026-09-21');
  });
});

describe('build streak', () => {
  it('counts consecutive done days ending today', () => {
    assert.equal(buildStreak(['2026-09-26', '2026-09-27', '2026-09-28'], '2026-09-01', TODAY), 3);
  });

  it('keeps yesterday’s streak while today is still open', () => {
    assert.equal(buildStreak(['2026-09-26', '2026-09-27'], '2026-09-01', TODAY), 2);
  });

  it('drops to 0 after a missed day', () => {
    assert.equal(buildStreak(['2026-09-25', '2026-09-26'], '2026-09-01', TODAY), 0);
  });

  it('ignores days before the start or after today', () => {
    assert.equal(buildStreak(['2026-09-27', '2026-09-28', '2026-09-29'], '2026-09-28', TODAY), 1);
  });

  it('finds the longest run anywhere in the log', () => {
    const logged = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-10', '2026-09-28'];
    assert.equal(longestBuildStreak(logged, '2026-09-01', TODAY), 4);
  });
});

describe('clean streak', () => {
  it('is day 1 on the day the habit starts', () => {
    assert.equal(cleanStreak([], TODAY, TODAY), 1);
    assert.equal(cleanStreak([], '2026-09-19', TODAY), 10);
  });

  it('resets on a relapse: 0 on the day itself, day 1 the day after', () => {
    assert.equal(cleanStreak(['2026-09-28'], '2026-09-01', TODAY), 0);
    assert.equal(cleanStreak(['2026-09-27'], '2026-09-01', TODAY), 1);
    assert.equal(cleanStreak(['2026-09-20', '2026-09-24'], '2026-09-01', TODAY), 4);
  });

  it('keeps the best clean run', () => {
    assert.equal(longestCleanStreak(['2026-09-20', '2026-09-24'], '2026-09-01', TODAY), 19);
    assert.equal(longestCleanStreak([], '2026-09-21', TODAY), 8);
    assert.equal(longestCleanStreak(['2026-09-28'], '2026-09-26', TODAY), 2);
  });
});

describe('weekly summary', () => {
  it('counts done and missed days per ISO week, newest first, with today counted once done', () => {
    // Started Wednesday 2026-09-16; today is Monday 2026-09-28.
    const weeks = weeklySummary(['2026-09-16', '2026-09-17', '2026-09-21', '2026-09-28'], '2026-09-16', TODAY);

    assert.deepEqual(weeks, [
      { week_start: '2026-09-28', days: 1, done: 1, missed: 0, rate: 1 },
      { week_start: '2026-09-21', days: 7, done: 1, missed: 6, rate: 1 / 7 },
      { week_start: '2026-09-14', days: 5, done: 2, missed: 3, rate: 2 / 5 },
    ]);
  });

  it('never counts an open today as missed', () => {
    const weeks = weeklySummary(['2026-09-21'], '2026-09-21', TODAY);
    assert.deepEqual(weeks[0], { week_start: '2026-09-28', days: 0, done: 0, missed: 0, rate: null });
    assert.partialDeepStrictEqual(weeks[1], { days: 7, done: 1, missed: 6 });
  });

  it('stops at the limit', () => {
    assert.equal(weeklySummary([], '2026-01-01', TODAY, 4).length, 4);
  });
});
