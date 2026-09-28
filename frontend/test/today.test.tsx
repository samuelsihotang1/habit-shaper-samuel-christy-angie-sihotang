import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/hooks/useAuth';
import { TodayPage } from '@/pages/today/TodayPage';
import type { Habit } from '@/types/habits';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';
import { today } from '@/utils/dates';
import { envelope, FreshCache } from './support';

const user = { id: 'u1', name: 'Ana Lee', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

const habit = (overrides: Partial<Habit>): Habit => ({
  id: 'h1',
  name: 'Read',
  type: 'build',
  icon: 'book',
  started_on: '2026-01-01',
  created_at: '2026-01-01T00:00:00.000Z',
  logs: [],
  stats: { current_streak: 0, longest_streak: 0, total_logs: 0, last_logged: null },
  weeks: [],
  ...overrides,
});

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

/** Rendering again with other `page` keeps the same FreshCache mounted, and with it the cache. */
async function render(page: ReactNode = <TodayPage />) {
  await act(async () => {
    root.render(
      <FreshCache>
        <MemoryRouter>
          <AuthProvider>{page}</AuthProvider>
        </MemoryRouter>
      </FreshCache>,
    );
  });
}

const button = (name: RegExp) =>
  [...container.querySelectorAll('button')].find((element) => name.test(element.getAttribute('aria-label') ?? element.textContent ?? ''))!;

describe('today', () => {
  it('lists habits with their streak and asks with the browser zone', async () => {
    const fetch = vi.fn().mockResolvedValue(envelope([habit({ stats: { current_streak: 4, longest_streak: 9, total_logs: 20, last_logged: null } })]));
    vi.stubGlobal('fetch', fetch);

    await render();

    expect(fetch.mock.calls[0][0]).toMatch(/^\/api\/habits\?tz=/);
    expect(container.textContent).toMatch(/Good (morning|afternoon|evening), Ana/);
    expect(container.textContent).toContain('4-day streak');
    expect(container.textContent).toContain('0 of 1 build habit done today');
  });

  it('opened again straight away, shows the cached habits without asking twice', async () => {
    const fetch = vi.fn().mockResolvedValue(envelope([habit({})]));
    vi.stubGlobal('fetch', fetch);
    await render();

    await render(<p>elsewhere</p>);
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    await render();
    // SWR revalidates a cached key a tick after mount; that request, if any, has gone out by now.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(container.textContent).toContain('0 of 1 build habit done today');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("marks today done and shows the server's answer", async () => {
    const done = habit({ logs: [today()], stats: { current_streak: 1, longest_streak: 1, total_logs: 1, last_logged: today() } });
    const fetch = vi.fn().mockResolvedValueOnce(envelope([habit({})])).mockResolvedValueOnce(envelope(done));
    vi.stubGlobal('fetch', fetch);
    await render();

    await act(async () => button(/Mark done: Read/).click());

    const [url, init] = fetch.mock.calls[1];
    expect(init.method).toBe('PUT');
    expect(url).toMatch(new RegExp(`^/api/habits/h1/logs/${today()}\\?tz=`));
    expect(button(/Done: Read/).getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('1 of 1 build habit done today');
  });

  it('spins only the card whose check-in is saving', async () => {
    let answer!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(envelope([habit({}), habit({ id: 'h2', name: 'Walk' })]))
      .mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));
    vi.stubGlobal('fetch', fetch);
    await render();

    await act(async () => button(/Mark done: Read/).click());

    expect(button(/Mark done: Read/).disabled).toBe(true);
    expect(button(/Mark done: Walk/).disabled).toBe(false);

    await act(async () => answer(envelope(habit({ logs: [today()] }))));
    expect(button(/Done: Read/).disabled).toBe(false);
  });

  it('asks before logging a relapse, and sends nothing on cancel', async () => {
    const quit = habit({ id: 'h2', name: 'Smoking', type: 'break', icon: 'smoke', stats: { current_streak: 12, longest_streak: 12, total_logs: 0, last_logged: null } });
    const fetch = vi.fn().mockResolvedValue(envelope([quit]));
    vi.stubGlobal('fetch', fetch);
    await render();

    await act(async () => button(/^Break$/).click());
    expect(container.textContent).toContain('Day 12 clean');

    await act(async () => button(/Log relapse: Smoking/).click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Log a relapse today?');

    await act(async () => button(/^Cancel$/).click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
