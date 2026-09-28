import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bearer, PASSWORD, register, useApp } from './helpers.ts';

const app = useApp();

const post = (url: string, payload: Record<string, unknown>, headers = {}) => app().inject({ method: 'POST', url, payload, headers });

describe('route schemas', () => {
  it('names every missing field with its own sentence', async () => {
    const response = await post('/api/register', {});

    assert.equal(response.statusCode, 422);
    const body = response.json();
    assert.equal(body.code, 'validation.failed');
    assert.deepEqual(body.errors, {
      name: ['Enter your name.'],
      email: ['Enter your email address.'],
      password: ['Choose a password.'],
      password_confirmation: ['Repeat the password.'],
    });
    assert.deepEqual(body.failures.name, ['required']);
  });

  it('trims before it measures, and compares the confirmation with the password', async () => {
    const response = await post('/api/register', { name: '   ', email: 'not-an-email', password: 'short', password_confirmation: 'other' });

    assert.deepEqual(response.json().errors, {
      name: ['Enter your name.'],
      email: ['Enter a valid email address.'],
      password: ['Use at least 8 characters.'],
      password_confirmation: ['The passwords do not match.'],
    });
  });

  it('answers with exactly the keys the response schema lists', async () => {
    await register(app());
    const login = await post('/api/login', { email: 'ana@example.com', password: PASSWORD });
    const me = await app().inject({ method: 'GET', url: '/api/me', headers: bearer(login.json().data.token) });

    assert.deepEqual(Object.keys(me.json()).sort(), ['data', 'success']);
    assert.deepEqual(Object.keys(me.json().data).sort(), ['created_at', 'email', 'id', 'mfa_enabled', 'name']);
  });
});
