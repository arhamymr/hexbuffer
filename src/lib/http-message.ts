export interface HttpRequestMessage {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponseMessage {
  status: number;
  status_text?: string;
  statusText?: string;
  headers: Record<string, string>;
  body: string;
}

export interface HttpHeaderItem {
  name: string;
  value: string;
}

export interface ParseRawHttpRequestOptions {
  fallbackUrl?: string;
  defaultUrl?: string;
  defaultMethod?: string;
  defaultTarget?: string;
  defaultProtocol?: 'http' | 'https';
  invalidMode?: 'throw' | 'null';
  stripHeaders?: string[];
  trim?: boolean;
  uppercaseMethod?: boolean;
}

export interface BuildRawHttpRequestOptions {
  addHostHeader?: boolean;
  decodePayloadMarkers?: boolean;
}

export interface BuildRawHttpResponseOptions {
  prettyJsonBody?: boolean;
}

export interface BuildHttpCurlCommandOptions {
  multiline?: boolean;
  insecure?: boolean;
  compressed?: boolean;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function getRequestTarget(url: string, options: BuildRawHttpRequestOptions = {}): string {
  if (!url) {
    return '/';
  }

  try {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}` || '/';
    return options.decodePayloadMarkers ? target.replace(/%C2%A7/gi, '§') : target;
  } catch {
    return url;
  }
}

function getHostHeader(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function normalizeHttpText(raw: string, trim: boolean): string {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return trim ? normalized.trim() : normalized;
}

function fail(message: string, invalidMode: 'throw' | 'null'): null {
  if (invalidMode === 'null') {
    return null;
  }

  throw new Error(message);
}

function buildAbsoluteUrl(
  target: string,
  headers: Record<string, string>,
  options: ParseRawHttpRequestOptions
): string | null {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const baseUrl = options.fallbackUrl || options.defaultUrl || '';
  if (baseUrl) {
    try {
      return new URL(target || '/', baseUrl).toString();
    } catch {
      // Continue to host-based fallback below.
    }
  }

  const hostEntry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'host');
  if (hostEntry) {
    const protocol = options.defaultProtocol ?? 'https';
    return `${protocol}://${hostEntry[1]}${target.startsWith('/') ? target : `/${target}`}`;
  }

  return null;
}

export function formatJsonBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function buildHttpHeaderList(headers: Record<string, string>): HttpHeaderItem[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

export function buildRawHttpRequest(
  request: Partial<HttpRequestMessage>,
  options: BuildRawHttpRequestOptions = {}
): string {
  const addHostHeader = options.addHostHeader ?? true;
  const headers = { ...(request.headers ?? {}) };
  const hostHeaderKey = Object.keys(headers).find((key) => key.toLowerCase() === 'host');
  const host = getHostHeader(request.url ?? '');

  if (addHostHeader && !hostHeaderKey && host) {
    headers.Host = host;
  }

  const requestLine = `${request.method || 'GET'} ${getRequestTarget(request.url || '/', options)} HTTP/1.1`;
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
  return [requestLine, ...headerLines, '', request.body ?? ''].join('\n');
}

export function parseRawHttpRequest(
  raw: string,
  options: ParseRawHttpRequestOptions = {}
): HttpRequestMessage | null {
  const invalidMode = options.invalidMode ?? 'throw';
  const normalized = normalizeHttpText(raw, options.trim ?? false);
  const [head, ...bodyParts] = normalized.split('\n\n');
  const lines = head.split('\n').filter(Boolean);
  const requestLine = lines[0]?.trim();

  if (!requestLine) {
    return fail('Request line is missing.', invalidMode);
  }

  const [methodCandidate, targetCandidate] = requestLine.split(/\s+/);
  const method = methodCandidate || options.defaultMethod || '';
  const target = targetCandidate || options.defaultTarget || '';

  if (!method || !target) {
    return fail('Request line must include a method and target.', invalidMode);
  }

  const strippedHeaders = new Set((options.stripHeaders ?? []).map((header) => header.toLowerCase()));
  const headers: Record<string, string> = {};

  for (const line of lines.slice(1)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (strippedHeaders.has(key.toLowerCase())) {
      continue;
    }

    headers[key] = value;
  }

  const url = buildAbsoluteUrl(target, headers, options);
  if (!url) {
    return fail('Request URL is missing. Use an absolute URL in the request line or include a Host header.', invalidMode);
  }

  return {
    method: options.uppercaseMethod ? method.toUpperCase() : method,
    url,
    headers,
    body: bodyParts.join('\n\n'),
  };
}

export function buildRawHttpResponse(
  response: HttpResponseMessage,
  options: BuildRawHttpResponseOptions = {}
): string {
  const statusText = response.status_text ?? response.statusText ?? '';
  const statusLine = `HTTP/1.1 ${response.status}${statusText ? ` ${statusText}` : ''}`;
  const headerLines = Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`);
  const body = options.prettyJsonBody ? formatJsonBody(response.body) : response.body;
  return [statusLine, ...headerLines, '', body].join('\n');
}

const PSEUDO_HEADERS = new Set([':method', ':path', ':scheme', ':authority', ':status']);

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
]);

const ACCEPT_ENCODING_HEADER = 'accept-encoding';

function shouldSkipHeader(key: string): boolean {
  const lower = key.toLowerCase();
  if (PSEUDO_HEADERS.has(lower)) return true;
  if (HOP_BY_HOP_HEADERS.has(lower)) return true;
  if (lower === 'host') return true;
  if (lower === 'content-length') return true;
  return false;
}

function hasCompressedEncoding(headers: Record<string, string>): boolean {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === ACCEPT_ENCODING_HEADER) {
      if (/gzip|deflate|br\b/.test(value)) return true;
    }
  }
  return false;
}

export function buildHttpCurlCommand(
  request: Partial<HttpRequestMessage>,
  options: BuildHttpCurlCommandOptions = {}
): string {
  const multiline = options.multiline ?? true;
  const insecure = options.insecure ?? true;
  const compressed = options.compressed ?? true;
  const method = (request.method || 'GET').toUpperCase();
  const url = request.url || '';
  const headers = request.headers ?? {};

  const lines: string[] = [];

  if (insecure) {
    lines.push('curl -k');
  } else {
    lines.push('curl');
  }

  if (method !== 'GET') {
    lines[0] += ` -X ${method}`;
  }

  if (compressed && hasCompressedEncoding(headers)) {
    lines[0] += ' --compressed';
  }

  for (const [key, value] of Object.entries(headers)) {
    if (shouldSkipHeader(key)) continue;
    lines.push(`-H ${shellQuote(`${key}: ${value}`)}`);
  }

  if (request.body) {
    lines.push(`-d ${shellQuote(request.body)}`);
  }

  if (url) {
    lines.push(shellQuote(url));
  }

  if (multiline) {
    return lines.map((line, i) => (i === 0 ? line : `  ${line}`)).join(' \\\n');
  }

  return lines.join(' ');
}
