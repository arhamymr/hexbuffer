import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  useCollectionsStore,
  type StashRecord,
  type StashEndpointRecord,
} from '@/stores/collections';
import { toast } from 'sonner';
import { exportCollectionsToFile, importCollectionsFromFile } from '@/pages/repeater/lib/collection-io';
import {
  flattenVisibleTree,
  computeDropResult,
  type FlatNode,
} from './utils';
import {
  createCollection,
  createFolder,
  createEndpoint,
  renameCollection,
  renameEndpoint,
  deleteCollection,
  deleteEndpoint,
  selectEndpoint,
  selectCollection,
} from '@/triggers/repeater';


export function useCollectionsTree(workspaceId: string) {
  // ── Zustand selectors ──
  const stashes = useCollectionsStore((s) => s.stashes);
  const endpoints = useCollectionsStore((s) => s.endpoints);

  // ── State ──
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [inlineCreate, setInlineCreate] = useState<{ parentId: string; type: 'endpoint' | 'collection' } | null>(null);
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
    () => flattenVisibleTree(stashes, endpoints, expandedIds, workspaceId),
    [stashes, endpoints, expandedIds, workspaceId],
  );

  // ── Lookup helpers ──
  const flatNodeMap = useMemo(() => {
    const map = new Map<string, FlatNode>();
    for (const node of flatNodes) map.set(node.id, node);
    return map;
  }, [flatNodes]);

  const activeNode = dragActiveId ? flatNodeMap.get(dragActiveId) ?? null : null;

  // ── Sortable item IDs ──
  const flatNodeIds = useMemo(
    () => flatNodes.map((n) => n.id),
    [flatNodes],
  );

  // ── Non-empty stash IDs ──
  const nonEmptyStashIds = useMemo(() => {
    const set = new Set<string>();
    for (const ep of endpoints) {
      set.add(ep.stashId);
    }
    for (const s of stashes) {
      if (s.parentId) {
        set.add(s.parentId);
      }
    }
    return set;
  }, [stashes, endpoints]);

  // ── Endpoint count per stash ──
  const stashEndpointCounts = useMemo(() => {
    const map = new Map<string, number>();
    const directCounts = new Map<string, number>();
    for (const ep of endpoints) {
      directCounts.set(ep.stashId, (directCounts.get(ep.stashId) ?? 0) + 1);
    }
    const childStashes = new Map<string, string[]>();
    for (const s of stashes) {
      if (s.parentId) {
        if (!childStashes.has(s.parentId)) {
          childStashes.set(s.parentId, []);
        }
        childStashes.get(s.parentId)!.push(s.id);
      }
    }
    function getCount(stashId: string): number {
      if (map.has(stashId)) return map.get(stashId)!;
      let count = directCounts.get(stashId) ?? 0;
      const children = childStashes.get(stashId) || [];
      for (const childId of children) {
        count += getCount(childId);
      }
      map.set(stashId, count);
      return count;
    }
    for (const s of stashes) {
      getCount(s.id);
    }
    return map;
  }, [stashes, endpoints]);

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
      if (node.kind === 'endpoint') {
        selectEndpoint(node.originalId);
      } else {
        selectCollection(node.originalId);
      }
    },
    [],
  );

  // ── Inline Create ──
  const handleAddChild = useCallback((parentId: string, type: 'endpoint' | 'collection') => {
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
      if (inlineCreate.type === 'endpoint') {
        await createEndpoint(inlineCreate.parentId, name.trim());
      } else if (inlineCreate.type === 'collection') {
        await createFolder(inlineCreate.parentId, name.trim());
      }
      setInlineCreate(null);
    },
    [inlineCreate],
  );

  const handleCreateCancel = useCallback(() => {
    setInlineCreate(null);
  }, []);

  // ── Create Collection ──
  const handleCreateCollection = useCallback(() => {
    setRenameTarget(null);
    setInlineCreate(null);
    void createCollection(workspaceId, 'New Collection');
  }, [workspaceId]);

  // ── Rename ──
  const handleRename = useCallback((node: FlatNode) => {
    setRenameTarget({ id: node.id, name: node.label });
    setRenameValue(node.label);
    setInlineCreate(null);
  }, []);

  const handleRenameCancel = useCallback(() => {
    setRenameTarget(null);
    setRenameValue('');
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) {
      setRenameTarget(null);
      setRenameValue('');
      return;
    }
    const { id } = renameTarget;
    if (id.startsWith('stash-')) {
      await renameCollection(id.slice(6), renameValue.trim());
    } else if (id.startsWith('ep-')) {
      await renameEndpoint(id.slice(3), renameValue.trim());
    }
    setRenameTarget(null);
    setRenameValue('');
  }, [renameTarget, renameValue]);

  const handleRenameBlur = useCallback(() => {
    void handleRenameSubmit();
  }, [handleRenameSubmit]);

  // ── Delete ──
  const handleDelete = useCallback((node: FlatNode) => {
    setDeleteTarget(node);
  }, []);

  const handleDeleteCancel = useCallback(() => setDeleteTarget(null), []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'endpoint') {
      await deleteEndpoint(deleteTarget.originalId);
    } else {
      await deleteCollection(deleteTarget.originalId);
    }
    setDeleteTarget(null);
  }, [deleteTarget]);

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
      if (!result) return;
      setPendingImport(result);
      setImportDialogOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message || 'Failed to import collections');
    }
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!pendingImport) return;
    const summary = await useCollectionsStore.getState().batchImportCollections(
      pendingImport.stashes,
      pendingImport.endpoints,
      workspaceId,
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
  }, [pendingImport, workspaceId]);

  const handleImportCancel = useCallback(() => {
    setPendingImport(null);
  }, []);

  // ── DnD Handlers ──

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
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
      hoverExpandTargetRef.current = null;
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      const overId = over ? (over.id as string) : null;
      setDragOverId(overId);

      if (!overId) {
        if (hoverExpandTimerRef.current) {
          clearTimeout(hoverExpandTimerRef.current);
          hoverExpandTimerRef.current = null;
          hoverExpandTargetRef.current = null;
        }
        return;
      }

      const overNode = flatNodeMap.get(overId);
      if (!overNode || overNode.kind !== 'collection') {
        if (hoverExpandTimerRef.current) {
          clearTimeout(hoverExpandTimerRef.current);
          hoverExpandTimerRef.current = null;
          hoverExpandTargetRef.current = null;
        }
        return;
      }

      if (expandedIds.has(overNode.id)) return;
      if (hoverExpandTargetRef.current === overNode.id) return;

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

      if (overId.startsWith('dropzone-')) {
        const targetStashId = overId.slice('dropzone-'.length);
        if (activeFlatNode.kind === 'endpoint' && activeFlatNode.parentId !== targetStashId) {
          useCollectionsStore.getState().moveEndpoint(activeFlatNode.originalId, targetStashId, 0);
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

      const isDescendant = (childStashId: string, possibleAncestorId: string): boolean => {
        if (childStashId === possibleAncestorId) return true;
        const stash = stashes.find((s) => s.id === childStashId);
        if (!stash || !stash.parentId) return false;
        return isDescendant(stash.parentId, possibleAncestorId);
      };

      if (result.action === 'reparent') {
        const newParentId = result.parentId;
        if (activeFlatNode.kind === 'endpoint') {
          if (activeFlatNode.parentId !== newParentId) {
            useCollectionsStore.getState().moveEndpoint(activeFlatNode.originalId, newParentId, 0);
          }
        } else if (activeFlatNode.kind === 'collection') {
          if (activeFlatNode.originalId === newParentId) {
            setDragActiveId(null);
            return;
          }
          if (isDescendant(newParentId, activeFlatNode.originalId)) {
            toast.error("Cannot move a folder inside itself or its own subfolders");
            setDragActiveId(null);
            return;
          }
          if (activeFlatNode.parentId !== newParentId) {
            useCollectionsStore.getState().moveStash(activeFlatNode.originalId, 0, newParentId);
          }
        }
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

        if (activeFlatNode.kind === 'endpoint') {
          let targetStashId = targetNode.kind === 'collection' ? targetNode.parentId : targetNode.parentId;

          if (!targetStashId || targetStashId === workspaceId) {
            if (targetNode.kind === 'collection') {
              targetStashId = targetNode.originalId;
            } else {
              setDragActiveId(null);
              return;
            }
          }

          if (activeFlatNode.parentId !== targetStashId) {
            useCollectionsStore.getState().moveEndpoint(activeFlatNode.originalId, targetStashId, 0);
            setDragActiveId(null);
            return;
          }

          const siblingEndpoints = flatNodes.filter(
            (n) =>
              n.parentId === targetStashId &&
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
            useCollectionsStore.getState().moveEndpoint(node.originalId, targetStashId, idx);
          });
          setDragActiveId(null);
          return;
        }

        if (activeFlatNode.kind === 'collection') {
          const targetParentId = targetNode.parentId;

          if (targetParentId && (activeFlatNode.originalId === targetParentId || isDescendant(targetParentId, activeFlatNode.originalId))) {
            toast.error("Cannot move a folder inside itself or its own subfolders");
            setDragActiveId(null);
            return;
          }

          const siblingStashes = flatNodes.filter(
            (n) =>
              n.parentId === targetParentId &&
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
            useCollectionsStore.getState().moveStash(node.originalId, idx, targetParentId);
          });
          setDragActiveId(null);
          return;
        }
      }

      setDragActiveId(null);
    },
    [flatNodes, flatNodeMap],
  );

  return {
    // State
    expandedIds,
    inlineCreate,
    renameTarget,
    renameValue,
    setRenameValue,
    dragActiveId,
    dragOverId,
    deleteTarget,
    importDialogOpen,
    // Derived
    sensors,
    flatNodes,
    activeNode,
    flatNodeIds,
    nonEmptyStashIds,
    stashEndpointCounts,
    // Handlers
    handleToggleExpand,
    handleSelectNode,
    handleAddChild,
    handleCreateSubmit,
    handleCreateCancel,
    handleRename,
    handleRenameSubmit,
    handleRenameBlur,
    handleRenameCancel,
    handleDelete,
    handleDeleteCancel,
    handleDeleteConfirm,
    handleExport,
    handleImportClick,
    handleImportConfirm,
    handleImportCancel,
    handleCreateCollection,
    // DnD
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    // Setters
    setDeleteTarget,
    setImportDialogOpen,
  };
}
