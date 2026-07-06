import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { invoke } from '@tauri-apps/api/core';

export interface CreateEndpointOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: 'none' | 'raw' | 'json' | 'form-data';
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ponytail: keep triggers thin, directly forwarding calls to existing stores to avoid state duplication.

/**
 * Creates a new workspace in the Repeater tool.
 * Useful for grouping a set of collections and requests under a single tab/context.
 * 
 * @param name Optional initial name for the workspace. If not specified, a default counter name will be used.
 * @returns The ID of the newly created workspace.
 */
export function createWorkspace(name?: string, id?: string): string {
  return useRepeaterStore.getState().createWorkspace(name, id);
}

/**
 * Renames an existing Repeater workspace.
 * 
 * @param id The ID of the workspace to rename.
 * @param name The new name for the workspace.
 */
export function renameWorkspace(id: string, name: string): void {
  useRepeaterStore.getState().renameWorkspace(id, name);
}

/**
 * Deletes a Repeater workspace.
 * Note: If this is the last remaining workspace, the deletion is ignored to keep the app in a functional state.
 * 
 * @param id The ID of the workspace to delete.
 */
export function deleteWorkspace(id: string): void {
  useRepeaterStore.getState().deleteWorkspace(id);
}

/**
 * Sets the active/focused workspace tab in the Repeater UI.
 * 
 * @param id The ID of the workspace to set as active.
 */
export function setActiveWorkspace(id: string): void {
  useRepeaterStore.getState().setActiveWorkspaceId(id);
}

/**
 * Closes all workspaces located to the left of the specified workspace.
 * 
 * @param id The reference workspace ID.
 */
export function closeWorkspacesToLeft(id: string): void {
  useRepeaterStore.getState().closeTabsToLeft(id);
}

/**
 * Closes all workspaces located to the right of the specified workspace.
 * 
 * @param id The reference workspace ID.
 */
export function closeWorkspacesToRight(id: string): void {
  useRepeaterStore.getState().closeTabsToRight(id);
}

/**
 * Creates a new top-level collection (stash) inside a Repeater workspace.
 * A collection can hold folders and endpoints.
 * 
 * @param workspaceId The ID of the workspace to create the collection under.
 * @param name The name of the collection.
 * @returns A promise that resolves to the ID of the newly created collection.
 */
export async function createCollection(workspaceId: string, name: string, id?: string): Promise<string> {
  return await useCollectionsStore.getState().createStash(name, workspaceId, id);
}

/**
 * Creates a folder (sub-collection) under an existing parent collection or folder.
 * Folders are nested collections that help organize endpoints.
 * 
 * @param parentId The ID of the parent collection or folder.
 * @param name The name of the folder.
 * @returns A promise that resolves to the ID of the newly created folder.
 */
export async function createFolder(parentId: string, name: string, id?: string): Promise<string> {
  return await useCollectionsStore.getState().createStash(name, parentId, id);
}

function parseUrlQueryParams(url: string) {
  if (!url || !url.includes('?')) return [];
  try {
    const search = url.split('?')[1];
    if (!search) return [];
    return search.split('&').map((pair) => {
      const [key, value] = pair.split('=');
      return {
        key: decodeURIComponent(key || ''),
        value: decodeURIComponent(value || ''),
        enabled: true,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Creates a new API endpoint/request inside a collection or folder.
 * Supports specifying request parameters like method, url, headers, and body.
 * 
 * @param collectionId The ID of the collection or folder to place the endpoint in.
 * @param name The name/label of the endpoint.
 * @param options Optional request configuration (method, url, headers, body, bodyType).
 * @returns A promise that resolves to the ID of the newly created endpoint.
 */
export async function createEndpoint(
  collectionId: string,
  name: string,
  options?: CreateEndpointOptions,
  id?: string
): Promise<string> {
  const now = new Date().toISOString();
  const endpointId = id || generateId();

  const headersList = options?.headers
    ? Object.entries(options.headers).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }))
    : [];
  const headersJson = headersList.length > 0 ? JSON.stringify(headersList) : null;

  const endpoint = {
    id: endpointId,
    stashId: collectionId,
    name,
    method: options?.method || 'GET',
    url: options?.url || '',
    headers: headersJson,
    body: options?.body || null,
    bodyType: options?.bodyType || (options?.body ? 'raw' : 'none'),
    preScript: null,
    testScript: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await invoke('save_stash_endpoint', { record: endpoint });
  } catch (e) {
    console.error('Failed to save endpoint:', e);
  }

  useCollectionsStore.setState((s) => {
    return {
      endpoints: [...s.endpoints, endpoint],
      selectedNodeId: `ep-${endpointId}`,
      activeRequest: {
        method: endpoint.method,
        url: endpoint.url,
        headers: headersList,
        body: endpoint.body || '',
        bodyType: endpoint.bodyType as any,
        preScript: '',
        testScript: '',
        response: null,
        isLoading: false,
        error: null,
        testResults: [],
        queryParams: parseUrlQueryParams(endpoint.url),
      },
    };
  });

  return endpointId;
}

/**
 * Renames an existing collection or folder.
 * 
 * @param id The ID of the collection or folder to rename.
 * @param name The new name.
 */
export async function renameCollection(id: string, name: string): Promise<void> {
  await useCollectionsStore.getState().renameStash(id, name);
}

/**
 * Renames an existing endpoint.
 * 
 * @param id The ID of the endpoint to rename.
 * @param name The new name.
 */
export async function renameEndpoint(id: string, name: string): Promise<void> {
  await useCollectionsStore.getState().renameEndpoint(id, name);
}

/**
 * Deletes a collection or folder.
 * 
 * @param id The ID of the collection or folder to delete.
 */
export async function deleteCollection(id: string): Promise<void> {
  await useCollectionsStore.getState().deleteStash(id);
}

/**
 * Deletes an endpoint request.
 * 
 * @param id The ID of the endpoint to delete.
 */
export async function deleteEndpoint(id: string): Promise<void> {
  await useCollectionsStore.getState().deleteEndpoint(id);
}

/**
 * Selects/activates an endpoint in the Repeater collection tree, updating the active endpoint
 * and opening its request details in the Forge panel.
 * 
 * @param endpointId The ID of the endpoint to select.
 */
export function selectEndpoint(endpointId: string): void {
  const store = useCollectionsStore.getState();
  store.setSelectedNodeId(`ep-${endpointId}`);
  store.setActiveEndpointId(endpointId);
}

/**
 * Selects a collection/folder node in the Repeater collection tree, updating the selection state
 * and switching the view mode.
 * 
 * @param collectionId The ID of the collection/folder to select.
 */
export function selectCollection(collectionId: string): void {
  const store = useCollectionsStore.getState();
  store.setSelectedNodeId(`stash-${collectionId}`);
  store.setMode('craft');
}
