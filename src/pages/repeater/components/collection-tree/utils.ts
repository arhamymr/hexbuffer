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
 * Flatten the two-level tree of collections → endpoints into a visible-only flat list.
 * Stashes are scoped to a workspace via parentId (workspace ID). Only endpoints of
 * expanded collections are included. Sorted by sortOrder.
 */
export function flattenVisibleTree(
  stashes: StashRecord[],
  endpoints: StashEndpointRecord[],
  expandedIds: Set<string>,
): FlatNode[] {
  const result: FlatNode[] = [];

  const sortedStashes = [...stashes].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const stash of sortedStashes) {
    const nodeId = `stash-${stash.id}`;

    result.push({
      id: nodeId,
      originalId: stash.id,
      parentId: null,
      depth: 0,
      kind: 'collection' as const,
      label: stash.name,
      stash,
    });

    // Only show endpoints if this collection is expanded
    if (expandedIds.has(nodeId)) {
      const childEndpoints = endpoints
        .filter((ep) => ep.stashId === stash.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      for (const ep of childEndpoints) {
        result.push({
          id: `ep-${ep.id}`,
          originalId: ep.id,
          parentId: stash.id,
          depth: 1,
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
