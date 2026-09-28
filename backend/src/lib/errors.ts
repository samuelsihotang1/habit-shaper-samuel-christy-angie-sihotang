import createError from '@fastify/error';

/*
 * Every refusal the app throws on purpose, one class per `code`. A refusal
 * travels twice: `message` is English prose for a log or a curl user, `code`
 * (+ `field`, `params`) is what the frontend branches on
 * (docs/architecture/api.md). `plugins/errors.ts` turns each into the envelope.
 */

export interface Refusal extends Error {
  code: string;
  statusCode: number;
  /** The input the refusal belongs to: the envelope's `errors` key. */
  field?: string;
  params?: Record<string, unknown>;
}

const codes = new Set<string>();

function refusal(code: string, statusCode: number, message: string, field?: string) {
  codes.add(code);
  const Base = createError(code, message, statusCode);
  return class extends Base implements Refusal {
    // createError upper-cases the code; the wire keeps it as written (RULES.md §6).
    code = code;
    field = field;
    params?: Record<string, unknown>;
  };
}

/** Whether an error is one of the refusals above, as opposed to Fastify's own or a crash. */
export const isRefusal = (error: unknown): error is Refusal =>
  error instanceof Error && codes.has((error as { code?: string }).code ?? '');

export const Unauthenticated = refusal('auth.unauthenticated', 401, 'Unauthenticated.');
export const NotFound = refusal('http.notFound', 404, 'Not found.');

export const InvalidCredentials = refusal('auth.invalidCredentials', 422, 'Invalid email or password.', 'email');
export const EmailTaken = refusal('auth.emailTaken', 422, 'An account with this email already exists.', 'email');
export const ChallengeExpired = refusal('auth.challengeExpired', 422, 'This sign-in attempt expired. Start again.', 'challenge');
export const ResetNeedsMfa = refusal(
  'auth.resetNeedsMfa',
  422,
  'Password reset needs two-factor authentication, and this account does not have it.',
  'email',
);
export const WrongCurrentPassword = refusal('auth.wrongPassword', 422, 'Your current password is incorrect.', 'current_password');
export const WrongPassword = refusal('auth.wrongPassword', 422, 'Your password is incorrect.', 'password');

export const BadCode = refusal('mfa.badCode', 422, 'That code is not valid. Check your authenticator app and try again.', 'code');
export const MfaAlreadyEnabled = refusal('mfa.alreadyEnabled', 422, 'Two-factor authentication is already on.');
export const MfaNotEnabled = refusal('mfa.notEnabled', 422, 'Two-factor authentication is off.');
export const MfaNotStarted = refusal('mfa.notStarted', 422, 'Start the setup again.', 'code');

export const StartInFuture = refusal('habits.startInFuture', 422, 'The start date cannot be in the future.', 'started_on');
export const DateOutOfRange = refusal('habits.dateOutOfRange', 422, 'Pick a day between the start of this habit and today.', 'date');
export const HabitNotFound = refusal('goals.habitNotFound', 422, 'Choose one of your habits.', 'habit_id');

/** The server is over its load limits (`plugins/under-pressure.ts`); `params.retry_after` in seconds. */
export class Unavailable extends refusal('http.unavailable', 503, 'The server is busy. Try again in a few seconds.') {
  constructor(retryAfter: number) {
    super();
    this.params = { retry_after: retryAfter };
  }
}

/** One message per failing field in `errors`, and the rule each broke in `failures`; `message` is the first. */
export class ValidationFailed extends refusal('validation.failed', 422, '%s') {
  errors: Record<string, string[]>;
  failures: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, failures: Record<string, string[]>) {
    super(Object.values(errors)[0]?.[0] ?? 'The given data was invalid.');
    this.errors = errors;
    this.failures = failures;
  }
}

/** `params.retry_after` is the seconds until the fullest bucket empties. */
export class Throttled extends refusal('http.throttled', 429, 'Too many attempts. Try again in %s seconds.') {
  constructor(retryAfter: number) {
    super(retryAfter);
    this.params = { retry_after: retryAfter };
  }
}
