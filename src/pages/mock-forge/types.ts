export type MockDomainStatus = 'active' | 'inactive';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
export type MockForgeSubTab = 'domains' | 'routes' | 'logs';

export interface MockDomain {
  id: string;
  hostname: string; // e.g. api.payment-gateway.local
  ssl: boolean;
  status: MockDomainStatus;
  createdAt: string;
}

export interface RequestMatcher {
  headerKey?: string;
  headerValue?: string;
  queryKey?: string;
  queryValue?: string;
  bodyContains?: string;
}

export interface ChaosConfig {
  latencyMode: 'none' | 'fixed' | 'random';
  latencyFixed?: number; // ms
  latencyMin?: number;
  latencyMax?: number;
  errorRate?: number; // 0-100
  errorStatus?: number;
}

export interface MockRoute {
  id: string;
  domainId: string;
  method: HttpMethod;
  path: string; // e.g. /users/:id
  statusCode: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  matchers: RequestMatcher[];
  chaos: ChaosConfig;
  enabled: boolean;
  requestQueryParams?: { key: string; value: string; enabled: boolean }[];
  requestBody?: string;
}

export interface RequestLog {
  id: string;
  domainId: string;
  routeId: string | null;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
}
