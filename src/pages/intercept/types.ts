export type InterceptMode = 'Disabled' | 'Enabled';

export interface InterceptStatus {
  mode: InterceptMode;
  paused_count: number;
}

export interface InterceptProxyRequest {
  method: string;
  uri: string;
  http_version: string;
  headers: Record<string, string>;
  body: number[];
}

export interface PausedRequest {
  id: string;
  timestamp: string;
  client_addr: string;
  server_addr: string;
  request: InterceptProxyRequest;
  response: null;
}
