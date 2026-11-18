'use strict';
const { createHash } = require('node:crypto');
// Keep actionable locator metadata, not assertion payloads/SQL/answers or credentials.
function webFailure(error) {
  const message = String(error?.message ?? error ?? '')
    .replace(/P0-test-only![0-9a-f-]{36}/g, '[REDACTED_FIXTURE_SECRET]')
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      '[REDACTED_JWT]',
    )
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]');
  const lines = message
    .split(/\r?\n/)
    .filter(
      (line) =>
        /^(?:locator\.|page\.)|Call log:|waiting for (?:getBy|locator)|strict mode violation/.test(
          line,
        ) &&
        !/password|cookie|authorization|token|correct|matchingPairs|"answer"/i.test(
          line,
        ),
    );
  return {
    errorCategory: /strict mode violation/i.test(message)
      ? 'LOCATOR_STRICT_MODE'
      : /Timeout|timed out|exceeded/i.test(message)
        ? 'TIMEOUT'
        : 'ASSERTION_OR_OTHER',
    errorSHA256: createHash('sha256').update(message).digest('hex'),
    locatorDetails: lines.join('\n').slice(0, 1500),
  };
}
module.exports = { webFailure };
