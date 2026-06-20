/**
 * Prompt injection filter — checks inbound messages for known injection patterns
 * before they reach the AI model.
 */

const INJECTION_PATTERNS = [
  // System prompt extraction
  /\b(?:ignore|forget|disregard)\s+(?:all\s+)?(?:previous|prior|above|your)\s+(?:instructions?|rules?|prompts?|guidelines?|directives?)/i,
  /\b(?:tell|show|reveal|print|output|display|repeat)\s+(?:me\s+)?(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
  /what\s+(?:is|are)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?|rules?)/i,

  // Role-playing attacks
  /\byou\s+(?:are|now|act\s+as)\s+(?:DAN|jailbreak|unfiltered|unrestricted|evil|malicious)\b/i,
  /\bpretend\s+(?:you\s+are|to\s+be)\s+(?:an?\s+)?(?:unfiltered|unrestricted|evil|malicious)\b/i,
  /\byou\s+are\s+no\s+longer\s+(?:an?\s+)?(?:AI|assistant|language\s+model)/i,

  // Authority override
  /\b(?:new\s+)?(?:system|master|admin|root)\s+(?:prompt|instruction|override|command)\s*:/i,
  /override\s+(?:all\s+)?(?:safety|security|content|ethical)\s+(?:restrictions?|policies?|filters?|rules?)/i,

  // Goal hijacking
  /\byour\s+(?:new|primary|only|main)\s+(?:goal|task|purpose|objective|job)\s+(?:is|now)\s+to\b/i,
  /\bfrom\s+now\s+on\s*,?\s*(?:you|your)\s+(?:are|will|must|should)\b/i,

  // Token/context smuggling
  /\[\[system\]\]|\[\[assistant\]\]|\[\[user\]\]/i,
  /<\|system\|>|<\|assistant\|>|<\|user\|>/i,
];

const HIGH_RISK_KEYWORDS = [
  'exploit', 'payload', 'reverse shell', 'backdoor', 'keylogger',
  'ransomware', 'rootkit', 'trojan', 'malware', 'phishing',
  'credential stuffing', 'brute force', 'sql injection payload',
  'xss payload', 'command injection',
];

/**
 * Check if a message contains prompt injection patterns.
 * Returns { blocked: true, reason: string } if blocked.
 */
export function filterPrompt(message) {
  if (!message || typeof message !== 'string') {
    return { blocked: false };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { blocked: false };
  }

  // Check injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        blocked: true,
        reason: 'prompt_injection',
        pattern: pattern.source.slice(0, 60),
      };
    }
  }

  return { blocked: false };
}

/**
 * Check if a message contains high-risk keywords that warrant
 * extra scrutiny (but don't necessarily block).
 */
export function assessRisk(message) {
  if (!message || typeof message !== 'string') {
    return { risk: 'none', matches: [] };
  }

  const lower = message.toLowerCase();
  const matches = HIGH_RISK_KEYWORDS.filter((kw) => lower.includes(kw));

  if (matches.length === 0) {
    return { risk: 'none', matches: [] };
  }

  return {
    risk: matches.length > 2 ? 'high' : 'medium',
    matches,
  };
}
