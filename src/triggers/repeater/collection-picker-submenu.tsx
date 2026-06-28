import { FolderStarIcon, PaperPlaneTiltIcon, SpinnerGapIcon, FolderOpenIcon } from '@phosphor-icons/react';
import React, { useMemo } from 'react';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { useCollectionsStore } from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';

type MenuVariant = 'dropdown' | 'context';

interface CollectionPickerSubmenuProps {
  variant: MenuVariant;
  onSelect: (stashId: string) => void;
  disabled?: boolean;
}

export function CollectionPickerSubmenu({
  variant,
  onSelect,
  disabled,
}: CollectionPickerSubmenuProps) {
  const workspaces = useRepeaterStore((s) => s.workspaces);
  const stashes = useCollectionsStore((s) => s.stashes);
  const isHydrated = useCollectionsStore((s) => s.isHydrated);

  // Auto-create workspace if empty after hydration (ponytail: keep it simple and robust)
  React.useEffect(() => {
    if (isHydrated && workspaces.length === 0) {
      useRepeaterStore.getState().createWorkspace();
    }
  }, [isHydrated, workspaces.length]);

  const Sub = variant === 'dropdown' ? DropdownMenuSub : ContextMenuSub;
  const SubTrigger = variant === 'dropdown' ? DropdownMenuSubTrigger : ContextMenuSubTrigger;
  const SubContent = variant === 'dropdown' ? DropdownMenuSubContent : ContextMenuSubContent;
  const Item = variant === 'dropdown' ? DropdownMenuItem : ContextMenuItem;

  // ponytail: group collections by parentId (workspaceId) or fallback to first workspace for simplicity
  const workspaceCollectionsMap = useMemo(() => {
    const map: Record<string, typeof stashes> = {};
    for (const ws of workspaces) {
      map[ws.id] = [];
    }
    const defaultWorkspaceId = workspaces[0]?.id;
    for (const stash of stashes) {
      const parentId = stash.parentId || defaultWorkspaceId;
      if (parentId && map[parentId]) {
        map[parentId].push(stash);
      }
    }
    // Sort stashes in each workspace
    for (const wsId in map) {
      map[wsId].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [workspaces, stashes]);

  const handleCreateAndSelect = async (workspaceId: string) => {
    const stashId = await useCollectionsStore.getState().createStash('new collection', workspaceId);
    onSelect(stashId);
  };

  return (
    <Sub>
      <SubTrigger className="text-xs py-1 px-1.5" disabled={disabled}>
        <PaperPlaneTiltIcon className="mr-1.5 size-3" />
        Send to Repeater
      </SubTrigger>
      <SubContent>
        {!isHydrated ? (
          <Item className="text-xs py-1 px-1.5" disabled>
            <SpinnerGapIcon className="mr-1.5 size-3 animate-spin" />
            Loading workspaces...
          </Item>
        ) : workspaces.length === 0 ? (
          <Item className="text-xs py-1 px-1.5" disabled>
            No workspaces
          </Item>
        ) : (
          workspaces.map((ws) => {
            const collections = workspaceCollectionsMap[ws.id] || [];
            const hasCollections = collections.length > 0;

            return (
              <Sub key={ws.id}>
                <SubTrigger className="text-xs py-1 px-1.5">
                  <FolderOpenIcon className="mr-1.5 size-3" />
                  {ws.name}
                </SubTrigger>
                <SubContent>
                  {!hasCollections ? (
                    <Item
                      className="text-xs py-1 px-1.5 font-medium text-primary"
                      onClick={() => handleCreateAndSelect(ws.id)}
                    >
                      <FolderStarIcon className="mr-1.5 size-3" />
                      new collection
                    </Item>
                  ) : (
                    collections.map((node) => (
                      <Item
                        key={node.id}
                        className="text-xs py-1 px-1.5"
                        onClick={() => onSelect(node.id)}
                      >
                        <PaperPlaneTiltIcon className="mr-1.5 size-3" />
                        {node.name}
                      </Item>
                    ))
                  )}
                </SubContent>
              </Sub>
            );
          })
        )}
      </SubContent>
    </Sub>
  );
}
