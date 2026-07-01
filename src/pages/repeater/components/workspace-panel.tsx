import { useCollectionsStore } from '@/stores/collections';
import { CollectionsTree } from './collection-tree';
import { ForgePanel } from './ForgePanel';
import { FolderStarIcon } from '@phosphor-icons/react';

export function WorkspacePanel({ workspaceId }: { workspaceId: string }) {
  const selectedNodeId = useCollectionsStore((s) => s.selectedNodeId);
  const hasEndpoint = selectedNodeId?.startsWith('ep-');

  return (
    <div className="flex flex-row h-full min-h-0">
      {/* Left: Collections Tree (filtered to this workspace) */}
      <div className="w-1/5 min-w-[200px] max-w-[300px] border-r shrink-0">
        <CollectionsTree workspaceId={workspaceId} />
      </div>

      {/* Right: Forge Content */}
      {hasEndpoint ? (
        <div className="flex-1 min-h-0">
          {/* ponytail: keying by selectedNodeId resets local states like active tab/view switcher when changing endpoints */}
          <ForgePanel key={selectedNodeId || ''} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-muted/5">
          <FolderStarIcon className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-sm">No Request Selected</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Select an endpoint from the collections tree, or create a new one to start building.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
