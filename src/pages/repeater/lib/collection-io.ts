import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { useCollectionsStore, type StashRecord, type StashEndpointRecord } from '@/stores/collections';

// ── Export Types ──

interface ExportSchema {
  version: 1;
  exportedAt: string;
  collections: {
    stashes: StashRecord[];
    endpoints: StashEndpointRecord[];
  };
}

// ── Export ──

export async function exportCollectionsToFile(): Promise<void> {
  const { stashes, endpoints } = useCollectionsStore.getState();

  const data: ExportSchema = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: { stashes, endpoints },
  };

  const savePath = await save({
    title: 'Export Collections',
    defaultPath: 'collection-schema.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!savePath) return; // user cancelled

  await writeTextFile(savePath, JSON.stringify(data, null, 2));
  toast.success(
    `Exported ${stashes.length} collection${stashes.length !== 1 ? 's' : ''} and ${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`,
  );
}

// ── Import Types ──

export interface ImportResult {
  stashes: StashRecord[];
  endpoints: StashEndpointRecord[];
}

// ── Import ──

export async function importCollectionsFromFile(): Promise<ImportResult | null> {
  const selectedPath = await open({
    title: 'Import Collections',
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!selectedPath || Array.isArray(selectedPath)) {
    return null; // user cancelled
  }

  const raw = await readTextFile(selectedPath);

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    toast.error('Invalid JSON file');
    return null;
  }

  // Validate structure
  if (!parsed || typeof parsed !== 'object') {
    toast.error('Invalid schema: expected a JSON object');
    return null;
  }

  const schema = parsed as Record<string, unknown>;

  if (!schema.collections || typeof schema.collections !== 'object') {
    toast.error('Invalid schema: missing "collections" object');
    return null;
  }

  const collections = schema.collections as Record<string, unknown>;

  if (!Array.isArray(collections.stashes)) {
    toast.error('Invalid schema: missing or invalid "stashes" array');
    return null;
  }

  if (!Array.isArray(collections.endpoints)) {
    toast.error('Invalid schema: missing or invalid "endpoints" array');
    return null;
  }

  const stashes = collections.stashes as unknown[];
  const endpoints = collections.endpoints as unknown[];

  // Validate each stash
  for (let i = 0; i < stashes.length; i++) {
    const s = stashes[i] as Record<string, unknown>;
    if (typeof s.id !== 'string' || !s.id) {
      toast.error(`Invalid stash at index ${i}: missing "id"`);
      return null;
    }
    if (typeof s.name !== 'string') {
      toast.error(`Invalid stash at index ${i}: missing "name"`);
      return null;
    }
  }

  // Build stash ID set for cross-reference validation
  const stashIds = new Set(stashes.map((s) => (s as Record<string, unknown>).id as string));

  // Validate each endpoint
  for (let i = 0; i < endpoints.length; i++) {
    const e = endpoints[i] as Record<string, unknown>;
    if (typeof e.id !== 'string' || !e.id) {
      toast.error(`Invalid endpoint at index ${i}: missing "id"`);
      return null;
    }
    if (typeof e.stashId !== 'string' || !e.stashId) {
      toast.error(`Invalid endpoint at index ${i}: missing "stashId"`);
      return null;
    }
    if (typeof e.name !== 'string') {
      toast.error(`Invalid endpoint at index ${i}: missing "name"`);
      return null;
    }
    // Cross-reference: stashId must exist in stashes
    if (!stashIds.has(e.stashId as string)) {
      toast.error(
        `Endpoint "${e.name}" references stash "${e.stashId}" which does not exist in the schema`,
      );
      return null;
    }
  }

  return {
    stashes: stashes as StashRecord[],
    endpoints: endpoints as StashEndpointRecord[],
  };
}
