import type { FastifyInstance } from 'fastify';
import { createPool } from 'mysql2/promise';
import { after, afterEach, before, beforeEach } from 'node:test';
import { buildApp } from '@/app.ts';
import { loadConfig } from '@/config.ts';
import { first, poolOptions, run } from '@/db.ts';
import { counterAt, codeAt } from '@/lib/totp.ts';
import { migrate } from '@/migrate.ts';

const databaseUrl = process.env.DATABASE_URL ?? '';

/** The test's own view of the database, beside the app's pool. */
export const db = createPool(poolOptions(databaseUrl));

/** Rows of `table`, optionally only those matching `where`. */
export async function count(table: string, where = '1 = 1', params: unknown[] = []): Promise<number> {
  return (await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, params))!.n;
}

/**
 * A fresh app per test, so the in-memory rate limiter starts empty, over a
 * database migrated once and emptied before each test. DATABASE_URL must point
 * at a database that is safe to wipe; compose.yml's backend-test service uses
 * one of its own. APP_KEY comes from the environment (backend/.env, or
 * compose), like the server's.
 */
export function useApp(): () => FastifyInstance {
  let app: FastifyInstance;

  before(async () => {
    if (!databaseUrl.includes('test')) throw new Error('Refusing to run: DATABASE_URL does not name a test database.');
    await migrate(databaseUrl);
  });

  beforeEach(async () => {
    for (const table of ['goals', 'habit_logs', 'habits', 'trusted_devices', 'access_tokens', 'users']) await run(db, `DELETE FROM ${table}`);
    app = await buildApp({
      config: { ...loadConfig(), port: 0, host: '127.0.0.1', trustProxy: 'loopback', logLevel: 'silent' },
      logger: false,
    });
  });

  afterEach(async () => {
    await app?.close();
  });

  after(async () => {
    await db.end();
  });

  return () => app;
}

export const PASSWORD = 'correct horse battery';

export async function register(app: FastifyInstance, email = 'ana@example.com') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/register',
    payload: { name: 'Ana', email, password: PASSWORD, password_confirmation: PASSWORD },
  });
  const body = response.json();
  return { token: body.data.token as string, user: body.data.user as { id: string; email: string } };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** The code an authenticator would show `steps` steps from now. */
export function totp(secret: string, steps = 0): string {
  return codeAt(secret, counterAt(Date.now()) + steps);
}

/** Registers, turns MFA on, and returns what a test needs to sign in with it. */
export async function registerWithMfa(app: FastifyInstance, email = 'ana@example.com') {
  const { token, user } = await register(app, email);
  const setup = await app.inject({ method: 'POST', url: '/api/account/mfa/setup', headers: bearer(token) });
  const secret = setup.json().data.secret as string;
  await app.inject({
    method: 'POST',
    url: '/api/account/mfa/confirm',
    headers: bearer(token),
    payload: { code: totp(secret, -1) },
  });
  return { token, user, secret };
}
