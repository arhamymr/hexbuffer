import { buildRawHttpRequest } from '@/lib/http-message';

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

export function createDefaultRepeaterTab(index: number): RepeaterTab {
  return {
    id: createRepeaterTabId(),
    name: `Tab ${index}`,
    request: {
      raw: buildRawHttpRequest({
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

export function createRepeaterTabFromRequest(request: RepeaterRequest, name: string): RepeaterTab {
  return {
    id: createRepeaterTabId(),
    name,
    request,
    response: null,
    isLoading: false,
    error: null,
  };
}
