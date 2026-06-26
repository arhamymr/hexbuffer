export interface StashRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StashEndpointRecord {
  id: string;
  stashId: string;
  name: string;
  method: string;
  url: string;
  headers: string | null; // JSON string
  body: string | null;
  bodyType: string | null; // 'none' | 'raw' | 'json' | 'form-data'
  preScript: string | null;
  testScript: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContextRecord {
  id: string;
  name: string;
  variables: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface ChronicleLogRecord {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestHeaders: string | null;
  requestBody: string | null;
  responseStatus: number | null;
  responseStatusText: string | null;
  responseHeaders: string | null;
  responseBody: string | null;
  durationMs: number | null;
}

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ForgeResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  finalUrl: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ActiveRequestState {
  method: string;
  url: string;
  headers: KeyValuePair[];
  body: string;
  bodyType: 'none' | 'raw' | 'json' | 'form-data';
  preScript: string;
  testScript: string;
  response: ForgeResponse | null;
  isLoading: boolean;
  error: string | null;
  testResults: TestResult[];
}
