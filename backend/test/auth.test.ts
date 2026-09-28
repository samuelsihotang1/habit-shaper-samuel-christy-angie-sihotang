import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bearer, PASSWORD, count, db, register, useApp } from './helpers.ts';

const app = useApp();

describe('register', () => {
  it('creates the account and answers with a session', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/register',
      payload: { name: 'Ana', email: '  Ana@Example.COM ', password: PASSWORD, password_confirmation: PASSWORD },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json();
    assert.equal(body.success, true);
    assert.partialDeepStrictEqual(body.data.user, { name: 'Ana', email: 'ana@example.com', mfa_enabled: false });
    assert.match(body.data.token, /^[0-9a-f-]{36}\|.+/);
  });

  it('never sends the password hash or the MFA secret', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: PASSWORD, password_confirmation: PASSWORD },
    });

    assert.doesNotMatch(response.body, /password_hash|passwordHash|mfa_secret|mfaSecret|\$argon2/);
  });

  it('stores the password as an argon2id hash, never as it was typed', async () => {
    const { user } = await register(app());
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [user.id]);
    const stored = (rows as { password_hash: string }[])[0]!.password_hash;

    assert.match(stored, /^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    assert.ok(!stored.includes(PASSWORD));
  });

  it('refuses a taken email, whatever its case', async () => {
    await register(app());
    const response = await app().inject({
      method: 'POST',
      url: '/api/register',
      payload: { name: 'Ana', email: 'ANA@example.com', password: PASSWORD, password_confirmation: PASSWORD },
    });

    assert.equal(response.statusCode, 422);
    const body = response.json();
    assert.equal(body.code, 'auth.emailTaken');
    assert.equal(typeof body.errors.email[0], 'string');
  });

  it('refuses a short password and a mismatched confirmation, per field', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'short', password_confirmation: 'other' },
    });

    assert.equal(response.statusCode, 422);
    const body = response.json();
    assert.equal(body.code, 'validation.failed');
    assert.ok(Object.keys(body.errors).includes('password'));
  });
});

describe('identify', () => {
  it('says whether an address has an account', async () => {
    await register(app());

    const known = await app().inject({ method: 'POST', url: '/api/auth/identify', payload: { email: 'ANA@example.com' } });
    const unknown = await app().inject({ method: 'POST', url: '/api/auth/identify', payload: { email: 'bob@example.com' } });

    assert.deepEqual(known.json().data, { exists: true });
    assert.deepEqual(unknown.json().data, { exists: false });
  });
});

describe('login', () => {
  it('answers a correct password with a working token', async () => {
    await register(app());
    const login = await app().inject({
      method: 'POST',
      url: '/api/login',
      payload: { email: 'ana@example.com', password: PASSWORD },
    });

    assert.equal(login.statusCode, 200);
    const me = await app().inject({ method: 'GET', url: '/api/me', headers: bearer(login.json().data.token) });
    assert.equal(me.json().data.email, 'ana@example.com');
  });

  it('refuses a wrong password and an unknown email with the same answer', async () => {
    await register(app());
    const wrong = await app().inject({ method: 'POST', url: '/api/login', payload: { email: 'ana@example.com', password: 'nope-nope' } });
    const unknown = await app().inject({ method: 'POST', url: '/api/login', payload: { email: 'bob@example.com', password: 'nope-nope' } });

    assert.equal(wrong.statusCode, 422);
    assert.equal(wrong.json().code, 'auth.invalidCredentials');
    assert.deepEqual(unknown.json(), wrong.json());
  });

  it('throttles guessing at one address', async () => {
    await register(app());
    const attempt = () =>
      app().inject({ method: 'POST', url: '/api/login', payload: { email: 'ana@example.com', password: 'wrong-guess' } });

    for (let i = 0; i < 5; i++) assert.equal((await attempt()).statusCode, 422);
    const blocked = await attempt();

    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.json().code, 'http.throttled');
    assert.ok(blocked.headers['retry-after']);
  });
});

describe('sessions', () => {
  it('has no expiry: a token months old still works', async () => {
    const { token } = await register(app());
    const longAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    await db.query('UPDATE access_tokens SET created_at = ?, last_used_at = ?', [longAgo, longAgo]);

    const me = await app().inject({ method: 'GET', url: '/api/me', headers: bearer(token) });
    assert.equal(me.statusCode, 200);
  });

  it('logout kills the token it was sent with', async () => {
    const { token } = await register(app());

    const logout = await app().inject({ method: 'POST', url: '/api/logout', headers: bearer(token) });
    const me = await app().inject({ method: 'GET', url: '/api/me', headers: bearer(token) });

    assert.equal(logout.statusCode, 200);
    assert.equal(me.statusCode, 401);
    assert.partialDeepStrictEqual(me.json(), { success: false, code: 'auth.unauthenticated' });
  });

  it('refuses a missing, malformed, or forged token', async () => {
    const { token } = await register(app());
    const [id] = token.split('|');

    for (const headers of [{}, { authorization: 'Bearer nonsense' }, bearer(`${id}|forged-secret`)]) {
      const response = await app().inject({ method: 'GET', url: '/api/me', headers });
      assert.equal(response.statusCode, 401);
    }
  });
});

describe('the envelope', () => {
  it('answers an unknown route with a 404 in the same shape', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/nothing-here' });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { success: false, message: 'Not found.', code: 'http.notFound' });
  });

  it('answers malformed JSON with a 400, not a 500', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/api/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().success, false);
  });
});
