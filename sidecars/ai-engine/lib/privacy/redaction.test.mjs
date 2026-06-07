import assert from 'node:assert/strict';
import test from 'node:test';

import { runRedactionWorkflow } from './redaction.mjs';

test('redacts nested sensitive keys and text patterns', () => {
  const { redactedValue, report } = runRedactionWorkflow({
    user: {
      email: 'alice@example.com',
      note: 'Call +1 (415) 555-2671 with token=abc123',
      profile: {
        ssn: '123-45-6789',
      },
    },
    headers: {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
    },
  });

  assert.equal(redactedValue.user.email, '[REDACTED]');
  assert.equal(redactedValue.user.profile.ssn, '[REDACTED]');
  assert.match(redactedValue.user.note, /\[REDACTED_PHONE\]/);
  assert.match(redactedValue.user.note, /\[REDACTED_SECRET\]/);
  assert.equal(redactedValue.headers.authorization, '[REDACTED]');
  assert.ok(report.redactionCount >= 5);
  assert.ok(report.categories.includes('key:email'));
  assert.ok(report.categories.includes('key:authorization'));
});

test('redacts sensitive URL params while preserving URL structure', () => {
  const { redactedValue, report } = runRedactionWorkflow({
    url: 'https://app.test/reset?email=alice@example.com&token=abc123&id=42',
  });

  assert.equal(
    redactedValue.url,
    'https://app.test/reset?email=[REDACTED]&token=[REDACTED]&id=42'
  );
  assert.ok(report.categories.includes('url-param'));
});

test('reports zero redactions when no sensitive values are detected', () => {
  const { redactedValue, report } = runRedactionWorkflow({
    url: 'https://app.test/products?page=2',
    title: 'Products',
    httpStatus: 200,
  });

  assert.deepEqual(redactedValue, {
    url: 'https://app.test/products?page=2',
    title: 'Products',
    httpStatus: 200,
  });
  assert.equal(report.redactionCount, 0);
  assert.deepEqual(report.categories, []);
});
