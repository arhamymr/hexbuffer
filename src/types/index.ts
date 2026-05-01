export interface Target {
  id: string;
  name: string;
  description: string;
  scope: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProxyStatus {
  running: boolean;
  port: number | null;
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

  security_state: string;
  server_ip: string | null;
}

export interface ProxyConnection {
  id: string;
  timestamp: number;
  host: string;
  port: number;
  targetId: string;
  clientBytes?: number;
  serverBytes?: number;
  duration?: number;
  status?: 'active' | 'closed';
}
