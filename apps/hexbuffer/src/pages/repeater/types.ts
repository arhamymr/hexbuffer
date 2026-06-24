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

export interface RepeaterWsRequest {
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

export interface WsRepeaterMessage {
  connection_id: string;
  direction: string;
  message_type: string;
  payload: string;
  timestamp: string;
}

export type RepeaterTabMode = 'http' | 'websocket';

export interface RepeaterTab {
  id: string;
  name: string;
  mode: RepeaterTabMode;
  request: RepeaterRequest;
  wsRequest?: RepeaterWsRequest;
  wsConnectionId: string | null;
  wsConnected: boolean;
  wsMessages: WsRepeaterMessage[];
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
    mode: 'http',
    request: {
      raw: buildRawHttpRequest({
        method: 'GET',
        url: 'https://example.com/',
        headers: {},
        body: '',
      }),
      url: 'https://example.com/',
    },
    wsConnectionId: null,
    wsConnected: false,
    wsMessages: [],
    response: null,
    isLoading: false,
    error: null,
  };
}

export function createRepeaterTabFromRequest(request: RepeaterRequest, name: string): RepeaterTab {
  return {
    id: createRepeaterTabId(),
    name,
    mode: 'http',
    request,
    wsConnectionId: null,
    wsConnected: false,
    wsMessages: [],
    response: null,
    isLoading: false,
    error: null,
  };
}

export function createWsRepeaterTab(
  wsRequest: RepeaterWsRequest,
  number: number,
): RepeaterTab {
  const raw = buildRawHttpRequest({
    method: wsRequest.method,
    url: wsRequest.url,
    headers: wsRequest.headers,
    body: wsRequest.body,
  });

  return {
    id: createRepeaterTabId(),
    name: `WS ${number}`,
    mode: 'websocket',
    request: {
      raw,
      url: wsRequest.url,
    },
    wsRequest,
    wsConnectionId: null,
    wsConnected: false,
    wsMessages: [],
    response: null,
    isLoading: false,
    error: null,
  };
}
