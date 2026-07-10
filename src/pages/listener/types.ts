export interface ListenerServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'offline' | 'unknown';
  createdAt: string;
  updatedAt: string;
}

export interface CreateServerRequest {
  name: string;
  url: string;
  apiKey: string;
}

export interface ListenerPayload {
  id: string;
  serverId: string;
  identifier: string;
  payloadUrl: string;
  name: string;
  description: string;
  tags: string;
  interactionCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  lastSeenAt: string | null;
}

export interface CreatePayloadRequest {
  serverId: string;
  name: string;
  description: string;
  tags: string[];
}

export interface ListenerInteraction {
  id: string;
  payloadId: string;
  interactionType: 'dns' | 'http' | 'https';
  sourceIp: string;
  method: string | null;
  path: string | null;
  headers: string | null;
  rawRequest: string | null;
  requestBody: string | null;
  serverResponse: string | null;
  timestamp: string;
}

export interface ListenerDashboardStats {
  activePayloads: number;
  interactionsToday: number;
  dnsEvents: number;
  httpEvents: number;
  httpsEvents: number;
  lastCallback: string | null;
  connectedServers: number;
}

export type ListenerSubTab = 'hosts' | 'interactions';
