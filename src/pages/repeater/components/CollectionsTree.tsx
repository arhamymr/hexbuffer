import React, { useState, useMemo, useCallback } from 'react';
import { TreeView, type TreeNodeData } from '@/components/tree-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCollectionsStore,
  type StashRecord,
  type StashEndpointRecord,
} from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';
import {
  Plus,
  FolderPlus,
  FilePlus,
  FolderHeart,
  FileCode,
  Trash2,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Tree Meta ──

interface CollectionMeta {
  kind: 'collection' | 'folder' | 'endpoint';
  nodeId: string;
  endpoint?: StashEndpointRecord;
  stash?: StashRecord;
}

// ── Helpers ──

function buildTree(
  stashes: StashRecord[],
  endpoints: StashEndpointRecord[],
): TreeNodeData<CollectionMeta>[] {
  const rootStashes = stashes.filter((s) => !s.parentId);

  return rootStashes.map((stash) => buildStashNode(stash, stashes, endpoints));
}

function buildStashNode(
  stash: StashRecord,
  allStashes: StashRecord[],
  endpoints: StashEndpointRecord[],
): TreeNodeData<CollectionMeta> {
  const childStashes = allStashes.filter((s) => s.parentId === stash.id);
  const childEndpoints = endpoints.filter((e) => e.stashId === stash.id);

  const children: TreeNodeData<CollectionMeta>[] = [
    ...childStashes.map((f) => buildStashNode(f, allStashes, endpoints)),
    ...childEndpoints.map((ep) => buildEndpointNode(ep)),
  ];

  return {
    id: `stash-${stash.id}`,
    type: stash.parentId ? 'folder' : 'collection',
    label: stash.name,
    children,
    icon: stash.parentId ? FileCode : FolderHeart,
    iconClassName: stash.parentId ? 'text-amber-500' : 'text-blue-500',
    meta: { kind: stash.parentId ? 'folder' : 'collection', nodeId: stash.id, stash },
  };
}

function buildEndpointNode(ep: StashEndpointRecord): TreeNodeData<CollectionMeta> {
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/10 text-emerald-600',
    POST: 'bg-blue-500/10 text-blue-600',
    PUT: 'bg-amber-500/10 text-amber-600',
    DELETE: 'bg-red-500/10 text-red-600',
    PATCH: 'bg-purple-500/10 text-purple-600',
  };

  return {
    id: `ep-${ep.id}`,
    type: 'endpoint',
    label: ep.name,
    description: ep.url || 'No URL set',
    method: ep.method,
    children: [],
    icon: FileCode,
    iconClassName: 'text-gray-500',
    badge: (
      <span
        className={cn(
          'font-semibold uppercase text-[9px] px-1 rounded',
          methodColors[ep.method] || 'bg-gray-500/10 text-gray-600',
        )}
      >
        {ep.method}
      </span>
    ),
    meta: { kind: 'endpoint', nodeId: ep.id, endpoint: ep },
  };
}

// ── Component ──

