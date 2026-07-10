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

export interface Target {
  id: string;
  title: string;
  url: string;
  type: string;
  faviconUrl?: string;
  webSocketDebuggerUrl: string;
}

export interface NetworkRequest {
  requestId: string;
  method: string;
  url: string;
  status: number | null;
  type: string;
  mimeType: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  postData: string | null;
  webSocketFrames: WebSocketFrame[];
  errorText?: string;
}

export interface WebSocketFrame {
  timestamp: number;
  direction: 'send' | 'receive';
  opcode: number;
  payloadData: string;
  size: number;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  session?: boolean;
}

export interface StorageItem {
  key: string;
  value: string;
}

export interface ConsoleLog {
  id: string;
  level: 'log' | 'info' | 'warning' | 'error' | 'debug';
  text: string;
  timestamp: number;
}

