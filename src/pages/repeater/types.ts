export interface RepeaterRequest {
  raw: string;
  url: string;
}

export interface ParsedRepeaterRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface RepeaterResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  final_url: string;
}

export interface RepeaterTab {
  id: string;
  name: string;
  request: RepeaterRequest;
  response: RepeaterResponse | null;
  isLoading: boolean;
  error: string | null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';

function createRepeaterTabId(): string {
  return `repeater-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function getRequestTarget(url: string): string {
  if (!url) {
    return '/';
  }

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
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

export function buildRawRequest({
  method,
  url,
  headers,
  body,
}: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}): string {
  const normalizedHeaders = { ...headers };
  const hostHeaderKey = Object.keys(normalizedHeaders).find((key) => key.toLowerCase() === 'host');
  const host = getHostHeader(url);

  if (!hostHeaderKey && host) {
    normalizedHeaders.Host = host;
  }

  const requestLine = `${method} ${getRequestTarget(url)} HTTP/1.1`;
  const headerLines = Object.entries(normalizedHeaders).map(([key, value]) => `${key}: ${value}`);
  return [requestLine, ...headerLines, '', body].join('\n');
}

function buildAbsoluteUrl(target: string, headers: Record<string, string>, fallbackUrl: string): string {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  if (fallbackUrl) {
    try {
      return new URL(target, fallbackUrl).toString();
    } catch {
      // Continue to host-based fallback below.
    }
  }

  const hostEntry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'host');
  if (hostEntry) {
    return `https://${hostEntry[1]}${target.startsWith('/') ? target : `/${target}`}`;
  }

  throw new Error('Request URL is missing. Use an absolute URL in the request line or include a Host header.');
}

export function parseRawRequest(raw: string, fallbackUrl = ''): ParsedRepeaterRequest {
  const normalized = raw.replace(/\r\n/g, '\n');
  const [head, ...bodyParts] = normalized.split('\n\n');
  const lines = head.split('\n').filter(Boolean);
  const requestLine = lines[0]?.trim();

  if (!requestLine) {
    throw new Error('Request line is missing.');
  }

  const [method, target] = requestLine.split(/\s+/);
  if (!method || !target) {
    throw new Error('Request line must include a method and target.');
  }

  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  }

  return {
    method,
    url: buildAbsoluteUrl(target, headers, fallbackUrl),
    headers,
    body: bodyParts.join('\n\n'),
  };
}

function buildTabName(request: RepeaterRequest, fallback: string): string {
  try {
    const parsed = parseRawRequest(request.raw, request.url);
    const url = new URL(parsed.url);
    return `${parsed.method} ${url.host}${url.pathname}`;
  } catch {
    return fallback;
  }
}

export function createDefaultRepeaterTab(index: number): RepeaterTab {
  return {
    id: createRepeaterTabId(),
    name: `Tab ${index}`,
    request: {
      raw: buildRawRequest({
        method: 'GET',
        url: 'https://example.com/',
        headers: {},
        body: '',
      }),
      url: 'https://example.com/',
    },
    response: null,
    isLoading: false,
    error: null,
  };
}

export function createRepeaterTabFromRequest(request: RepeaterRequest): RepeaterTab {
  return {
    id: createRepeaterTabId(),
    name: buildTabName(request, 'Imported request'),
    request,
    response: null,
    isLoading: false,
    error: null,
  };
}

export function formatJsonResponse(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}


export function buildRawResponse(response: RepeaterResponse): string {
  const statusLine = `HTTP/1.1 ${response.status} ${response.status_text}`;
  const headerLines = Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`);
  return [statusLine, ...headerLines, '', response.body].join('\n');
}
