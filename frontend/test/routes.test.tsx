import Cookies from 'js-cookie';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { Cache } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { habitsPath } from '@/services/habits';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';
import { envelope, FreshCache } from './support';

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  removeAuthUser();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: user }))));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/** A protected page that, like every real one, loads something from the API. */
function LoadingPage() {
  const { logout } = useAuth();
  const { data } = useHabits();
  return (
    <button type="button" onClick={() => void logout()}>
      {data ? `${data.length} habits` : 'habits page'}
    </button>
  );
}

async function renderAt(path: string, cache?: Cache) {
  await act(async () => {
    root.render(
      <FreshCache cache={cache}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<p>login page</p>} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<p>home page</p>} />
                <Route path="/habits" element={<LoadingPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </FreshCache>,
    );
  });
}

describe('route guards', () => {
  it('sends a signed-out visitor to /login', async () => {
    await renderAt('/');
    expect(container.textContent).toBe('login page');
  });

  it('lets a signed-in user in, and keeps them off /login', async () => {
    setAuthUser({ user, token: 'id|secret' });

    await renderAt('/');
    expect(container.textContent).toBe('home page');

    await renderAt('/login');
    expect(container.textContent).toBe('home page');
  });

  it('trusts the stored user on load: no /me round trip', async () => {
    setAuthUser({ user, token: 'id|secret' });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await renderAt('/');

    expect(container.textContent).toBe('home page');
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signs out when a page's request answers 401, and forgets what it cached", async () => {
    setAuthUser({ user, token: 'id|dead' });
    const cache: Cache = new Map();
    cache.set('/goals?tz=UTC', { data: [{ id: 'g1' }] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, message: 'Unauthenticated.' }), { status: 401 })));

    await renderAt('/habits', cache);

    expect(container.textContent).toBe('login page');
    expect(Cookies.get('auth_key')).toBeUndefined();
    expect(cache.get('/goals?tz=UTC')?.data).toBeUndefined();
  });

  it('signing out forgets every cached answer', async () => {
    setAuthUser({ user, token: 'id|secret' });
    const cache: Cache = new Map();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => envelope(url.startsWith('/api/habits') ? [{ id: 'h1' }] : null)));
    await renderAt('/habits', cache);
    expect(container.textContent).toBe('1 habits');
    expect(cache.get(habitsPath())?.data).toHaveLength(1);

    await act(async () => container.querySelector('button')!.click());

    expect(container.textContent).toBe('login page');
    expect(cache.get(habitsPath())?.data).toBeUndefined();
  });
});
