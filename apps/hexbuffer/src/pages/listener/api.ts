import { invoke } from '@tauri-apps/api/core';
import type {
  ListenerDashboardStats,
  ListenerInteraction,
  ListenerPayload,
  ListenerServer,
  CreatePayloadRequest,
  CreateServerRequest,
} from './types';

export async function listListenerServers(): Promise<ListenerServer[]> {
  return invoke('list_collaborator_servers');
}

export async function addListenerServer(req: CreateServerRequest): Promise<ListenerServer> {
  return invoke('add_collaborator_server', { server: req });
}

export async function deleteListenerServer(id: string): Promise<void> {
  return invoke('delete_collaborator_server', { id });
}

export async function checkListenerServerHealth(id: string): Promise<ListenerServer> {
  return invoke('check_collaborator_server_health', { id });
}

export async function createListenerPayload(
  req: CreatePayloadRequest
): Promise<ListenerPayload> {
  return invoke('create_collaborator_payload', { request: req });
}

export async function listListenerPayloads(
  serverId?: string
): Promise<ListenerPayload[]> {
  return invoke('list_collaborator_payloads', { serverId: serverId ?? null });
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
  return invoke('list_collaborator_interactions', {
    payloadId: payloadId ?? null,
    interactionType: interactionType ?? null,
  });
}

export async function pollListenerInteractions(
  serverId: string
): Promise<ListenerInteraction[]> {
  return invoke('poll_collaborator_interactions', { serverId });
}

export async function getListenerDashboardStats(): Promise<ListenerDashboardStats> {
  return invoke('get_collaborator_dashboard_stats');
}
