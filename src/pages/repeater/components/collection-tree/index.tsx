import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  MeasuringStrategy,
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
import { Plus, Edit2, Download, Upload, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportCollectionsToFile, importCollectionsFromFile } from '@/pages/repeater/lib/collection-io';
import { TreeNodeRow } from './tree-node-row';
import { InlineCreate } from './inline-create';
import {
  flattenVisibleTree,
  computeDropResult,
  type FlatNode,
} from './utils';

// ── Empty State + Drop Zone for expanded empty collections ──

function CollectionDropZone({ stashId, isActive, isDragging, onAddChild }: { stashId: string; isActive: boolean; isDragging: boolean; onAddChild: (parentId: string) => void }) {
  const droppableId = `dropzone-${stashId}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { stashId, kind: 'drop-zone' },
  });

  const showVisual = isDragging && (isActive || isOver);

  return (
    <div
      ref={setNodeRef}
      id={droppableId}
      className={cn(
        'mx-2 rounded-sm transition-all duration-200 ease-out',
        // Active drop target
        showVisual
          ? 'h-9 my-0.5 border border-dashed flex items-center justify-center ' +
            (isOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/20')
          // Dragging but not target — minimal strip for collision detection
          : isDragging
            ? 'h-1 my-0 border border-transparent'
            // Idle empty state — visible message
            : 'h-16 my-1 flex flex-col items-center justify-center gap-1.5',
      )}
    >
      {/* Active drop target label */}
      {showVisual && (
        <span className="text-[10px] text-muted-foreground/40">
          Drop here
        </span>
      )}

      {/* Idle empty state */}
      {!isDragging && (
        <>
          
          
          <span className="text-[10px] text-muted-foreground/40">
            No endpoints yet
          </span>
          <button
            type="button"
            className="text-[10px] text-muted-foreground/50 hover:text-primary/70 transition-colors underline underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(stashId);
            }}
          >
            Create one now
          </button>
        </>
      )}
    </div>
  );
}

// ── Component ──

export function CollectionsTree() {
  const store = useCollectionsStore();
  const repeaterStore = useRepeaterStore();

  // ── State ──
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [inlineCreate, setInlineCreate] = useState<{ parentId: string; type: 'endpoint' } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverExpandTargetRef = useRef<string | null>(null);
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

  // ── Sortable item IDs (stable — only changes when flatNodes changes) ──
  const flatNodeIds = useMemo(
    () => flatNodes.map((n) => n.id),
    [flatNodes],
  );

  // ── Non-empty stash IDs (for drop-zone rendering) ──
  const nonEmptyStashIds = useMemo(() => {
    const set = new Set<string>();
    for (const ep of store.endpoints) set.add(ep.stashId);
    return set;
  }, [store.endpoints]);

  // ── Endpoint count per stash ──
  const stashEndpointCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ep of store.endpoints) {
      map.set(ep.stashId, (map.get(ep.stashId) ?? 0) + 1);
    }
    return map;
  }, [store.endpoints]);

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
  const handleAddChild = useCallback((parentId: string, _type: 'endpoint') => {
    // Make sure parent is expanded
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(`stash-${parentId}`);
      return next;
    });
    setInlineCreate({ parentId, type: 'endpoint' });
    setRenameTarget(null);
  }, []);

  const handleCreateSubmit = useCallback(
    async (name: string) => {
      if (!inlineCreate || !name.trim()) {
        setInlineCreate(null);
        return;
      }
      if (inlineCreate.type === 'endpoint') {
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
    // Clear any stale hover-expand timer
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
      hoverExpandTargetRef.current = null;
    }
  }, []);

  // Auto-expand collapsed collections on drag hover
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      const overId = over ? (over.id as string) : null;
      setDragOverId(overId);

      if (!overId) {
        // Pointer left all droppables — clear timer
        if (hoverExpandTimerRef.current) {
          clearTimeout(hoverExpandTimerRef.current);
          hoverExpandTimerRef.current = null;
          hoverExpandTargetRef.current = null;
        }
        return;
      }

      const overNode = flatNodeMap.get(overId);
      if (!overNode || overNode.kind !== 'collection') {
        // Not hovering a collection — clear timer
        if (hoverExpandTimerRef.current) {
          clearTimeout(hoverExpandTimerRef.current);
          hoverExpandTimerRef.current = null;
          hoverExpandTargetRef.current = null;
        }
        return;
      }

      // Already expanded — nothing to do
      if (expandedIds.has(overNode.id)) return;

      // Same collapsed collection still being hovered — keep timer
      if (hoverExpandTargetRef.current === overNode.id) return;

      // New collapsed collection — start/restart timer
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
      }
      hoverExpandTargetRef.current = overNode.id;
      hoverExpandTimerRef.current = setTimeout(() => {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(overNode.id);
          return next;
        });
        hoverExpandTimerRef.current = null;
        hoverExpandTargetRef.current = null;
      }, 800);
    },
    [flatNodeMap, expandedIds],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Clean up hover-expand timer
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
        hoverExpandTimerRef.current = null;
        hoverExpandTargetRef.current = null;
      }
      setDragOverId(null);

      if (!over || active.id === over.id) {
        setDragActiveId(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeFlatNode = flatNodeMap.get(activeId);
      if (!activeFlatNode) {
        setDragActiveId(null);
        return;
      }

      // ── Handle drop-zone for empty collections ──
      if (overId.startsWith('dropzone-')) {
        const targetStashId = overId.slice('dropzone-'.length);
        if (activeFlatNode.kind === 'endpoint' && activeFlatNode.parentId !== targetStashId) {
          store.moveEndpoint(activeFlatNode.originalId, targetStashId, 0);
        }
        setDragActiveId(null);
        return;
      }

      const pointerY = pointerPos.current?.y ?? null;
      const overEl = document.getElementById(overId);
      const rect = overEl?.getBoundingClientRect() ?? null;

      if (!rect) {
        setDragActiveId(null);
        return;
      }

      // Fallback: if pointer position is unavailable, use center of over rect
      const effectivePointerY = pointerY ?? (rect.top + rect.height / 2);

      const result = computeDropResult(flatNodes, activeId, overId, effectivePointerY, rect);
      if (!result) {
        setDragActiveId(null);
        return;
      }

      const overFlatNode = flatNodeMap.get(overId);
      if (!overFlatNode) {
        setDragActiveId(null);
        return;
      }

      if (result.action === 'reparent') {
        if (activeFlatNode.kind === 'endpoint') {
          const newParentId = result.parentId;
          if (activeFlatNode.parentId !== newParentId) {
            store.moveEndpoint(activeFlatNode.originalId, newParentId, 0);
          }
        }
        // Collection dropped on collection — NOP (all root-level)
        setDragActiveId(null);
        return;
      }

      if (result.action === 'reorder-before' || result.action === 'reorder-after') {
        const targetId = result.action === 'reorder-before' ? result.beforeId : result.afterId;
        const targetNode = flatNodeMap.get(targetId);
        if (!targetNode) {
          setDragActiveId(null);
          return;
        }

        // ── Endpoint reorder ──
        if (activeFlatNode.kind === 'endpoint') {
          if (targetNode.kind === 'collection') {
            // Boundary case: endpoint dropped near a collection — reparent into it
            if (activeFlatNode.parentId !== targetNode.originalId) {
              store.moveEndpoint(activeFlatNode.originalId, targetNode.originalId, 0);
            }
            setDragActiveId(null);
            return;
          }

          // targetNode.kind === 'endpoint'
          // Cross-collection drop: move to the target endpoint's collection
          if (activeFlatNode.parentId !== targetNode.parentId) {
            store.moveEndpoint(activeFlatNode.originalId, targetNode.parentId!, 0);
            setDragActiveId(null);
            return;
          }

          // Same-collection reorder
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

          reordered.forEach((node, idx) => {
            store.moveEndpoint(node.originalId, node.parentId!, idx);
          });
          setDragActiveId(null);
          return;
        }

        // ── Stash reorder ──
        if (targetNode.kind === 'endpoint') {
          setDragActiveId(null);
          return;
        }

        const siblingStashes = flatNodes.filter(
          (n) =>
            n.parentId === targetNode.parentId &&
            n.kind === 'collection' &&
            n.id !== activeId,
        );

        const activeIndex = siblingStashes.findIndex((n) => n.id === activeId);
        let targetIndex = siblingStashes.findIndex((n) => n.id === targetId);
        if (result.action === 'reorder-after') targetIndex += 1;

        const reordered = [...siblingStashes];
        if (activeIndex >= 0) {
          reordered.splice(activeIndex, 1);
          if (activeIndex < targetIndex) targetIndex -= 1;
        }
        reordered.splice(targetIndex, 0, activeFlatNode);

        reordered.forEach((node, idx) => {
          store.moveStash(node.originalId, idx);
        });
        setDragActiveId(null);
        return;
      }

      setDragActiveId(null);
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
                store.createStash('New Collection');
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
          collisionDetection={closestCorners}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.WhileDragging,
            },
          }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={flatNodeIds}
            strategy={verticalListSortingStrategy}
          >
            {flatNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No Collections</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Create a collection to start organizing your API endpoints.
                </p>
              </div>
            ) : (
              flatNodes.map((node) => {
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
                      endpointCount={stashEndpointCounts.get(node.originalId) ?? 0}
                      onSelect={handleSelectNode}
                      onToggleExpand={handleToggleExpand}
                      onAddChild={handleAddChild}
                      onRename={handleRename}
                      onDelete={handleDelete}
                    />
                    {/* Drop zone for empty expanded collections — only visible when nearest target */}
                    {node.kind === 'collection' &&
                      expandedIds.has(node.id) &&
                      !nonEmptyStashIds.has(node.originalId) && (
                        <CollectionDropZone
                          stashId={node.originalId}
                          isActive={
                            dragActiveId !== null &&
                            dragOverId === `dropzone-${node.originalId}`
                          }
                          isDragging={dragActiveId !== null}
                          onAddChild={(parentId) => handleAddChild(parentId, 'endpoint')}
                        />
                      )}
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
              {deleteTarget?.kind === 'endpoint' ? 'Delete endpoint?' : 'Delete collection?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'endpoint'
                ? `"${deleteTarget.label}" will be permanently deleted.`
                : `"${deleteTarget?.label}" and all its endpoints will be permanently deleted. This action cannot be undone.`
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
