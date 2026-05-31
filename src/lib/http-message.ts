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
}

function shellQuote(value: string): string {
  return `$'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function titleCaseHeader(key: string): string {
  return key.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('-');
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

function stripDefaultPortFromHost(host: string, protocol?: string): string {
  const normalizedProtocol = protocol?.replace(/[:/]/g, '').toLowerCase();

  if (normalizedProtocol === 'https' && host.endsWith(':443')) {
    return host.slice(0, -4);
  }

  if (normalizedProtocol === 'http' && host.endsWith(':80')) {
    return host.slice(0, -3);
  }

  return host;
}

function stripDefaultPortFromUrl(url: string): string {
  const match = url.match(/^([a-z][a-z\d+.-]*:\/\/)([^/?#]*)(.*)$/i);

  if (!match) {
    return url;
  }

  const [, scheme, authority, rest] = match;
  return `${scheme}${stripDefaultPortFromHost(authority, scheme)}${rest}`;
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

export function buildHttpCurlCommand(
  request: Partial<HttpRequestMessage>,
  options: BuildHttpCurlCommandOptions = {}
): string {
  const multiline = options.multiline ?? true;
  const insecure = options.insecure ?? true;
  const method = (request.method || 'GET').toUpperCase();
  const url = request.url ? stripDefaultPortFromUrl(request.url) : '';
  const headers = request.headers ?? {};
  const urlProtocol = url.match(/^([a-z][a-z\d+.-]*):\/\//i)?.[1];

  const lines: string[] = ['curl'];

  if (insecure) {
    lines[0] += ' -k';
  }

  lines[0] += ' --path-as-is -i -s';

  lines.push(`-X ${shellQuote(method)}`);

  for (const [key, value] of Object.entries(headers)) {
    if (PSEUDO_HEADERS.has(key.toLowerCase())) continue;
    if (key.toLowerCase() === 'host') {
      lines.push(`-H ${shellQuote(`Host: ${stripDefaultPortFromHost(value, urlProtocol)}`)}`);
      continue;
    }
    lines.push(`-H ${shellQuote(`${titleCaseHeader(key)}: ${value}`)}`);
  }

  if (request.body) {
    lines.push(`-d ${shellQuote(request.body)}`);
  }

  if (url) {
    lines.push(shellQuote(url));
  }

  if (multiline) {
    return lines.map((line, i) => (i === 0 ? line : `    ${line}`)).join(' \\\n');
  }

  return lines.join(' ');
}
