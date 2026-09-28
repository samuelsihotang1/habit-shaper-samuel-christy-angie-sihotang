import Cookies from 'js-cookie';
import type { Session, User } from '@/types/auth';

const AUTH_COOKIE = 'auth_key';
const DEVICE_COOKIE = 'device_token';

/*
 * A session never expires (docs/decisions.md), but a browser caps a cookie's
 * lifetime at 400 days whatever `expires` asks for (RULES.md §6). So both
 * cookies are written for the maximum and written again on every app load.
 */
const MAX_DAYS = 400;

/** The auth cookie's shape. A cookie without `v` was written before it had one, with the same fields. */
const VERSION = 1;

const options = (): Cookies.CookieAttributes => ({
  expires: MAX_DAYS,
  sameSite: 'Lax',
  secure: window.location.protocol === 'https:',
});

interface Stored {
  user: User;
  token: string;
}

/*
 * Every request reads the token, and parsing the cookie each time is a
 * synchronous read of document.cookie plus JSON. This copy is written through
 * on every change here, and dropped when the tab becomes visible again:
 * another tab may have signed in or out meanwhile.
 */
let cache: Stored | null | undefined;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cache = undefined;
  });
}

function read(): Stored | null {
  const raw = Cookies.get(AUTH_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored & { v?: number };
    if ((parsed.v ?? VERSION) !== VERSION || !parsed.token || !parsed.user) return null;
    return { user: parsed.user, token: parsed.token };
  } catch {
    return null;
  }
}

export function setAuthUser(session: Pick<Session, 'user' | 'token'>): void {
  Cookies.set(AUTH_COOKIE, JSON.stringify({ v: VERSION, user: session.user, token: session.token }), options());
  cache = { user: session.user, token: session.token };
}

export function getAuthUser(): Stored | null {
  if (cache === undefined) cache = read();
  return cache;
}

export const getAuthToken = (): string | null => getAuthUser()?.token ?? null;

export function removeAuthUser(): void {
  Cookies.remove(AUTH_COOKIE);
  cache = null;
}

export const getDeviceToken = (): string | undefined => Cookies.get(DEVICE_COOKIE);

export function setDeviceToken(token: string): void {
  Cookies.set(DEVICE_COOKIE, token, options());
}

export function removeDeviceToken(): void {
  Cookies.remove(DEVICE_COOKIE);
}

/** Pushes both cookies' expiry another 400 days out. Called once per app load (main.tsx). */
export function refreshAuthCookies(): void {
  const stored = getAuthUser();
  if (stored) setAuthUser(stored);
  const device = getDeviceToken();
  if (device) setDeviceToken(device);
}
