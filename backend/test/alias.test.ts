import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hook = fileURLToPath(new URL('../src/alias.ts', import.meta.url));

// A child Node with only the flags given: this test process already loads the hook, so it cannot tell.
const resolveWith = (args: string[], specifier: string) =>
  execFileSync(process.execPath, [...args, '--input-type=module', '-e', `console.log(import.meta.resolve('${specifier}'))`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

describe('@/ alias at runtime', () => {
  it('resolves @/ against the directory the hook is loaded from', () => {
    assert.equal(resolveWith(['--import', pathToFileURL(hook).href], '@/alias.ts'), pathToFileURL(hook).href);
  });

  it('leaves bare package specifiers alone', () => {
    assert.ok(resolveWith(['--import', pathToFileURL(hook).href], 'fastify').includes('/node_modules/fastify/'));
  });

  it('fails without the hook, which is why every start command loads it', () => {
    assert.throws(() => resolveWith([], '@/alias.ts'));
  });
});
