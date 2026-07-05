import type { StashRecord, StashEndpointRecord } from '@/stores/collections';

// ── Flat Node ──

export interface FlatNode {
  id: string;          // "stash-xxx" or "ep-xxx"
  originalId: string;  // the raw id without prefix
  parentId: string | null;  // workspace ID for collections, stash ID for endpoints
  depth: number;
  kind: 'collection' | 'endpoint';
  label: string;
  description?: string;
  method?: string;
  url?: string;
  stash?: StashRecord;
  endpoint?: StashEndpointRecord;
}

// ── Drop Result ──

export type DropAction =
  | { action: 'reorder-before'; beforeId: string }
  | { action: 'reorder-after'; afterId: string }
  | { action: 'reparent'; parentId: string };

// ── Flatten ──

/**
 * Flatten the nested tree of collections/folders → endpoints into a visible-only flat list.
 * Traverses recursively starting from the workspaceId. Only contents of expanded
 * collections are included.
 */
export function flattenVisibleTree(
  stashes: StashRecord[],
  endpoints: StashEndpointRecord[],
  expandedIds: Set<string>,
  workspaceId: string,
): FlatNode[] {
  const result: FlatNode[] = [];

  // Group stashes by parentId
  const stashesByParent = new Map<string, StashRecord[]>();
  for (const stash of stashes) {
    if (stash.parentId) {
      if (!stashesByParent.has(stash.parentId)) {
        stashesByParent.set(stash.parentId, []);
      }
      stashesByParent.get(stash.parentId)!.push(stash);
    }
  }

  // Group endpoints by stashId
  const endpointsByStash = new Map<string, StashEndpointRecord[]>();
  for (const ep of endpoints) {
    if (!endpointsByStash.has(ep.stashId)) {
      endpointsByStash.set(ep.stashId, []);
    }
    endpointsByStash.get(ep.stashId)!.push(ep);
  }

  // Recursive traversal function
  function traverse(parentId: string, depth: number) {
    const childStashes = (stashesByParent.get(parentId) || [])
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    for (const stash of childStashes) {
      const nodeId = `stash-${stash.id}`;
      result.push({
        id: nodeId,
        originalId: stash.id,
        parentId: stash.parentId,
        depth,
        kind: 'collection' as const,
        label: stash.name,
        stash,
      });

      // Only show contents if this folder is expanded
      if (expandedIds.has(nodeId)) {
        // 1. Folders first
        traverse(stash.id, depth + 1);

        // 2. Endpoints next
        const childEndpoints = (endpointsByStash.get(stash.id) || [])
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt));

        for (const ep of childEndpoints) {
          result.push({
            id: `ep-${ep.id}`,
            originalId: ep.id,
            parentId: stash.id,
            depth: depth + 1,
            kind: 'endpoint' as const,
            label: ep.name,
            description: ep.url || 'No URL set',
            method: ep.method,
            url: ep.url,
            endpoint: ep,
          });
        }
      }
    }
  }

  traverse(workspaceId, 0);
  return result;
}

// ── Collision Detection ──

const REPARENT_ZONE_RATIO = 0.5;   // middle 50% = reparent (for collections)
const EDGE_ZONE_RATIO = 0.25;       // top/bottom 25% = reorder

/**
 * Determine the drop action based on the pointer position within the over item.
 * Called inside onDragEnd with the over item's rect from the DOM.
 */
export function computeDropResult(
  flatItems: FlatNode[],
  activeId: string,
  overId: string,
  pointerY: number,
  overRect: DOMRect,
): DropAction | null {
  if (!overRect || activeId === overId) return null;

  const activeIndex = flatItems.findIndex((n) => n.id === activeId);
  const overIndex = flatItems.findIndex((n) => n.id === overId);
  if (activeIndex === -1 || overIndex === -1) return null;

  const overNode = flatItems[overIndex];
  const ratio = (pointerY - overRect.top) / overRect.height;

  // Top zone → insert before
  if (ratio < EDGE_ZONE_RATIO) {
    return { action: 'reorder-before', beforeId: overId };
  }

  // Bottom zone → insert after
  if (ratio > 1 - EDGE_ZONE_RATIO) {
    return { action: 'reorder-after', afterId: overId };
  }

  // Middle zone: reparent if target is a collection, otherwise insert after
  if (overNode.kind === 'collection') {
    return { action: 'reparent', parentId: overNode.originalId };
  }

  // For endpoints, default to insert after
  return { action: 'reorder-after', afterId: overId };
}
