import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/hooks/useAuth';
import { StatsPage } from '@/pages/stats/StatsPage';
import type { Habit, Stats, StatsPeriod } from '@/types/habits';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';
import { addDays, addMonths, today } from '@/utils/dates';
import { envelope, FreshCache } from './support';

const user = { id: 'u1', name: 'Ana Lee', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

const habit: Habit = {
  id: 'h1',
  name: 'Read',
  type: 'build',
  icon: 'book',
  started_on: '2026-01-01',
  created_at: '2026-01-01T00:00:00.000Z',
  logs: [],
  stats: { current_streak: 3, longest_streak: 9, total_logs: 20, last_logged: null },
  weeks: [],
};

/** A period's answer, every bucket half done, so the headline rate is 50%. */
function stats(period: StatsPeriod): Stats {
  const count = { week: 7, month: 30, year: 12 }[period];
  const counts = { days: 2, done: 1, missed: 1, rate: 0.5, relapses: 0 };
  const buckets = Array.from({ length: count }, (_, i) => {
    const start = period === 'year' ? addMonths(today(), i - count + 1) : addDays(today(), i - count + 1);
    return { start, end: period === 'year' ? addDays(addMonths(start, 1), -1) : start, ...counts };
  });
  return { period, buckets, total: { ...counts, days: count * 2, done: count, missed: count }, build_habits: 1, break_habits: 0 };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  removeAuthUser();
  setAuthUser({ user, token: 'id|secret' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    root.render(
      <FreshCache>
        <MemoryRouter>
          <AuthProvider>
            <StatsPage />
          </AuthProvider>
        </MemoryRouter>
      </FreshCache>,
    );
  });
}

const tab = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((element) => element.textContent === label)!;

const columns = (container: HTMLElement) => container.querySelectorAll('figure')[0]!.querySelectorAll('button').length;

describe('statistics', () => {
  it('switches between week, month and year, asking the server for each', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/habits')) return envelope([habit]);
      return envelope(stats(new URLSearchParams(url.split('?')[1]).get('period') as StatsPeriod));
    });
    vi.stubGlobal('fetch', fetch);

    await render();

    expect(fetch.mock.calls.some(([url]) => /^\/api\/stats\?period=week&tz=/.test(url))).toBe(true);
    expect(tab(container, 'Week').getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('Last 7 days');
    expect(columns(container)).toBe(7);

    await act(async () => tab(container, 'Month').click());
    expect(fetch.mock.calls.some(([url]) => url.startsWith('/api/stats?period=month'))).toBe(true);
    expect(tab(container, 'Month').getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('Last 30 days');
    expect(columns(container)).toBe(30);

    await act(async () => tab(container, 'Year').click());
    expect(container.textContent).toContain('Last 12 months');
    expect(columns(container)).toBe(12);
    expect(container.textContent).toContain('50%');
  });

  it('keeps the last period on screen, dimmed, until the next one answers', async () => {
    let answer!: (response: Response) => void;
    const fetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/habits')) return envelope([habit]);
      if (url.includes('period=month')) return new Promise<Response>((resolve) => (answer = resolve));
      return envelope(stats('week'));
    });
    vi.stubGlobal('fetch', fetch);
    await render();

    await act(async () => tab(container, 'Month').click());

    expect(columns(container)).toBe(7);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => answer(envelope(stats('month'))));
    expect(columns(container)).toBe(30);
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });
});
