import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { Ok, ok } from '@/lib/http.ts';
import { authOf } from '@/plugins/auth.ts';
import { HOUR, MINUTE, type Bucket } from '@/plugins/rate-limit.ts';
import {
  IdentifyBody,
  LoginBody,
  MfaBody,
  MfaChallengeSchema,
  RegisterBody,
  ResetBody,
  SessionSchema,
} from '@/modules/auth/schemas.ts';
import { UserSchema } from '@/modules/users/schemas.ts';
import { serializeUser } from '@/modules/users/serialize.ts';

/** `/register`, `/login` and `/logout` sit at the root of `/api`, not under `/auth`. */
export const prefixOverride = '';

type Emailed = { body: { email: string } };
type Challenged = { body: { challenge: string } };

const identify: Bucket = { name: 'identify', max: 20, windowMs: MINUTE, key: (request) => `identify:${request.ip}` };
const register: Bucket = { name: 'register', max: 20, windowMs: HOUR, key: (request) => `register:${request.ip}` };

/*
 * Login counts per email + IP, per email, and per IP at once, so that a
 * carrier's shared IP does not lock out everyone behind it while one address
 * still cannot be guessed at from many IPs.
 */
const login: Bucket[] = [
  { name: 'login', max: 5, windowMs: MINUTE, afterValidation: true, key: (request) => `login:${(request as Emailed).body.email}|${request.ip}` },
  { name: 'login-email', max: 10, windowMs: 15 * MINUTE, afterValidation: true, key: (request) => `login:${(request as Emailed).body.email}` },
  { name: 'login-ip', max: 60, windowMs: MINUTE, key: (request) => `login-ip:${request.ip}` },
];

// Six digits are only strong while guesses are few: per IP, and per challenge.
const mfa: Bucket[] = [
  { name: 'mfa', max: 10, windowMs: MINUTE, key: (request) => `mfa:${request.ip}` },
  {
    name: 'mfa-challenge',
    max: 5,
    windowMs: 5 * MINUTE,
    afterValidation: true,
    key: (request) => `mfa-challenge:${(request as Challenged).body.challenge.slice(-32)}`,
  },
];

const reset: Bucket[] = [
  { name: 'reset', max: 5, windowMs: 15 * MINUTE, afterValidation: true, key: (request) => `reset:${(request as Emailed).body.email}|${request.ip}` },
  { name: 'reset-email', max: 10, windowMs: HOUR, afterValidation: true, key: (request) => `reset:${(request as Emailed).body.email}` },
];

const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const auth = app.services.auth;

  app.post(
    '/auth/identify',
    { config: { limits: [identify] }, schema: { body: IdentifyBody, response: { 200: Ok(Type.Object({ exists: Type.Boolean() })) } } },
    async (request) => ok(await auth.identify(request.body.email)),
  );

  app.post('/register', { config: { limits: [register] }, schema: { body: RegisterBody, response: { 201: Ok(SessionSchema) } } }, async (request, reply) => {
    reply.status(201);
    return ok(await auth.register(request.body), 'Account created.');
  });

  app.post(
    '/login',
    { config: { limits: login }, schema: { body: LoginBody, response: { 200: Ok(Type.Union([SessionSchema, MfaChallengeSchema])) } } },
    async (request) => ok(await auth.login(request.body)),
  );

  app.post('/auth/mfa', { config: { limits: mfa }, schema: { body: MfaBody, response: { 200: Ok(SessionSchema) } } }, async (request) =>
    ok(await auth.verifyMfa(request.body, request.headers['user-agent'])),
  );

  app.post('/auth/password/reset', { config: { limits: reset }, schema: { body: ResetBody, response: { 200: Ok(Type.Null()) } } }, async (request) => {
    await auth.resetPassword(request.body);
    return ok(null, 'Password changed. Sign in with your new password.');
  });

  await app.register(async (session) => {
    session.addHook('onRequest', app.authenticate);

    session.post('/logout', { schema: { response: { 200: Ok(Type.Null()) } } }, async (request) => {
      await auth.logout(authOf(request).tokenId);
      return ok(null, 'Signed out.');
    });

    session.get('/me', { schema: { response: { 200: Ok(UserSchema) } } }, async (request) => ok(serializeUser(authOf(request).user)));
  });
};

export default authRoutes;
