import { useMemo } from 'react';
import { useCollectionsStore, type StashRecord } from '@/stores/collections';

export interface CollectionNode {
  stashId: string;
  name: string;
  parentId: string | null;
  isFolder: boolean;
  children: CollectionNode[];
}

function buildCollectionTree(stashes: StashRecord[]): CollectionNode[] {
  // Build a map of id → node
  const nodeMap = new Map<string, CollectionNode>();
  const roots: CollectionNode[] = [];

  for (const stash of stashes) {
    const node: CollectionNode = {
      stashId: stash.id,
      name: stash.name,
      parentId: stash.parentId,
      isFolder: false,
      children: [],
    };
    nodeMap.set(stash.id, node);
  }

  // Link children to parents
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(node);
      parent.isFolder = true;
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function useCollectionPicker() {
  const stashes = useCollectionsStore((s) => s.stashes);
  const isHydrated = useCollectionsStore((s) => s.isHydrated);

  const rootCollections = useMemo(
    () => (isHydrated ? buildCollectionTree(stashes) : []),
    [stashes, isHydrated],
  );

  const isEmpty = isHydrated && rootCollections.length === 0;

  return {
    rootCollections,
    isLoading: !isHydrated,
    isEmpty,
  } as const;
}
