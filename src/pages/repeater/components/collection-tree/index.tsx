import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCollectionsStore } from '@/stores/collections';
import { TreeNodeRow } from './tree-node-row';
import { InlineCreate } from './inline-create';
import { useCollectionsTree } from './use-collections-tree';
import { CollectionDropZone } from './collection-drop-zone';
import { TreeHeader } from './tree-header';
import { DragOverlayContent } from './drag-overlay-content';
import { DeleteDialog } from './delete-dialog';
import { ImportDialog } from './import-dialog';

export function CollectionsTree({ workspaceId }: { workspaceId: string }) {
  const selectedNodeId = useCollectionsStore((s) => s.selectedNodeId);
  const {
    expandedIds,
    inlineCreate,
    renameTarget,
    renameValue,
    setRenameValue,
    dragActiveId,
    dragOverId,
    deleteTarget,
    importDialogOpen,
    sensors,
    flatNodes,
    activeNode,
    flatNodeIds,
    nonEmptyStashIds,
    stashEndpointCounts,
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
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    setDeleteTarget,
    setImportDialogOpen,
  } = useCollectionsTree(workspaceId);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <TreeHeader
        onExport={handleExport}
        onImportClick={handleImportClick}
        onCreateCollection={handleCreateCollection}
      />

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
                const isInlineCreateParent = inlineCreate && inlineCreate.parentId === node.originalId;

                return (
                  <React.Fragment key={node.id}>
                    <TreeNodeRow
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      isExpanded={expandedIds.has(node.id)}
                      isDragOver={false}
                      dropAction={null}
                      endpointCount={stashEndpointCounts.get(node.originalId) ?? 0}
                      isRenaming={renameTarget?.id === node.id}
                      renameValue={renameValue}
                      onRenameValueChange={setRenameValue}
                      onRenameSubmit={handleRenameSubmit}
                      onRenameCancel={handleRenameCancel}
                      onSelect={handleSelectNode}
                      onToggleExpand={handleToggleExpand}
                      onAddChild={handleAddChild}
                      onRename={handleRename}
                      onDelete={handleDelete}
                    />
                    {/* Drop zone for empty expanded collections */}
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
                    {/* Inline create input */}
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
            <DragOverlayContent node={activeNode} />
          </DragOverlay>
        </DndContext>
      </div>

      <DeleteDialog
        deleteTarget={deleteTarget}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />
    </div>
  );
}
