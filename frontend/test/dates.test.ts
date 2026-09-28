import { describe, expect, it } from 'vitest';
import { addMonths, formatDay, monthGrid, weekOf } from '@/utils/dates';

describe('dates', () => {
  it('builds the Monday-to-Sunday week around a day', () => {
    // 2026-09-30 is a Wednesday.
    expect(weekOf('2026-09-30')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });

  it('pads a month so it starts on Monday', () => {
    // September 2026 starts on a Tuesday: one blank, then 30 days.
    const grid = monthGrid('2026-09-15');
    expect(grid[0]).toBeNull();
    expect(grid[1]).toBe('2026-09-01');
    expect(grid.filter(Boolean)).toHaveLength(30);
  });

  it('moves by months from the first of the month, so the 31st never skips one', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(addMonths('2026-03-15', -1)).toBe('2026-02-01');
  });

  it("formats a calendar day without the browser's zone moving it", () => {
    expect(formatDay('2026-09-01', { month: 'long', day: 'numeric' })).toBe('September 1');
  });

  it('keeps each set of formatting options apart, however often they alternate', () => {
    for (let i = 0; i < 3; i++) {
      expect(formatDay('2026-09-01', { weekday: 'short' })).toBe('Tue');
      expect(formatDay('2026-09-01', { month: 'short', day: 'numeric' })).toBe('Sep 1');
      expect(formatDay('2026-09-01', { month: 'long', year: 'numeric' })).toBe('September 2026');
    }
  });
});