export function CollectionsTree() {
  const store = useCollectionsStore();
  const repeaterStore = useRepeaterStore();
  const [newName, setNewName] = useState('');
  const [createMode, setCreateMode] = useState<'collection' | 'folder' | 'endpoint' | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);

  // Build tree
  const treeNodes = useMemo(
    () => buildTree(store.stashes, store.endpoints),
    [store.stashes, store.endpoints],
  );

  // Selected node info
  const selectedNode = useMemo(() => {
    if (!store.selectedNodeId) return null;
    const tree = flattenTree(treeNodes);
    return tree.find((n) => n.id === store.selectedNodeId) ?? null;
  }, [store.selectedNodeId, treeNodes]);

  const selectedMeta = selectedNode?.meta;

  // Determine if we can create sub-items
  const canCreateInSelected =
    selectedMeta?.kind === 'collection' || selectedMeta?.kind === 'folder';

  // ── Handlers ──

  const handleSelectNode = useCallback(
    (node: TreeNodeData<CollectionMeta>) => {
      store.setSelectedNodeId(node.id);
      if (node.meta?.kind === 'endpoint' && node.meta.endpoint) {
        store.setActiveEndpointId(node.meta.endpoint.id);
      }

      // When clicking a root collection, create/activate a collection tab
      if (node.meta?.kind === 'collection' && node.meta.stash) {
        const stash = node.meta.stash;
        repeaterStore.addCollectionTab(stash.id, stash.name);
        store.setMode('craft');
      }
    },
    [store, repeaterStore],
  );

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;
    await store.createStash(newName.trim(), null);
    setNewName('');
    setCreateMode(null);
  };

  const handleCreateFolder = async () => {
    if (!newName.trim() || !selectedMeta?.nodeId) return;
    await store.createStash(newName.trim(), selectedMeta.nodeId);
    setNewName('');
    setCreateMode(null);
  };

  const handleCreateEndpoint = async () => {
    if (!newName.trim()) return;
    const parentId = canCreateInSelected ? selectedMeta!.nodeId : store.stashes.find((s) => !s.parentId)?.id;
    if (!parentId) {
      // No collection exists yet — create one first
      const newStashId = await store.createStash('My Collection', null);
      await store.createEndpoint(newStashId, newName.trim());
    } else {
      await store.createEndpoint(parentId, newName.trim());
    }
    setNewName('');
    setCreateMode(null);
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    const { id } = renameTarget;
    if (id.startsWith('stash-')) {
      await store.renameStash(id.slice(6), newName.trim());
    }
    setNewName('');
    setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    const { id, meta } = selectedNode;
    if (meta?.kind === 'collection' || meta?.kind === 'folder') {
      if (confirm(`Delete "${selectedNode.label}" and all its contents?`)) {
        await store.deleteStash(meta.nodeId);
      }
    } else if (meta?.kind === 'endpoint') {
      if (confirm(`Delete endpoint "${selectedNode.label}"?`)) {
        await store.deleteEndpoint(meta.nodeId);
      }
    }
  };

  // ── Render ──

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="shrink-0 p-2 border-b space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Collections
          </span>
          <div className="flex items-center gap-0.5">
            {!createMode && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="New Collection"
                  onClick={() => setCreateMode('collection')}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {canCreateInSelected && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="New Folder"
                      onClick={() => setCreateMode('folder')}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="New Endpoint"
                      onClick={() => setCreateMode('endpoint')}
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {selectedNode && (
                  <>
                    {(selectedMeta?.kind === 'collection' || selectedMeta?.kind === 'folder') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Rename"
                        onClick={() => {
                          setRenameTarget({ id: selectedNode.id, name: selectedNode.label });
                          setNewName(selectedNode.label);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create / Rename input */}
        {(createMode || renameTarget) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameTarget) handleRename();
              else if (createMode === 'collection') handleCreateCollection();
              else if (createMode === 'folder') handleCreateFolder();
              else if (createMode === 'endpoint') handleCreateEndpoint();
            }}
            className="flex gap-1"
          >
            <Input
              placeholder={
                renameTarget
                  ? 'Rename...'
                  : createMode === 'collection'
                  ? 'Collection name...'
                  : createMode === 'folder'
                  ? 'Folder name...'
                  : 'Endpoint name...'
              }
              className="h-7 text-xs"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                setTimeout(() => {
                  if (!newName.trim()) {
                    setCreateMode(null);
                    setRenameTarget(null);
                  }
                }, 200);
              }}
            />
            <Button type="submit" size="icon" className="h-7 w-7 shrink-0">
              <Plus className="h-3 w-3" />
            </Button>
          </form>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 min-h-0">
        <TreeView<CollectionMeta>
          nodes={treeNodes}
          selectedId={store.selectedNodeId}
          onSelectNode={handleSelectNode}
          emptyTitle="No Collections"
          emptyDescription="Create a collection to start organizing your API endpoints."
          errorTitle="Failed to load"
        />
      </div>

    </div>
  );
}

// ── Utility: flatten tree ──

function flattenTree<TMeta>(
  nodes: TreeNodeData<TMeta>[],
): TreeNodeData<TMeta>[] {
  const result: TreeNodeData<TMeta>[] = [];
  const walk = (list: TreeNodeData<TMeta>[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}
