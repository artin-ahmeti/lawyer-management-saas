import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const mobileRequire = createRequire(new URL('../package.json', import.meta.url));
const nativeRequire = createRequire(mobileRequire.resolve('react-native/package.json'));
const toolsRequire = createRequire(nativeRequire.resolve('react-devtools-core/package.json'));
const shell = toolsRequire('shell-quote');

test('native tooling rejects command injection through tokens following shell comments', () => {
  // GHSA-pqg4-j6r4-53mv: inspect quoting only; never execute these strings in a shell.
  for (const separator of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(
      () => shell.quote(['echo', 'ok', { comment: 'x' }, `a${separator}id;#`]),
      TypeError,
    );
  }
  assert.deepEqual(shell.parse('code --goto "file with spaces.ts:12"'), [
    'code',
    '--goto',
    'file with spaces.ts:12',
  ]);
  assert.equal(shell.quote(['code', 'file with spaces.ts']), "code 'file with spaces.ts'");
});
