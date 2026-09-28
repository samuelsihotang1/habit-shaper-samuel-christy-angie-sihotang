import { createContext, use, useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCache } from '@/hooks/useData';
import { UNAUTHORIZED_EVENT } from '@/services/api';
import * as auth from '@/services/auth';
import type { User } from '@/types/auth';
import { getAuthToken, getAuthUser, removeAuthUser, setAuthUser } from '@/utils/cookies';

/**
 * What a sign-in attempt produced. A correct password on an account with MFA
 * is not a session yet: the caller has to ask for a code instead of navigating.
 */
export interface SignInOutcome {
  mfaRequired: boolean;
  challenge?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<SignInOutcome>;
  verifyMfa: (challenge: string, code: string, trustDevice: boolean) => Promise<void>;
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** After an account change answers with the fresh user. */
  replaceUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = new Set(['/login', '/signup', '/forgot-password']);

/*
 * The user comes from the cookie written at sign-in, with no /me round trip;
 * a dead token surfaces as the 401 on the page's first request, which the
 * listener below answers.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getAuthUser()?.user ?? null);
  const navigate = useNavigate();
  const { clear } = useCache();

  const onUnauthorized = useEffectEvent(() => {
    removeAuthUser();
    clear();
    setUser(null);
    if (!PUBLIC_PATHS.has(window.location.pathname)) void navigate('/login', { replace: true });
  });

  useEffect(() => {
    const listener = () => onUnauthorized();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  }, []);

  // Holding a user is the whole sign-in: PublicOnlyRoute sees it and navigates.
  const login = useCallback(async (email: string, password: string): Promise<SignInOutcome> => {
    const response = await auth.login({ email, password });
    if ('mfa_required' in response.data) return { mfaRequired: true, challenge: response.data.challenge };
    setUser(response.data.user);
    return { mfaRequired: false };
  }, []);

  const verifyMfa = useCallback(async (challenge: string, code: string, trustDevice: boolean) => {
    const response = await auth.verifyMfa({ challenge, code, trust_device: trustDevice });
    setUser(response.data.user);
  }, []);

  const register = useCallback(async (data: Parameters<AuthContextValue['register']>[0]) => {
    const response = await auth.register(data);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      clear();
      setUser(null);
      await navigate('/login', { replace: true });
    }
  }, [clear, navigate]);

  const replaceUser = useCallback((next: User) => {
    const token = getAuthToken();
    if (token) setAuthUser({ user: next, token });
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, verifyMfa, register, logout, replaceUser }),
    [user, login, verifyMfa, register, logout, replaceUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
