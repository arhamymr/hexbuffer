const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /csrf/i,
  /email/i,
  /jwt/i,
  /mfa/i,
  /otp/i,
  /pass(?:word)?/i,
  /secret/i,
  /session/i,
  /ssn/i,
  /token/i,
];

const TEXT_PATTERNS = [
  { category: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]' },
  { category: 'phone', pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
  { category: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { category: 'payment-card', pattern: /\b(?:\d[ -]*?){13,19}\b/g, replacement: '[REDACTED_PAYMENT_CARD]' },
  { category: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replacement: '[REDACTED_JWT]' },
  { category: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  {
    category: 'secret-assignment',
    pattern: /(?<![?&])\b(?:token|api[_-]?key|secret|password|passwd|pwd)\s*[:=]\s*["']?[^"'\s&;,]+["']?/gi,
    replacement: '[REDACTED_SECRET]',
  },
];

const SENSITIVE_URL_PARAM_PATTERN =
  /([?&](?:access[_-]?token|api[_-]?key|auth|code|email|jwt|key|mfa|otp|pass(?:word)?|refresh[_-]?token|secret|session|token)=)[^&#\s]+/gi;

function createReportState() {
  return {
    redactionCount: 0,
    categories: new Set(),
  };
}

function record(state, category, count = 1) {
  if (count <= 0) return;
  state.redactionCount += count;
  state.categories.add(category);
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches?.length ?? 0;
}

function redactText(text, state) {
  let redacted = text.replace(SENSITIVE_URL_PARAM_PATTERN, (match, prefix) => {
    record(state, 'url-param');
    return `${prefix}${REDACTED}`;
  });

  for (const item of TEXT_PATTERNS) {
    const count = countMatches(redacted, item.pattern);
    if (count > 0) {
      record(state, item.category, count);
      redacted = redacted.replace(item.pattern, item.replacement);
    }
  }

  return redacted;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value, state, key = '') {
  if (isSensitiveKey(key) && (!value || typeof value !== 'object')) {
    record(state, `key:${key}`);
    return REDACTED;
  }

  if (typeof value === 'string') {
    return redactText(value, state);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, state));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, state, entryKey),
      ])
    );
  }

  return value;
}

function previewValue(value) {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= 12000) {
    return value;
  }

  return {
    previewTruncated: true,
    serializedPreview: `${serialized.slice(0, 12000)}...`,
  };
}

export function runRedactionWorkflow(value) {
  const state = createReportState();
  const redactedValue = redactValue(value, state);
  const categories = [...state.categories].sort();

  return {
    redactedValue,
    report: {
      enabled: true,
      redactionCount: state.redactionCount,
      categories,
      redactedPreview: previewValue(redactedValue),
    },
  };
}
