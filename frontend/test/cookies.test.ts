import Cookies from 'js-cookie';
import { beforeEach, describe, expect, it } from 'vitest';
import { getAuthToken, getAuthUser, removeAuthUser, setAuthUser } from '@/utils/cookies';

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com', mfa_enabled: false, created_at: '2026-01-01T00:00:00.000Z' };

const becomeVisible = () => document.dispatchEvent(new Event('visibilitychange'));

beforeEach(() => {
  removeAuthUser();
});

describe('the auth cookie', () => {
  it('answers from memory until sign-out', () => {
    setAuthUser({ user, token: 'id|secret' });
    expect(getAuthToken()).toBe('id|secret');

    removeAuthUser();
    expect(getAuthToken()).toBeNull();
    expect(Cookies.get('auth_key')).toBeUndefined();
  });

  it('reads the cookie again when the tab comes back, since another tab may have signed out', () => {
    setAuthUser({ user, token: 'id|secret' });
    Cookies.remove('auth_key');
    expect(getAuthToken()).toBe('id|secret');

    becomeVisible();
    expect(getAuthToken()).toBeNull();
  });

  it('still reads a cookie written before it carried a version, and refuses an unknown one', () => {
    Cookies.set('auth_key', JSON.stringify({ user, token: 'old|secret' }));
    becomeVisible();
    expect(getAuthUser()).toEqual({ user, token: 'old|secret' });

    Cookies.set('auth_key', JSON.stringify({ v: 99, user, token: 'new|secret' }));
    becomeVisible();
    expect(getAuthUser()).toBeNull();
  });
});
