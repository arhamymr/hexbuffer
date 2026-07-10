import { invoke } from '@tauri-apps/api/core';
import type {
  ListenerDashboardStats,
  ListenerInteraction,
  ListenerPayload,
  ListenerServer,
  CreatePayloadRequest,
  CreateServerRequest,
} from './types';

// ponytail: model mapping helpers to bridge camelCase frontend and snake_case Rust Tauri structs
function mapServer(s: any): ListenerServer {
  return {
    id: s.id,
    name: s.name,
    url: s.url,
    apiKey: s.api_key,
    status: s.status,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

function mapPayload(p: any): ListenerPayload {
  return {
    id: p.id,
    serverId: p.server_id,
    identifier: p.identifier,
    payloadUrl: p.payload_url,
    name: p.name,
    description: p.description,
    tags: p.tags,
    interactionCount: p.interaction_count,
    status: p.status,
    createdAt: p.created_at,
    lastSeenAt: p.last_seen_at,
  };
}

function mapInteraction(i: any): ListenerInteraction {
  return {
    id: i.id,
    payloadId: i.payload_id,
    interactionType: i.interaction_type,
    sourceIp: i.source_ip,
    method: i.method,
    path: i.path,
    headers: i.headers,
    rawRequest: i.raw_request,
    requestBody: i.request_body,
    serverResponse: i.server_response,
    timestamp: i.timestamp,
  };
}

function mapStats(s: any): ListenerDashboardStats {
  return {
    activePayloads: s.active_payloads,
    interactionsToday: s.interactions_today,
    dnsEvents: s.dns_events,
    httpEvents: s.http_events,
    httpsEvents: s.https_events,
    lastCallback: s.last_callback,
    connectedServers: s.connected_servers,
  };
}

export async function listListenerServers(): Promise<ListenerServer[]> {
  const list = await invoke<any[]>('list_collaborator_servers');
  return list.map(mapServer);
}

export async function addListenerServer(req: CreateServerRequest): Promise<ListenerServer> {
  const res = await invoke<any>('add_collaborator_server', {
    server: {
      name: req.name,
      url: req.url,
      api_key: req.apiKey,
    },
  });
  return mapServer(res);
}

export async function updateListenerServer(server: ListenerServer): Promise<ListenerServer> {
  const res = await invoke<any>('update_collaborator_server', {
    server: {
      id: server.id,
      name: server.name,
      url: server.url,
      api_key: server.apiKey,
      status: server.status,
      created_at: server.createdAt,
      updated_at: server.updatedAt,
    },
  });
  return mapServer(res);
}

export async function deleteListenerServer(id: string): Promise<void> {
  return invoke('delete_collaborator_server', { id });
}

export async function checkListenerServerHealth(id: string): Promise<ListenerServer> {
  const res = await invoke<any>('check_collaborator_server_health', { id });
  return mapServer(res);
}

export async function createListenerPayload(
  req: CreatePayloadRequest
): Promise<ListenerPayload> {
  const res = await invoke<any>('create_collaborator_payload', {
    request: {
      server_id: req.serverId,
      name: req.name,
      description: req.description,
      tags: req.tags,
    },
  });
  return mapPayload(res);
}

export async function listListenerPayloads(
  serverId?: string
): Promise<ListenerPayload[]> {
  const list = await invoke<any[]>('list_collaborator_payloads', {
    serverId: serverId ?? null,
  });
  return list.map(mapPayload);
}

export async function deleteListenerPayload(id: string): Promise<void> {
  return invoke('delete_collaborator_payload', { id });
}

export async function archiveListenerPayload(id: string): Promise<void> {
  return invoke('archive_collaborator_payload', { id });
}

export async function listListenerInteractions(
  payloadId?: string,
  interactionType?: string
): Promise<ListenerInteraction[]> {
  const list = await invoke<any[]>('list_collaborator_interactions', {
    payloadId: payloadId ?? null,
    interactionType: interactionType ?? null,
  });
  return list.map(mapInteraction);
}

export async function pollListenerInteractions(
  serverId: string
): Promise<ListenerInteraction[]> {
  const list = await invoke<any[]>('poll_collaborator_interactions', {
    serverId,
  });
  return list.map(mapInteraction);
}

export async function getListenerDashboardStats(): Promise<ListenerDashboardStats> {
  const res = await invoke<any>('get_collaborator_dashboard_stats');
  return mapStats(res);
}
