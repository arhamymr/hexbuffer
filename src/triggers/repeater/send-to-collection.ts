import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useCollectionsStore, type StashEndpointRecord } from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';
import { useNavStore } from '@/stores/nav';
import { cleanUrl } from '@/lib/utils';

export interface SendToCollectionOptions {
  stashId: string;
  stashName: string;
  endpointData: {
    name: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function timestampNow(): string {
  return new Date().toISOString();
}

export async function sendToCollection(options: SendToCollectionOptions): Promise<void> {
  const { stashId, stashName, endpointData } = options;

  // Resolve stash name from store if not provided
  const collectionsStore = useCollectionsStore.getState();
  let resolvedName = stashName || 'Collection';
  if (!stashName) {
    const stash = collectionsStore.stashes.find((s) => s.id === stashId);
    if (stash) resolvedName = stash.name;
  }

  // Create the endpoint record
  const now = timestampNow();
  const headersJson = Object.keys(endpointData.headers).length > 0
    ? JSON.stringify(endpointData.headers)
    : null;

  const endpoint: StashEndpointRecord = {
    id: generateId(),
    stashId,
    name: cleanUrl(endpointData.name),
    method: endpointData.method,
    url: cleanUrl(endpointData.url),
    headers: headersJson,
    body: endpointData.body ?? null,
    bodyType: endpointData.body ? 'raw' : 'none',
    preScript: null,
    testScript: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Persist to DB
  try {
    await invoke('save_stash_endpoint', { record: endpoint });
  } catch (e) {
    console.error('Failed to save endpoint to collection:', e);
    toast.error('Failed to save endpoint to collection');
    return;
  }

  // Update local state
  useCollectionsStore.setState((s) => ({
    endpoints: [...s.endpoints, endpoint],
    selectedNodeId: `ep-${endpoint.id}`,
  }));

  // Open/activate the collection tab
  useRepeaterStore.getState().addCollectionTab(stashId, resolvedName);

  // Navigate to repeater
  useNavStore.getState().triggerNavBlink('/repeater');
  useNavStore.getState().openWindow('/repeater', 'Repeater');
  useNavStore.getState().focusWindow('/repeater');

  toast.success(`Saved "${endpointData.name}" to ${resolvedName}`);
}
