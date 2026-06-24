export interface InspectorConsoleLog {
  id: string;
  level: 'log' | 'info' | 'warning' | 'error' | 'debug' | 'pageerror';
  text: string;
  url: string;
  timestamp: number;
}

export type ConsoleFilterLevel = 'all' | 'log' | 'info' | 'warning' | 'error' | 'pageerror';

export interface InspectorPageInfo {
  id: string;
  url: string;
  title: string;
}

export interface InspectorNetworkEntry {
  id: string;
  requestId: string;
  method: string;
  url: string;
  status: number | null;
  resourceType: string;
  mimeType: string;
  size: number;
  time: number;
  startTime: number;
}

export interface InspectorCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export interface InspectorStorageEntry {
  key: string;
  value: string;
}

export type InspectorTab = 'console' | 'network' | 'storage';

export type InspectorTopTab = 'browser' | 'inspector';
