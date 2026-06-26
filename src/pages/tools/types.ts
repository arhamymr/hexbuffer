export type CodecType = 'url' | 'base64' | 'hex';
export type DecoderType = CodecType;
export type HashType = 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'sha3-224' | 'sha3-256' | 'sha3-384' | 'sha3-512' | 'ripemd160';
export type EncoderType = CodecType;

export interface DecoderResult {
  input: string;
  output: string;
  type: DecoderType;
  timestamp: number;
}

export interface HashResult {
  input: string;
  output: string;
  type: HashType;
  timestamp: number;
}

export interface EncoderResult {
  input: string;
  output: string;
  type: EncoderType;
  timestamp: number;
}

export interface SubdomainResult {
  subdomain: string;
  fullUrl: string;
  status: 'pending' | 'found' | 'error' | 'timeout';
  statusCode?: number;
  responseTime?: number;
}

export interface SubdomainConfig {
  domain: string;
  wordlist: string[];
  concurrency: number;
  timeout: number;
}

export interface FuzzResult {
  path: string;
  fullUrl: string;
  status: 'pending' | 'found' | 'error' | 'timeout';
  statusCode?: number;
  contentLength?: number;
  responseTime?: number;
}

export interface FuzzConfig {
  url: string;
  wordlist: string[];
  concurrency: number;
  timeout: number;
  followRedirects: boolean;
}

export type PortScanState = 'open' | 'closed' | 'filtered' | 'cancelled';

export interface PortScanResult {
  host: string;
  port: number;
  state: PortScanState;
  service: string;
  banner?: string | null;
  response_time_ms?: number | null;
  error?: string | null;
}

// ── JWT Tool ──────────────────────────────────────────────

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

export type JwtVulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm: string;
  parts: [string, string, string];
}

export interface JwtVulnerability {
  id: string;
  severity: JwtVulnerabilitySeverity;
  title: string;
  description: string;
}

// ── XSS Generator ─────────────────────────────────────────

export type XssPayloadCategory = 'reflected' | 'dom-based' | 'polyglot' | 'filter-bypass' | 'context-specific';

export type XssEncodingType = 'url' | 'html-entity' | 'base64' | 'double-url' | 'unicode-escape';

export interface XssPayload {
  id: string;
  category: XssPayloadCategory;
  label: string;
  payload: string;
}
