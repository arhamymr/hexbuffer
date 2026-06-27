import type { StashRecord, StashEndpointRecord } from '@/stores/collections';

// ── Flat Node ──

export interface FlatNode {
  id: string;          // "stash-xxx" or "ep-xxx"
  originalId: string;  // the raw id without prefix
  parentId: string | null;
  depth: number;
  kind: 'collection' | 'folder' | 'endpoint';
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
 * Flatten the tree of stashes + endpoints into a visible-only flat list.
 * Only children of expanded nodes are included. Sorted by sortOrder.
 */
export function flattenVisibleTree(
  stashes: StashRecord[],
  endpoints: StashEndpointRecord[],
  expandedIds: Set<string>,
): FlatNode[] {
  const result: FlatNode[] = [];

  function buildFlat(parentId: string | null, depth: number) {
    const children = stashes
      .filter((s) => s.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const stash of children) {
      const nodeId = `stash-${stash.id}`;
      const kind = stash.parentId ? ('folder' as const) : ('collection' as const);

      result.push({
        id: nodeId,
        originalId: stash.id,
        parentId: stash.parentId,
        depth,
        kind,
        label: stash.name,
        stash,
      });

      // Only descend into children if expanded
      if (expandedIds.has(nodeId)) {
        // Child stashes
        buildFlat(stash.id, depth + 1);

        // Child endpoints
        const childEndpoints = endpoints
          .filter((ep) => ep.stashId === stash.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

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

  // Start from root — stashes with no parent
  buildFlat(null, 0);

  return result;
}

// ── Collision Detection ──

const REPARENT_ZONE_RATIO = 0.5;   // middle 50% = reparent (for folders)
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

  // Middle zone: reparent if target is a folder/collection, otherwise insert after
  if (overNode.kind === 'collection' || overNode.kind === 'folder') {
    return { action: 'reparent', parentId: overNode.originalId };
  }

  // For endpoints, default to insert after
  return { action: 'reorder-after', afterId: overId };
}

// ── Cycle Detection ──

/**
 * Check whether ancestorId is an ancestor of childId in the stash hierarchy.
 * Used to prevent moving a folder into its own descendant.
 */
export function isAncestor(
  stashes: StashRecord[],
  childId: string,
  potentialAncestorId: string,
): boolean {
  let currentId: string | null = potentialAncestorId;
  while (currentId) {
    if (currentId === childId) return true;
    const parent = stashes.find((s) => s.id === currentId);
    currentId = parent?.parentId ?? null;
  }
  return false;
}
