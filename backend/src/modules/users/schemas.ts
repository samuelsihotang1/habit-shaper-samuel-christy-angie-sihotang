import { Type } from 'typebox';

/** What `serializeUser` sends: never the password hash or the MFA secret (RULES.md §1.3). */
export const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
  mfa_enabled: Type.Boolean(),
  created_at: Type.String(),
});

export const DeviceSchema = Type.Object({
  id: Type.String(),
  user_agent: Type.String(),
  last_used_at: Type.String(),
  created_at: Type.String(),
});
