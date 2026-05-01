export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  follow_redirects: boolean;
  max_hops: number;
}

export interface HttpResponse {
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
  request: HttpRequest;
  response: HttpResponse | null;
  isLoading: boolean;
  history: HttpRequest[];
  historyIndex: number;
}

export type ViewMode = 'raw' | 'pretty' | 'hex' | 'params' | 'render';

export function createEmptyRequest(): HttpRequest {
  return {
    method: 'GET',
    url: 'http://localhost',
    headers: {},
    body: '',
    follow_redirects: true,
    max_hops: 10,
  };
}

export function createNewTab(name?: string): RepeaterTab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name || `Tab ${Date.now()}`,
    request: createEmptyRequest(),
    response: null,
    isLoading: false,
    history: [],
    historyIndex: -1,
  };
}

export function parseRawRequest(raw: string): HttpRequest | null {
  const lines = raw.split('\n');
  if (lines.length === 0) return null;

  const requestLine = lines[0].trim();
  const requestLineParts = requestLine.split(' ');
  if (requestLineParts.length < 2) return null;

  const method = requestLineParts[0];
  const url = requestLineParts[1];

  const headers: Record<string, string> = {};
  let bodyStartIndex = 1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      bodyStartIndex = i + 1;
      break;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n');

  return {
    method,
    url,
    headers,
    body,
    follow_redirects: true,
    max_hops: 10,
  };
}

export function serializeRawRequest(request: HttpRequest): string {
  const lines: string[] = [];
  lines.push(`${request.method} ${request.url} HTTP/1.1`);

  for (const [key, value] of Object.entries(request.headers)) {
    lines.push(`${key}: ${value}`);
  }

  lines.push('');
  if (request.body) {
    lines.push(request.body);
  }

  return lines.join('\n');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}