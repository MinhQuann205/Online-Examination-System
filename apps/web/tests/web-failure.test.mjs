import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { webFailure } = createRequire(import.meta.url)(
  '../../../tests/web-failure.cjs',
);
test('browser timeout retains the exact locator without raw fixture secrets or JWT', () => {
  const secret = 'P0-test-only!10000000-0000-4000-8000-000000000001',
    jwt =
      'eyJfakeheaderabcdefghijklmnop.eyJfakepayloadabcdefghijklmnop.fakeSignatureabcdefghijklmnop';
  const result = webFailure(
    new Error(
      `locator.selectOption: Timeout 15000ms exceeded.\nCall log:\n - waiting for getByLabel('Đề thi', { exact: true })\n password: ${secret}\n token: ${jwt}`,
    ),
  );
  assert.equal(result.errorCategory, 'TIMEOUT');
  assert.match(result.locatorDetails, /getByLabel\('Đề thi'/);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(result).includes(jwt), false);
});
test('strict locator metadata is distinguished from timeouts and bounded', () => {
  const result = webFailure(
    new Error(
      "locator.click: strict mode violation: getByRole('link', { name: 'Giao bài' }) resolved to 2 elements\n" +
        'not a locator\n'.repeat(1000),
    ),
  );
  assert.equal(result.errorCategory, 'LOCATOR_STRICT_MODE');
  assert.match(result.locatorDetails, /resolved to 2 elements/);
  assert(result.locatorDetails.length <= 1500);
});
test('assertion bodies and correct-answer data are not retained as web diagnostics', () => {
  const result = webFailure(
    new Error(
      'Expected values to be strictly equal:\nactual: {"answer":"private-answer","matchingPairs":["private-key"]}\nexpected: secret',
    ),
  );
  assert.equal(result.errorCategory, 'ASSERTION_OR_OTHER');
  assert.equal(result.locatorDetails, '');
  assert.equal(JSON.stringify(result).includes('private-answer'), false);
  assert.equal(JSON.stringify(result).includes('private-key'), false);
});
