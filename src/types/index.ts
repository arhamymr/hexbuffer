export interface Target {
  id: string;
  name: string;
  description: string;
  scope: string[];
  tabActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyStatus {
  running: boolean;
  port: number | null;
  default_port: number;
  connections: number;
}

export type RequestType = 'XHR' | 'Media' | 'CSS' | 'JS' | 'Document' | 'Font' | 'Other';

export interface ApiCall {
  id: string;
  session_id: string;
  target_id: string;
  timestamp: number;
  request_type: RequestType;

  method: string;
  url: string;
  host: string;
  path: string;
  query_params: Record<string, string>;

  headers: Record<string, string>;
  cookies: Record<string, string>;
  request_body: string | null;
  request_body_size: number;

  response_status: number | null;
  response_status_text: string | null;
  response_headers: Record<string, string>;
  response_cookies: Record<string, string>;
  response_body: string | null;
  response_body_size: number;
  response_content_type: string | null;

  content_decoded?: boolean;

  security_state: string;
  server_ip: string | null;
  duration_ms: number | null;
}

export interface ProxyConnection {
  id: string;
  timestamp: number;
  host: string;
  port: number;
  targetId: string;
  mode?: string;
  clientBytes?: number;
  serverBytes?: number;
  duration?: number;
  status?: 'active' | 'closed';
}

export interface ProxyRequest {
  method: string;
  uri: string;
  http_version: string;
  headers: Record<string, string>;
  body: number[];
  content_decoded?: boolean;
}

export interface ProxyResponse {
  status_code: number;
  status_text: string;
  http_version: string;
  headers: Record<string, string>;
  body: number[];
  content_decoded?: boolean;
}

export interface ProxyRecord {
  id: string;
  timestamp: string;
  request: ProxyRequest;
  response: ProxyResponse | null;
  client_addr: string;
  server_addr: string;
}

export interface ProxyLogSummary {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  response_status: number | null;
  response_status_text: string | null;
  response_content_type: string | null;
  request_body_size: number;
  response_body_size: number;
  server_addr: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
