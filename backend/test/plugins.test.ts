import Fastify from 'fastify';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EmailTaken, Throttled, ValidationFailed } from '@/lib/errors.ts';
import errors from '@/plugins/errors.ts';

// The errors plugin alone, on a bare Fastify: no database, no other plugin.
async function appThrowing(error: Error) {
  const app = Fastify({ logger: false });
  await app.register(errors);
  app.get('/boom', async () => {
    throw error;
  });
  return app;
}

describe('the errors plugin', () => {
  it('sends a refusal with its code as written, its field and its params', async () => {
    const response = await (await appThrowing(new EmailTaken())).inject({ method: 'GET', url: '/boom' });

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.json(), {
      success: false,
      message: 'An account with this email already exists.',
      code: 'auth.emailTaken',
      params: {},
      errors: { email: ['An account with this email already exists.'] },
    });
  });

  it('sends a validation failure with every field and the rule it broke', async () => {
    const failed = new ValidationFailed({ name: ['Enter your name.'] }, { name: ['too_small'] });
    const response = await (await appThrowing(failed)).inject({ method: 'GET', url: '/boom' });

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.json(), {
      success: false,
      message: 'Enter your name.',
      code: 'validation.failed',
      errors: { name: ['Enter your name.'] },
      failures: { name: ['too_small'] },
    });
  });

  it('tells a throttled client when to come back, in the body and the header', async () => {
    const response = await (await appThrowing(new Throttled(42))).inject({ method: 'GET', url: '/boom' });

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers['retry-after'], '42');
    assert.equal(response.json().message, 'Too many attempts. Try again in 42 seconds.');
    assert.deepEqual(response.json().params, { retry_after: 42 });
  });

  it('turns anything unexpected into a flat 500 that says nothing about it', async () => {
    const response = await (await appThrowing(new Error("Duplicate entry 'ana@example.com' for key 'users_email_key'"))).inject({
      method: 'GET',
      url: '/boom',
    });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.json(), { success: false, message: 'Server error.', code: 'http.serverError' });
  });
});
