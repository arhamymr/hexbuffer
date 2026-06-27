import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCollectionsStore,
  type StashRecord,
  type StashEndpointRecord,
} from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';
import { Plus, Edit2, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportCollectionsToFile, importCollectionsFromFile } from '@/pages/repeater/lib/collection-io';
import { TreeNodeRow } from './tree-node-row';
import { InlineCreate } from './inline-create';
import {
  flattenVisibleTree,
  computeDropResult,
  isAncestor,
  type FlatNode,
} from './utils';

// ── Component ──

export function CollectionsTree() {
  const store = useCollectionsStore();
  const repeaterStore = useRepeaterStore();

  // ── State ──
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand root collections on first mount
    const roots = store.stashes.filter((s) => !s.parentId);
    return new Set(roots.map((s) => `stash-${s.id}`));
  });
  const [inlineCreate, setInlineCreate] = useState<{ parentId: string; type: 'folder' | 'endpoint' } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlatNode | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    stashes: StashRecord[];
    endpoints: StashEndpointRecord[];
  } | null>(null);

  // ── Sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Flat tree ──
  const flatNodes = useMemo(
    () => flattenVisibleTree(store.stashes, store.endpoints, expandedIds),
    [store.stashes, store.endpoints, expandedIds],
  );

  // ── Lookup helpers ──
  const flatNodeMap = useMemo(() => {
    const map = new Map<string, FlatNode>();
    for (const node of flatNodes) map.set(node.id, node);
    return map;
  }, [flatNodes]);

  const activeNode = dragActiveId ? flatNodeMap.get(dragActiveId) ?? null : null;

  // ── Reordered display list during drag ──
  // When dragging, shift items so the active item appears where the over item is.
  // This gives live visual feedback as the user drags.
  const displayNodes = useMemo(() => {
    if (!dragActiveId || !dragOverId || dragActiveId === dragOverId) {
      return flatNodes;
    }
    const activeIndex = flatNodes.findIndex((n) => n.id === dragActiveId);
    const overIndex = flatNodes.findIndex((n) => n.id === dragOverId);
    if (activeIndex === -1 || overIndex === -1) return flatNodes;

    const reordered = [...flatNodes];
    const [moved] = reordered.splice(activeIndex, 1);
    // Insert before the over item (adjusting for removal shift)
    const insertAt = overIndex > activeIndex ? overIndex - 1 : overIndex;
    reordered.splice(insertAt, 0, moved);
    return reordered;
  }, [flatNodes, dragActiveId, dragOverId]);

  // ── Expand/Collapse ──
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Selection ──
  const handleSelectNode = useCallback(
    (node: FlatNode) => {
      store.setSelectedNodeId(node.id);
      if (node.kind === 'endpoint' && node.endpoint) {
        store.setActiveEndpointId(node.endpoint.id);
      }
      // When clicking a root collection, create/activate a collection tab
      if (node.kind === 'collection' && node.stash) {
        repeaterStore.addCollectionTab(node.stash.id, node.stash.name);
        store.setMode('craft');
      }
    },
    [store, repeaterStore],
  );

  // ── Inline Create ──
  const handleAddChild = useCallback((parentId: string, type: 'folder' | 'endpoint') => {
    // Make sure parent is expanded
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(`stash-${parentId}`);
      return next;
    });
    setInlineCreate({ parentId, type });
    setRenameTarget(null);
  }, []);

  const handleCreateSubmit = useCallback(
    async (name: string) => {
      if (!inlineCreate || !name.trim()) {
        setInlineCreate(null);
        return;
      }
      if (inlineCreate.type === 'folder') {
        await store.createStash(name.trim(), inlineCreate.parentId);
      } else if (inlineCreate.type === 'endpoint') {
        await store.createEndpoint(inlineCreate.parentId, name.trim());
      }
      setInlineCreate(null);
    },
    [inlineCreate, store],
  );

  const handleCreateCancel = useCallback(() => {
    setInlineCreate(null);
  }, []);

  // ── Rename ──
  const handleRename = useCallback((node: FlatNode) => {
    setRenameTarget({ id: node.id, name: node.label });
    setRenameValue(node.label);
    setInlineCreate(null);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) {
      setRenameTarget(null);
      setRenameValue('');
      return;
    }
    const { id } = renameTarget;
    if (id.startsWith('stash-')) {
      await store.renameStash(id.slice(6), renameValue.trim());
    }
    setRenameTarget(null);
    setRenameValue('');
  }, [renameTarget, renameValue, store]);

  // ── Delete ──
  const handleDelete = useCallback((node: FlatNode) => {
    setDeleteTarget(node);
  }, []);

  const handleDeleteCancel = useCallback(() => setDeleteTarget(null), []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'endpoint') {
      await store.deleteEndpoint(deleteTarget.originalId);
    } else {
      await store.deleteStash(deleteTarget.originalId);
    }
    setDeleteTarget(null);
  }, [deleteTarget, store]);

  // ── Import / Export ──
  const handleExport = useCallback(async () => {
    try {
      await exportCollectionsToFile();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message || 'Failed to export collections');
    }
  }, []);

  const handleImportClick = useCallback(async () => {
    try {
      const result = await importCollectionsFromFile();
      if (!result) return; // user cancelled
      setPendingImport(result);
      setImportDialogOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message || 'Failed to import collections');
    }
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!pendingImport) return;
    const summary = await store.batchImportCollections(
      pendingImport.stashes,
      pendingImport.endpoints,
    );
    if (summary.errors.length > 0) {
      toast.warning(
        `Imported ${summary.stashesImported} collections and ${summary.endpointsImported} endpoints with ${summary.errors.length} error${summary.errors.length !== 1 ? 's' : ''}`,
      );
    } else {
      toast.success(
        `Imported ${summary.stashesImported} collections and ${summary.endpointsImported} endpoints`,
      );
    }
    setImportDialogOpen(false);
    setPendingImport(null);
  }, [pendingImport, store]);

  // ── DnD Handlers ──

  // Track pointer position during drag for zone-based drop detection
  const pointerPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!dragActiveId) {
      pointerPos.current = null;
      return;
    }
    const handlePointerMove = (e: PointerEvent) => {
      pointerPos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [dragActiveId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (event.over) {
      setDragOverId(event.over.id as string);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragActiveId(null);
      setDragOverId(null);

      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const pointerY = pointerPos.current?.y ?? null;

      // Get the over element's rect for zone detection
      const overEl = document.getElementById(overId);
      const rect = overEl?.getBoundingClientRect() ?? null;

      if (!rect || pointerY === null) return;

      const result = computeDropResult(flatNodes, activeId, overId, pointerY, rect);
      if (!result) return;

      const activeFlatNode = flatNodeMap.get(activeId);
      const overFlatNode = flatNodeMap.get(overId);
      if (!activeFlatNode || !overFlatNode) return;

      if (result.action === 'reparent') {
        if (activeFlatNode.kind === 'endpoint') {
          // Move endpoint to a different folder
          const newParentId = result.parentId;
          if (activeFlatNode.parentId === newParentId) return;
          store.moveEndpoint(activeFlatNode.originalId, newParentId, 0);
          return;
        }

        // Stash reparent
        const newParentId = result.parentId;

        // Cycle prevention
        if (isAncestor(store.stashes, activeFlatNode.originalId, newParentId)) return;

        // Don't reparent to same parent
        if (activeFlatNode.parentId === newParentId) return;

        store.moveStash(activeFlatNode.originalId, newParentId);
      } else if (result.action === 'reorder-before' || result.action === 'reorder-after') {
        const targetId = result.action === 'reorder-before' ? result.beforeId : result.afterId;
        const targetNode = flatNodeMap.get(targetId);
        if (!targetNode) return;

        // Endpoint reorder: only allow reordering among endpoints in the same parent
        if (activeFlatNode.kind === 'endpoint') {
          if (targetNode.kind !== 'endpoint') return;
          if (activeFlatNode.parentId !== targetNode.parentId) return;

          const siblingEndpoints = flatNodes.filter(
            (n) =>
              n.parentId === targetNode.parentId &&
              n.kind === 'endpoint' &&
              n.id !== activeId,
          );

          const activeIndex = siblingEndpoints.findIndex((n) => n.id === activeId);
          let targetIndex = siblingEndpoints.findIndex((n) => n.id === targetId);
          if (result.action === 'reorder-after') targetIndex += 1;

          const reordered = [...siblingEndpoints];
          if (activeIndex >= 0) {
            reordered.splice(activeIndex, 1);
            if (activeIndex < targetIndex) targetIndex -= 1;
          }
          reordered.splice(targetIndex, 0, activeFlatNode);

          for (let i = 0; i < reordered.length; i++) {
            store.moveEndpoint(reordered[i].originalId, reordered[i].parentId!, i);
          }
          return;
        }

        // Stash reorder
        if (targetNode.kind === 'endpoint') return;

        // Collect all sibling stashes at the same level
        const siblingStashes = flatNodes.filter(
          (n) =>
            n.parentId === targetNode.parentId &&
            (n.kind === 'collection' || n.kind === 'folder') &&
            n.id !== activeId,
        );

        const activeIndex = siblingStashes.findIndex((n) => n.id === activeId);
        let targetIndex = siblingStashes.findIndex((n) => n.id === targetId);
        if (result.action === 'reorder-after') targetIndex += 1;

        // Rebuild sort orders by inserting active at target position
        const reordered = [...siblingStashes];
        if (activeIndex >= 0) {
          reordered.splice(activeIndex, 1);
          if (activeIndex < targetIndex) targetIndex -= 1;
        }
        reordered.splice(targetIndex, 0, activeFlatNode);

        // Update sortOrder for each sibling
        for (let i = 0; i < reordered.length; i++) {
          store.moveStash(reordered[i].originalId, reordered[i].parentId, i);
        }
      }
    },
    [flatNodes, flatNodeMap, store],
  );

  // ── Render ──

  const selectedNodeId = store.selectedNodeId;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="shrink-0 p-2 border-b space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Collections
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Export Collections"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Import Collections"
              onClick={handleImportClick}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="New Collection"
              onClick={() => {
                setRenameTarget(null);
                setInlineCreate(null);
                // Create a root-level collection with a temp name
                store.createStash('New Collection', null);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Rename input (inline, shown when renaming a node) */}
        {renameTarget && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameSubmit();
            }}
            className="flex gap-1"
          >
            <Input
              className="h-7 text-xs"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                setTimeout(() => {
                  if (!renameValue.trim()) {
                    setRenameTarget(null);
                    setRenameValue('');
                  }
                }, 200);
              }}
              placeholder="Rename..."
            />
            <Button type="submit" size="icon" className="h-7 w-7 shrink-0">
              <Edit2 className="h-3 w-3" />
            </Button>
          </form>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 min-h-0 overflow-auto pt-1 pb-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayNodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No Collections</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Create a collection to start organizing your API endpoints.
                </p>
              </div>
            ) : (
              displayNodes.map((node) => {
                // Check if inline create should appear directly after this node's parent
                // We inline it as a child by checking if the parent id matches
                const isInlineCreateParent = inlineCreate && inlineCreate.parentId === node.originalId;
                const isNodeDragOver = false;
                const isDropTarget = false;

                return (
                  <React.Fragment key={node.id}>
                    <TreeNodeRow
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      isExpanded={expandedIds.has(node.id)}
                      isDragOver={isNodeDragOver}
                      dropAction={null}
                      onSelect={handleSelectNode}
                      onToggleExpand={handleToggleExpand}
                      onAddChild={handleAddChild}
                      onRename={handleRename}
                      onDelete={handleDelete}
                    />
                    {/* Inline create input appears right after the parent node */}
                    {isInlineCreateParent && (
                      <InlineCreate
                        depth={node.depth + 1}
                        type={inlineCreate.type}
                        onSubmit={handleCreateSubmit}
                        onCancel={handleCreateCancel}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeNode ? (
              <div className="flex items-center gap-1.5 rounded-sm bg-popover border px-2 py-1 shadow-md text-xs">
                <span className="truncate">{activeNode.label}</span>
                {activeNode.kind === 'endpoint' && activeNode.method && (
                  <span
                    className={cn(
                      'font-semibold uppercase text-[9px] px-1 rounded',
                      activeNode.method === 'GET' && 'bg-emerald-500/10 text-emerald-600',
                      activeNode.method === 'POST' && 'bg-blue-500/10 text-blue-600',
                      activeNode.method === 'PUT' && 'bg-amber-500/10 text-amber-600',
                      activeNode.method === 'DELETE' && 'bg-red-500/10 text-red-600',
                      activeNode.method === 'PATCH' && 'bg-purple-500/10 text-purple-600',
                    )}
                  >
                    {activeNode.method}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === 'endpoint' ? 'Delete endpoint?' : 'Delete folder?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'endpoint'
                ? `"${deleteTarget.label}" will be permanently deleted.`
                : `"${deleteTarget?.label}" and all its contents will be permanently deleted. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Collections?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all existing collections and endpoints with the imported schema.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImport(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleImportConfirm}>
              Replace All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
