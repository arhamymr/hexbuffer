import type { JwtAlgorithm, JwtDecoded, JwtVulnerability } from '../types';

// ── Base64url ─────────────────────────────────────────────

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return atob(base64);
  }
}

export function base64UrlEncode(str: string): string {
  const encoded = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  const encoded = btoa(binary);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Decode ────────────────────────────────────────────────

export function decodeJwt(token: string): JwtDecoded | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
      algorithm: String(header.alg ?? 'unknown'),
      parts: parts as [string, string, string],
    };
  } catch {
    return null;
  }
}

// ── Timestamp formatting ──────────────────────────────────

export function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  const epoch = value > 1e12 ? value / 1000 : value;
  const date = new Date(epoch * 1000);
  if (isNaN(date.getTime())) return null;

  const formatted = date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  const now = Date.now() / 1000;
  const diffSec = epoch - now;
  const absDiff = Math.abs(diffSec);

  let relative: string;
  if (absDiff < 60) relative = `${Math.round(absDiff)}s`;
  else if (absDiff < 3600) relative = `${Math.round(absDiff / 60)}m`;
  else if (absDiff < 86400) relative = `${Math.round(absDiff / 3600)}h`;
  else relative = `${Math.round(absDiff / 86400)}d`;

  const direction = diffSec < 0 ? `${relative} ago` : `in ${relative}`;
  return `${formatted} (${direction})`;
}

// ── Vulnerabilities ───────────────────────────────────────

export function checkVulnerabilities(decoded: JwtDecoded): JwtVulnerability[] {
  const findings: JwtVulnerability[] = [];
  const alg = decoded.algorithm.toLowerCase();

  if (alg === 'none') {
    findings.push({
      id: 'none-alg',
      severity: 'critical',
      title: "Algorithm set to 'none'",
      description:
        'The token uses the "none" algorithm, which disables signature verification. An attacker can forge arbitrary tokens.',
    });
  }

  const now = Date.now() / 1000;

  if (typeof decoded.payload.exp === 'number') {
    const exp = decoded.payload.exp > 1e12 ? decoded.payload.exp / 1000 : decoded.payload.exp;
    if (exp < now) {
      findings.push({
        id: 'expired',
        severity: 'high',
        title: 'Token has expired',
        description: `The exp claim (${exp}) is in the past. This token should no longer be valid.`,
      });
    }
  } else {
    findings.push({
      id: 'missing-exp',
      severity: 'medium',
      title: 'No expiration claim',
      description: 'The token has no exp claim. Without expiration, tokens never expire unless enforced server-side.',
    });
  }

  if (typeof decoded.payload.nbf === 'number') {
    const nbf = decoded.payload.nbf > 1e12 ? decoded.payload.nbf / 1000 : decoded.payload.nbf;
    if (nbf > now) {
      findings.push({
        id: 'not-yet-valid',
        severity: 'medium',
        title: 'Token not yet valid',
        description: `The nbf claim (${nbf}) is in the future. This token should not be accepted yet.`,
      });
    }
  }

  if (typeof decoded.payload.iat !== 'number') {
    findings.push({
      id: 'missing-iat',
      severity: 'low',
      title: 'No issued-at claim',
      description: 'The token has no iat claim, making it harder to determine when it was issued.',
    });
  }

  if (alg.startsWith('hs')) {
    findings.push({
      id: 'symmetric-alg',
      severity: 'info',
      title: 'Symmetric algorithm',
      description:
        'The token uses a symmetric algorithm (HMAC). Consider asymmetric algorithms (RS256, ES256) for better key management.',
    });
  }

  return findings;
}

// ── Sign ──────────────────────────────────────────────────

export async function signJwt(
  header: object,
  payload: object,
  secret: string,
  algorithm: JwtAlgorithm,
): Promise<string> {
  const hashMap: Record<JwtAlgorithm, string> = {
    HS256: 'SHA-256',
    HS384: 'SHA-384',
    HS512: 'SHA-512',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: hashMap[algorithm] },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signature));

  return `${data}.${sigB64}`;
}
