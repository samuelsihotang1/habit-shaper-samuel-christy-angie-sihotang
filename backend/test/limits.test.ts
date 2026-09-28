import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { buildApp } from '@/app.ts';
import { loadConfig } from '@/config.ts';
import { bearer, register, useApp } from './helpers.ts';

const app = useApp();

const identify = (email: unknown) => app().inject({ method: 'POST', url: '/api/auth/identify', payload: { email } });
const login = (payload: Record<string, unknown>) => app().inject({ method: 'POST', url: '/api/login', payload });

describe('rate limits', () => {
  it('counts a malformed request against a per-IP bucket', async () => {
    for (let i = 0; i < 20; i++) assert.equal((await identify('not-an-email')).statusCode, 422);

    const blocked = await identify('ana@example.com');
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.json().code, 'http.throttled');
  });

  it('counts a login against its address only once the body is valid', async () => {
    for (let i = 0; i < 6; i++) assert.equal((await login({ email: 'ana@example.com' })).statusCode, 422);
    for (let i = 0; i < 5; i++) assert.equal((await login({ email: 'ana@example.com', password: 'wrong-guess' })).json().code, 'auth.invalidCredentials');

    assert.equal((await login({ email: 'ana@example.com', password: 'wrong-guess' })).statusCode, 429);
  });

  it('shares one bucket between the routes that name it', async () => {
    const { token } = await register(app());
    const mfa = (step: string) => app().inject({ method: 'POST', url: `/api/account/mfa/${step}`, headers: bearer(token), payload: { code: '000000' } });

    for (let i = 0; i < 10; i++) assert.equal((await mfa('setup')).statusCode, 200);
    assert.equal((await mfa('confirm')).statusCode, 429);
  });

  it('keeps its counts in Redis, where two backends see the same ones', { skip: !process.env.TEST_REDIS_URL }, async () => {
    const config = { ...loadConfig(), redisUrl: process.env.TEST_REDIS_URL!, logLevel: 'silent' };
    const [first, second] = [await buildApp({ config, logger: false }), await buildApp({ config, logger: false })];
    const payload = { email: `redis-${randomUUID()}@example.com`, password: 'wrong-guess' };
    try {
      for (let i = 0; i < 5; i++) assert.equal((await first.inject({ method: 'POST', url: '/api/login', payload })).statusCode, 422);
      assert.equal((await second.inject({ method: 'POST', url: '/api/login', payload })).statusCode, 429);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });
});
