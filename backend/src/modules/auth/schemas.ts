import { Type, type TProperties } from 'typebox';
import { UserSchema } from '@/modules/users/schemas.ts';

/*
 * Request bodies, validated by Fastify before a handler runs (lib/validation.ts
 * explains `normalize`, `errorMessage` and `$data`). Every message here is what
 * the SPA shows under the field.
 */

/** A body: unknown keys are dropped, and each missing key has its own sentence. */
export const Body = <P extends TProperties>(properties: P, required: Record<string, string>) =>
  Type.Object(properties, { additionalProperties: false, errorMessage: { required } });

export const Email = Type.String({
  normalize: 'lowercase',
  format: 'email',
  maxLength: 191,
  errorMessage: { type: 'Enter your email address.', format: 'Enter a valid email address.', maxLength: 'That email address is too long.' },
});

// A 200-character cap keeps argon2's cost bounded for whoever sends a megabyte of "password".
export const NewPassword = Type.String({
  minLength: 8,
  maxLength: 200,
  errorMessage: { type: 'Choose a password.', minLength: 'Use at least 8 characters.', maxLength: 'Use at most 200 characters.' },
});

const Password = Type.String({
  minLength: 1,
  maxLength: 200,
  errorMessage: { type: 'Enter your password.', minLength: 'Enter your password.', maxLength: 'Use at most 200 characters.' },
});

export const Code = Type.String({
  normalize: 'trim',
  pattern: '^\\d{6}$',
  errorMessage: { type: 'Enter the 6-digit code.', pattern: 'Enter the 6-digit code.' },
});

// `$data`: equal to the `password` beside it.
const Confirmation = Type.String({
  const: { $data: '1/password' },
  errorMessage: { type: 'Repeat the password.', const: 'The passwords do not match.' },
});

const EMAIL = { email: 'Enter your email address.' };
const NEW_PASSWORD = { password: 'Choose a password.', password_confirmation: 'Repeat the password.' };
const CODE = { code: 'Enter the 6-digit code.' };

export const IdentifyBody = Body({ email: Email }, EMAIL);

export const RegisterBody = Body(
  {
    name: Type.String({
      normalize: 'trim',
      minLength: 1,
      maxLength: 100,
      errorMessage: { type: 'Enter your name.', minLength: 'Enter your name.', maxLength: 'Use at most 100 characters.' },
    }),
    email: Email,
    password: NewPassword,
    password_confirmation: Confirmation,
  },
  { name: 'Enter your name.', ...EMAIL, ...NEW_PASSWORD },
);

export const LoginBody = Body(
  { email: Email, password: Password, device_token: Type.Optional(Type.String({ maxLength: 200 })) },
  { ...EMAIL, password: 'Enter your password.' },
);

const EXPIRED = 'This sign-in attempt expired. Start again.';

export const MfaBody = Body(
  {
    challenge: Type.String({ minLength: 1, maxLength: 1000, errorMessage: EXPIRED }),
    code: Code,
    trust_device: Type.Optional(Type.Boolean()),
  },
  { challenge: EXPIRED, ...CODE },
);

export const ResetBody = Body(
  { email: Email, code: Code, password: NewPassword, password_confirmation: Confirmation },
  { ...EMAIL, ...CODE, ...NEW_PASSWORD },
);

export const ChangePasswordBody = Body(
  {
    current_password: Type.String({
      minLength: 1,
      maxLength: 200,
      errorMessage: { type: 'Enter your current password.', minLength: 'Enter your current password.', maxLength: 'Use at most 200 characters.' },
    }),
    password: NewPassword,
    password_confirmation: Confirmation,
  },
  { current_password: 'Enter your current password.', ...NEW_PASSWORD },
);

export const MfaConfirmBody = Body({ code: Code }, CODE);

export const MfaDisableBody = Body({ password: Password, code: Code }, { password: 'Enter your password.', ...CODE });

/** A signed-in answer; `device_token` only when this browser was just trusted. */
export const SessionSchema = Type.Object({
  user: UserSchema,
  token: Type.String(),
  device_token: Type.Optional(Type.String()),
});

/** A correct password on an account with MFA: no token yet. */
export const MfaChallengeSchema = Type.Object({ mfa_required: Type.Literal(true), challenge: Type.String() });

export const MfaSetupSchema = Type.Object({ secret: Type.String(), otpauth_url: Type.String() });
