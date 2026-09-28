import { api } from '@/services/api';
import type { MfaSetup, User } from '@/types/auth';

export const changePassword = (data: { current_password: string; password: string; password_confirmation: string }) =>
  api.put<User>('/account/password', data);

export const startMfa = () => api.post<MfaSetup>('/account/mfa/setup');

export const confirmMfa = (code: string) => api.post<User>('/account/mfa/confirm', { code });

export const disableMfa = (data: { password: string; code: string }) => api.post<User>('/account/mfa/disable', data);

/** The SWR key (hooks/useDevices.ts). */
export const DEVICES_PATH = '/account/devices';

export const forgetDevice = (id: string) => api.delete<null>(`/account/devices/${encodeURIComponent(id)}`);

export const forgetAllDevices = () => api.delete<null>('/account/devices/all');
