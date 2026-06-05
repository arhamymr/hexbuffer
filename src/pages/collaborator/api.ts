import { invoke } from '@tauri-apps/api/core';
import type {
  CollaboratorDashboardStats,
  CollaboratorInteraction,
  CollaboratorPayload,
  CollaboratorServer,
  CreatePayloadRequest,
  CreateServerRequest,
} from './types';

export async function listCollaboratorServers(): Promise<CollaboratorServer[]> {
  return invoke('list_collaborator_servers');
}

export async function addCollaboratorServer(req: CreateServerRequest): Promise<CollaboratorServer> {
  return invoke('add_collaborator_server', { server: req });
}

export async function deleteCollaboratorServer(id: string): Promise<void> {
  return invoke('delete_collaborator_server', { id });
}

export async function checkCollaboratorServerHealth(id: string): Promise<CollaboratorServer> {
  return invoke('check_collaborator_server_health', { id });
}

export async function createCollaboratorPayload(
  req: CreatePayloadRequest
): Promise<CollaboratorPayload> {
  return invoke('create_collaborator_payload', { request: req });
}

export async function listCollaboratorPayloads(
  serverId?: string
): Promise<CollaboratorPayload[]> {
  return invoke('list_collaborator_payloads', { serverId: serverId ?? null });
}

export async function deleteCollaboratorPayload(id: string): Promise<void> {
  return invoke('delete_collaborator_payload', { id });
}

export async function archiveCollaboratorPayload(id: string): Promise<void> {
  return invoke('archive_collaborator_payload', { id });
}

export async function listCollaboratorInteractions(
  payloadId?: string,
  interactionType?: string
): Promise<CollaboratorInteraction[]> {
  return invoke('list_collaborator_interactions', {
    payloadId: payloadId ?? null,
    interactionType: interactionType ?? null,
  });
}

export async function pollCollaboratorInteractions(
  serverId: string
): Promise<CollaboratorInteraction[]> {
  return invoke('poll_collaborator_interactions', { serverId });
}

export async function getCollaboratorDashboardStats(): Promise<CollaboratorDashboardStats> {
  return invoke('get_collaborator_dashboard_stats');
}
