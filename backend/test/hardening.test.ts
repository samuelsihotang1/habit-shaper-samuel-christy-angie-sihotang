import Fastify from 'fastify';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, it } from 'node:test';
import { loggerOptions } from '@/lib/logging.ts';
import compress from '@/plugins/compress.ts';
import errors from '@/plugins/errors.ts';
import underPressure from '@/plugins/under-pressure.ts';
import { useApp } from './helpers.ts';

const app = useApp();

describe('hardening', () => {
  it('sends the security headers on API answers', async () => {
    const response = await app().inject({ method: 'GET', url: '/api/health' });

    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(response.headers['content-security-policy']);
  });

  it('compresses a large answer for a client that accepts it, and leaves a small one alone', async () => {
    const bare = Fastify({ logger: false });
    await bare.register(compress);
    bare.get('/large', async () => ({ items: Array.from({ length: 200 }, (_, n) => `item ${n}`) }));
    bare.get('/small', async () => ({ ok: true }));

    const large = await bare.inject({ method: 'GET', url: '/large', headers: { 'accept-encoding': 'gzip' } });
    const small = await bare.inject({ method: 'GET', url: '/small', headers: { 'accept-encoding': 'gzip' } });
    await bare.close();

    assert.equal(large.headers['content-encoding'], 'gzip');
    assert.equal(small.headers['content-encoding'], undefined);
  });

  it('refuses a body over 64 KiB before reading it', async () => {
    const response = await app().inject({ method: 'POST', url: '/api/auth/identify', payload: { email: 'a'.repeat(70 * 1024) } });

    assert.equal(response.statusCode, 413);
    assert.equal(response.json().success, false);
  });

  it('sheds load with a 503 in the envelope while the process is over its limits', async () => {
    const bare = Fastify({ logger: false });
    await bare.register(errors);
    await bare.register(underPressure, { thresholds: { maxHeapUsedBytes: 1, sampleInterval: 10 } });
    bare.get('/work', async () => ({ done: true }));
    await bare.ready();
    await sleep(50);

    const response = await bare.inject({ method: 'GET', url: '/work' });
    await bare.close();

    assert.equal(response.statusCode, 503);
    assert.equal(response.headers['retry-after'], '10');
    assert.equal(response.json().code, 'http.unavailable');
  });

  it('never writes a credential to the log', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const logged = Fastify({ logger: { ...loggerOptions('info'), stream } });
    logged.log.info({ req: { headers: { authorization: 'Bearer id|secret' } }, body: { password: 'hunter2', challenge: 'sealed' } }, 'request');
    await logged.close();

    const output = lines.join('');
    assert.ok(output.includes('[REDACTED]'));
    for (const secret of ['id|secret', 'hunter2', 'sealed']) assert.ok(!output.includes(secret), secret);
  });
});
