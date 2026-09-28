import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '@/config.ts';

describe('config', () => {
  it('has no built-in APP_KEY: refuses to start without one from the environment', () => {
    assert.throws(() => loadConfig({}), /APP_KEY is not set/);
    assert.throws(() => loadConfig({ APP_KEY: '   ' }), /APP_KEY is not set/);
    assert.equal(loadConfig({ APP_KEY: 'from-the-env' }).appKey, 'from-the-env');
  });

  it('refuses a port or a log level it cannot use, instead of falling back', () => {
    assert.throws(() => loadConfig({ APP_KEY: 'key', PORT: 'eighty' }), /PORT/);
    assert.throws(() => loadConfig({ APP_KEY: 'key', LOG_LEVEL: 'loud' }), /LOG_LEVEL/);
    assert.equal(loadConfig({ APP_KEY: 'key', PORT: '8081' }).port, 8081);
  });
});
