import { api } from '@/services/api';
import type { MfaChallenge, Session } from '@/types/auth';
import { getDeviceToken, removeAuthUser, setAuthUser, setDeviceToken } from '@/utils/cookies';

/** Every call that ends in a session stores it here, and nowhere else. */
function keep(session: Session): Session {
  setAuthUser(session);
  if (session.device_token) setDeviceToken(session.device_token);
  return session;
}

export const identify = (email: string) => api.post<{ exists: boolean }>('/auth/identify', { email });

export async function register(data: { name: string; email: string; password: string; password_confirmation: string }) {
  const response = await api.post<Session>('/register', data);
  keep(response.data);
  return response;
}

export async function login(data: { email: string; password: string }) {
  const response = await api.post<Session | MfaChallenge>('/login', { ...data, device_token: getDeviceToken() });
  if ('token' in response.data) keep(response.data);
  return response;
}

export async function verifyMfa(data: { challenge: string; code: string; trust_device: boolean }) {
  const response = await api.post<Session>('/auth/mfa', data);
  keep(response.data);
  return response;
}

export const resetPassword = (data: { email: string; code: string; password: string; password_confirmation: string }) =>
  api.post<null>('/auth/password/reset', data);

export async function logout() {
  try {
    await api.post<null>('/logout');
  } finally {
    removeAuthUser();
  }
}
