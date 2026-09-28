import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { CHALLENGE_TTL_MS } from '@/lib/challenge.ts';
import { bearer, PASSWORD, count, db, register, registerWithMfa, totp, useApp } from './helpers.ts';

const app = useApp();

const login = (extra: Record<string, unknown> = {}) =>
  app().inject({ method: 'POST', url: '/api/login', payload: { email: 'ana@example.com', password: PASSWORD, ...extra } });

const answer = (challenge: string, code: string, extra: Record<string, unknown> = {}) =>
  app().inject({ method: 'POST', url: '/api/auth/mfa', payload: { challenge, code, ...extra } });

afterEach(() => {
  mock.timers.reset();
});

describe('turning MFA on', () => {
  it('is not on until a code from the new secret is confirmed', async () => {
    const { token } = await register(app());
    const setup = await app().inject({ method: 'POST', url: '/api/account/mfa/setup', headers: bearer(token) });
    const { secret, otpauth_url } = setup.json().data;

    assert.ok(otpauth_url.includes(`secret=${secret}`));
    assert.ok((await login()).json().data.token);

    const wrong = await app().inject({ method: 'POST', url: '/api/account/mfa/confirm', headers: bearer(token), payload: { code: '000000' } });
    assert.equal(wrong.json().code, 'mfa.badCode');

    const right = await app().inject({ method: 'POST', url: '/api/account/mfa/confirm', headers: bearer(token), payload: { code: totp(secret) } });
    assert.equal(right.json().data.mfa_enabled, true);
  });

  it('stores the secret encrypted', async () => {
    const { user, secret } = await registerWithMfa(app());
    const [rows] = await db.query('SELECT mfa_secret FROM users WHERE id = ?', [user.id]);
    const stored = (rows as { mfa_secret: string | null }[])[0]!.mfa_secret;

    assert.notEqual(stored, null);
    assert.ok(!stored!.includes(secret));
  });
});

describe('signing in with MFA', () => {
  it('answers the password with a challenge and no token', async () => {
    await registerWithMfa(app());
    const body = (await login()).json().data;

    assert.deepEqual(Object.keys(body).sort(), ['challenge', 'mfa_required']);
    assert.equal(body.mfa_required, true);
    assert.equal(typeof body.challenge, 'string');
  });

  it('turns a challenge and a code into a session', async () => {
    const { secret } = await registerWithMfa(app());
    const { challenge } = (await login()).json().data;

    const response = await answer(challenge, totp(secret));
    assert.equal(response.statusCode, 200);
    assert.ok(response.json().data.token);
  });

  it('refuses a wrong code', async () => {
    await registerWithMfa(app());
    const { challenge } = (await login()).json().data;

    const response = await answer(challenge, '123456');
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'mfa.badCode');
  });

  it('accepts each code once', async () => {
    const { secret } = await registerWithMfa(app());
    const code = totp(secret, 1);

    const first = await answer((await login()).json().data.challenge, code);
    const replay = await answer((await login()).json().data.challenge, code);

    assert.equal(first.statusCode, 200);
    assert.equal(replay.json().code, 'mfa.badCode');
  });

  it('refuses a challenge older than its lifetime', async () => {
    const { secret } = await registerWithMfa(app());
    const { challenge } = (await login()).json().data;

    // Only the clock: Fastify and the database driver still need real timers to answer.
    mock.timers.enable({ apis: ['Date'], now: Date.now() + CHALLENGE_TTL_MS + 1000 });

    const response = await answer(challenge, totp(secret));
    assert.equal(response.json().code, 'auth.challengeExpired');
  });

  it('refuses a forged challenge', async () => {
    const { secret } = await registerWithMfa(app());
    const response = await answer('not-a-real-challenge', totp(secret));

    assert.equal(response.json().code, 'auth.challengeExpired');
  });

  it('lets a trusted device skip the prompt, and only that device', async () => {
    const { secret } = await registerWithMfa(app());
    const { challenge } = (await login()).json().data;
    const deviceToken = (await answer(challenge, totp(secret, 1), { trust_device: true })).json().data.device_token;

    assert.ok((await login({ device_token: deviceToken })).json().data.token);
    assert.equal((await login()).json().data.mfa_required, true);
    assert.equal((await login({ device_token: `${deviceToken.split('|')[0]}|forged` })).json().data.mfa_required, true);
  });
});

describe('turning MFA off', () => {
  it('needs the password and a code, and forgets every trusted device', async () => {
    const { token, secret } = await registerWithMfa(app());
    const { challenge } = (await login()).json().data;
    await answer(challenge, totp(secret), { trust_device: true });

    const noPassword = await app().inject({
      method: 'POST', url: '/api/account/mfa/disable', headers: bearer(token), payload: { password: 'wrong-one', code: totp(secret, 1) },
    });
    assert.equal(noPassword.json().code, 'auth.wrongPassword');

    const off = await app().inject({
      method: 'POST', url: '/api/account/mfa/disable', headers: bearer(token), payload: { password: PASSWORD, code: totp(secret, 1) },
    });
    assert.equal(off.json().data.mfa_enabled, false);
    assert.equal(await count('trusted_devices'), 0);
    assert.ok((await login()).json().data.token);
  });
});

describe('trusted devices', () => {
  it('can be listed and removed, but never someone else’s', async () => {
    const ana = await registerWithMfa(app(), 'ana@example.com');
    const { challenge } = (await login()).json().data;
    await answer(challenge, totp(ana.secret), { trust_device: true });
    const bob = await register(app(), 'bob@example.com');

    const list = await app().inject({ method: 'GET', url: '/api/account/devices', headers: bearer(ana.token) });
    const [device] = list.json().data;
    assert.equal(typeof device.id, 'string');
    assert.equal(typeof device.user_agent, 'string');
    assert.equal(device.token_hash, undefined);

    const stranger = await app().inject({ method: 'DELETE', url: `/api/account/devices/${device.id}`, headers: bearer(bob.token) });
    assert.equal(stranger.statusCode, 404);

    const owner = await app().inject({ method: 'DELETE', url: `/api/account/devices/${device.id}`, headers: bearer(ana.token) });
    assert.equal(owner.statusCode, 200);
    assert.equal(await count('trusted_devices'), 0);
  });

  it('"all" removes only the caller’s own, and is not read as an id', async () => {
    const ana = await registerWithMfa(app(), 'ana@example.com');
    await answer((await login()).json().data.challenge, totp(ana.secret), { trust_device: true });
    const bob = await registerWithMfa(app(), 'bob@example.com');
    const bobLogin = await app().inject({ method: 'POST', url: '/api/login', payload: { email: 'bob@example.com', password: PASSWORD } });
    await answer(bobLogin.json().data.challenge, totp(bob.secret), { trust_device: true });

    const response = await app().inject({ method: 'DELETE', url: '/api/account/devices/all', headers: bearer(ana.token) });

    assert.equal(response.statusCode, 200);
    assert.equal(await count('trusted_devices', 'user_id = ?', [ana.user.id]), 0);
    assert.equal(await count('trusted_devices', 'user_id = ?', [bob.user.id]), 1);
  });
});
