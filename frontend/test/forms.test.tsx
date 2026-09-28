import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { Cache } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/hooks/useAuth';
import { GoalFormPage } from '@/pages/goals/GoalFormPage';
import { HabitFormPage } from '@/pages/habits/HabitFormPage';
import { habitsPath } from '@/services/habits';
import type { Habit } from '@/types/habits';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';
import { envelope, FreshCache } from './support';

const user = { id: 'u1', name: 'Ana Lee', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

const habit = (overrides: Partial<Habit>): Habit => ({
  id: 'h1',
  name: 'Read',
  type: 'build',
  icon: 'book',
  started_on: '2026-02-01',
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

async function renderAt(path: string, cache?: Cache) {
  await act(async () => {
    root.render(
      <FreshCache cache={cache}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<p>today page</p>} />
              <Route path="/habits/new" element={<HabitFormPage />} />
              <Route path="/habits/:id" element={<p>detail page</p>} />
              <Route path="/habits/:id/edit" element={<HabitFormPage />} />
              <Route path="/goals/new" element={<GoalFormPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </FreshCache>,
    );
  });
}

const input = (selector: string) => container.querySelector<HTMLInputElement>(selector)!;

const submit = () => act(async () => container.querySelector('form')!.requestSubmit());

describe('habit form', () => {
  it('editing, starts from the loaded habit and saves it', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(envelope(habit({})))
      .mockResolvedValueOnce(envelope(habit({ name: 'Read 20 pages' })));
    vi.stubGlobal('fetch', fetch);

    await renderAt('/habits/h1/edit');

    expect(input('#habit-name').value).toBe('Read');
    expect(input('#habit-name').disabled).toBe(false);
    expect(input('input[type="date"]').value).toBe('2026-02-01');

    await submit();

    const [url, init] = fetch.mock.calls[1];
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/^\/api\/habits\/h1\?tz=/);
    expect(JSON.parse(init.body)).toEqual({ name: 'Read', icon: 'book', started_on: '2026-02-01' });
    expect(container.textContent).toBe('detail page');
  });

  it('a new habit joins the cached list, so Today shows it without asking again', async () => {
    const cache: Cache = new Map();
    cache.set(habitsPath(), { data: [habit({})] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(envelope(habit({ id: 'h2', name: 'Walk' }))));
    await renderAt('/habits/new', cache);

    await act(async () => {
      const name = input('#habit-name');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Walk');
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await submit();

    expect(container.textContent).toBe('today page');
    expect((cache.get(habitsPath())?.data as Habit[]).map((item) => item.name)).toEqual(['Read', 'Walk']);
  });
});

describe('goal form', () => {
  it('a new goal links the first habit until another is picked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(envelope([habit({}), habit({ id: 'h2', name: 'Walk' })])));

    await renderAt('/goals/new');

    const radios = [...container.querySelectorAll('[role="radio"]')];
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false']);

    await act(async () => (radios[1] as HTMLButtonElement).click());
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  });
});
