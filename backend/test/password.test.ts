import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bearer, PASSWORD, count, db, register, registerWithMfa, totp, useApp } from './helpers.ts';

const app = useApp();
const NEW_PASSWORD = 'a brand new password';

const loginWith = (password: string) =>
  app().inject({ method: 'POST', url: '/api/login', payload: { email: 'ana@example.com', password } });

describe('changing the password', () => {
  it('needs the current one', async () => {
    const { token } = await register(app());
    const response = await app().inject({
      method: 'PUT',
      url: '/api/account/password',
      headers: bearer(token),
      payload: { current_password: 'not-it-at-all', password: NEW_PASSWORD, password_confirmation: NEW_PASSWORD },
    });

    assert.equal(response.statusCode, 422);
    const body = response.json();
    assert.equal(body.code, 'auth.wrongPassword');
    assert.equal(typeof body.errors.current_password[0], 'string');
  });

  it('keeps this session and signs every other one out', async () => {
    const { token } = await register(app());
    const other = (await loginWith(PASSWORD)).json().data.token;

    const response = await app().inject({
      method: 'PUT',
      url: '/api/account/password',
      headers: bearer(token),
      payload: { current_password: PASSWORD, password: NEW_PASSWORD, password_confirmation: NEW_PASSWORD },
    });

    assert.equal(response.statusCode, 200);
    assert.equal((await app().inject({ method: 'GET', url: '/api/me', headers: bearer(token) })).statusCode, 200);
    assert.equal((await app().inject({ method: 'GET', url: '/api/me', headers: bearer(other) })).statusCode, 401);
    assert.equal((await loginWith(NEW_PASSWORD)).statusCode, 200);
  });
});

describe('resetting the password with the authenticator', () => {
  const reset = (code: string, email = 'ana@example.com') =>
    app().inject({
      method: 'POST',
      url: '/api/auth/password/reset',
      payload: { email, code, password: NEW_PASSWORD, password_confirmation: NEW_PASSWORD },
    });

  it('is refused for an account without MFA', async () => {
    await register(app());
    const response = await reset('123456');

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'auth.resetNeedsMfa');
    assert.equal((await loginWith(PASSWORD)).statusCode, 200);
  });

  it('refuses a wrong code and changes nothing', async () => {
    await registerWithMfa(app());
    const response = await reset('000000');

    assert.equal(response.json().code, 'mfa.badCode');
    assert.equal((await loginWith(PASSWORD)).json().data.mfa_required, true);
  });

  it('sets the new password and signs out every session and trusted device', async () => {
    const { token, secret } = await registerWithMfa(app());
    const { challenge } = (await loginWith(PASSWORD)).json().data;
    await app().inject({ method: 'POST', url: '/api/auth/mfa', payload: { challenge, code: totp(secret), trust_device: true } });

    const response = await reset(totp(secret, 1));

    assert.equal(response.statusCode, 200);
    assert.equal((await app().inject({ method: 'GET', url: '/api/me', headers: bearer(token) })).statusCode, 401);
    assert.equal(await count('access_tokens'), 0);
    assert.equal(await count('trusted_devices'), 0);
    assert.equal((await loginWith(PASSWORD)).json().code, 'auth.invalidCredentials');
    assert.equal((await loginWith(NEW_PASSWORD)).json().data.mfa_required, true);
  });

  it('kills a challenge issued before the reset', async () => {
    const { secret } = await registerWithMfa(app());
    const { challenge } = (await loginWith(PASSWORD)).json().data;

    await reset(totp(secret));
    const response = await app().inject({ method: 'POST', url: '/api/auth/mfa', payload: { challenge, code: totp(secret, 1) } });

    assert.equal(response.json().code, 'auth.challengeExpired');
  });
});
