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

export interface InterceptProxyResponse {
  status_code: number;
  status_text: string;
  http_version: string;
  headers: Record<string, string>;
  body: number[];
}

export interface PausedRequest {
  id: string;
  timestamp: string;
  client_addr: string;
  server_addr: string;
  tab_id: string | null;
  request: InterceptProxyRequest;
  response: InterceptProxyResponse | null;
}

export interface InterceptTab {
  id: string;
  name: string;
  captureHosts: string[];
}

export function createInterceptTab(index: number): InterceptTab {
  return {
    id: `intercept-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Tab ${index}`,
    captureHosts: [],
  };
}
