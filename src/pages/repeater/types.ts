export interface RepeaterRequest {
  method: string;
  url: string;
  headers: string;
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

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

export function createDefaultRepeaterTab(index: number): RepeaterTab {
  return {
    id: `repeater-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Tab ${index}`,
    request: {
      method: 'GET',
      url: '',
      headers: 'Content-Type: application/json',
      body: '',
    },
    response: null,
    isLoading: false,
    error: null,
  };
}

export function parseHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = rawHeaders.split('\n').filter(line => line.trim() && line.includes(':'));

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  return headers;
}

export function formatJsonResponse(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}