import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, UNAUTHORIZED_EVENT } from '@/services/api';
import { removeAuthUser, setAuthUser } from '@/utils/cookies';

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

function answer(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
}

beforeEach(() => {
  removeAuthUser();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('unwraps the envelope and sends the token', async () => {
    setAuthUser({ user, token: 'id|secret' });
    const fetch = answer(200, { success: true, data: { ok: 1 }, message: 'Fine.' });
    vi.stubGlobal('fetch', fetch);

    const response = await api.post<{ ok: number }>('/thing', { a: 1 });

    expect(response.data).toEqual({ ok: 1 });
    expect(response.message).toBe('Fine.');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/thing');
    expect(init.headers.Authorization).toBe('Bearer id|secret');
    expect(init.credentials).toBeUndefined();
  });

  it('turns a refusal into an ApiError with its field messages', async () => {
    vi.stubGlobal(
      'fetch',
      answer(422, { success: false, message: 'Invalid email or password.', code: 'auth.invalidCredentials', errors: { email: ['Invalid email or password.'] } }),
    );

    const error = await api.post('/login', {}).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.code).toBe('auth.invalidCredentials');
    expect(error.field('email')).toBe('Invalid email or password.');
  });

  it('announces a 401 so the app can sign out', async () => {
    vi.stubGlobal('fetch', answer(401, { success: false, message: 'Unauthenticated.', code: 'auth.unauthenticated' }));
    const heard = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, heard);

    await api.get('/me').catch(() => {});

    expect(heard).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, heard);
  });

  it('reports an HTML error page as an API error, not a JSON parse error', async () => {
    vi.stubGlobal('fetch', answer(502, '<html>Bad Gateway</html>'));

    const error = await api.get('/me').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
  });

  it('shares one in-flight GET between callers', async () => {
    const fetch = answer(200, { success: true, data: 1 });
    vi.stubGlobal('fetch', fetch);

    await Promise.all([api.get('/me'), api.get('/me')]);

    expect(fetch).toHaveBeenCalledOnce();
  });
});
