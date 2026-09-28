import type { TrustedDevice } from '@/modules/auth/repository.ts';
import type { User } from '@/modules/users/repository.ts';

/*
 * The only shape a user leaves the API in. Never send a database row: every
 * column would ship, `password_hash` and `mfa_secret` included.
 */
export function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mfa_enabled: user.mfaConfirmedAt !== null,
    created_at: user.createdAt.toISOString(),
  };
}

export function serializeDevice(device: TrustedDevice) {
  return {
    id: device.id,
    user_agent: device.userAgent,
    last_used_at: device.lastUsedAt.toISOString(),
    created_at: device.createdAt.toISOString(),
  };
}
