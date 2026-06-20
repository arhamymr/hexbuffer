/**
 * Output content guard — scans AI-generated output for dangerous content
 * before it reaches the frontend.
 */

const BLOCKED_PATTERNS = [
  // Generated exploit code
  /\b(?:exploit|payload)\s*(?:class|function|def|module|script|code)\b/i,
  /(?:reverse|bind)\s*shell\s*(?:in|with|using)?\s*(?:python|bash|perl|ruby|php|node|powershell)/i,

  // Malware indicators
  /\b(?:ransomware|keylogger|rootkit|backdoor|trojan)\s+(?:generator|builder|creator|kit)\b/i,

  // Credential dump formats
  /\b(?:username|email|password|hash):\s*\S+\s*\n(?:\w+:\s*\S+\s*\n){3,}/i,

  // Actual secret values that may have slipped through
  /\b(?:sk_live|pk_live|ghp_|AKIA|ASIA)[A-Za-z0-9_-]{20,}\b/,
  /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/,

  // Phishing templates
  /(?:phishing|fake)\s+(?:page|site|login|email)\s+(?:template|generator|kit)\b/i,

  // Evasion techniques
  /\b(?:bypass|evade|disable)\s+(?:antivirus|AV|EDR|defender|firewall|detection)\b/i,
];

const WARN_PATTERNS = [
  // SQL injection examples with destructive payloads
  /(?:DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE)\s+\w+/i,
  // XSS with data exfiltration
  /<script>.*?(?:fetch|XMLHttpRequest|navigator\.sendBeacon).*?<\/script>/i,
  // Code execution
  /\b(?:eval|exec|system|os\.system|subprocess\.call)\s*\(.*?(?:rm\s+-rf|del\s+\/F)/i,
];

/**
 * Check AI output for dangerous content.
 * Returns { blocked: true, reason } if content should be blocked,
 * { warn: true, reason } if it should show a warning,
 * or { blocked: false } if safe.
 */
export function guardOutput(text) {
  if (!text || typeof text !== 'string') {
    return { blocked: false };
  }

  // Check block patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: 'dangerous_content',
        pattern: pattern.source.slice(0, 60),
      };
    }
  }

  // Check warn patterns
  for (const pattern of WARN_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: false,
        warn: true,
        reason: 'sensitive_pattern',
        pattern: pattern.source.slice(0, 60),
      };
    }
  }

  return { blocked: false };
}

/**
 * Redact any secrets that may have been included in AI output.
 * This is a safety net — the redaction module handles most cases,
 * but if the AI generates a secret-looking string, this catches it.
 */
export function redactOutput(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Redact common secret patterns
  return text
    // GitHub tokens
    .replace(/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, '[REDACTED_TOKEN]')
    // AWS keys
    .replace(/(?:AKIA|ASIA)[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
    // Stripe keys
    .replace(/(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}/g, '[REDACTED_STRIPE_KEY]')
    // Generic base64-like long strings
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, (match) => {
      // Only redact if it looks like a token (has mixed case and digits)
      if (/[A-Z]/.test(match) && /[a-z]/.test(match) && /[0-9]/.test(match)) {
        return '[REDACTED_STRING]';
      }
      return match;
    });
}
