import { Button } from '@/components/ui/button';
import { useCollectionsStore } from '@/stores/collections';
import { CollectionsTree } from './collection-tree';
import { ForgePanel } from './ForgePanel';
import { FolderStarIcon, PaperPlaneTiltIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { sendCraftRequest, saveActiveEndpoint } from '@/triggers/repeater/craft';

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
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Craft Toolbar */}
          <div className="flex items-center justify-between px-1 border-b shrink-0 bg-muted/10">
            <div className="flex items-center gap-2">
              {/* Send + Save */}
              <Button
                size="sm"
                className="h-7 text-xs transition-transform active:scale-95"
                onClick={() => { void sendCraftRequest(); }}
              >
                <PaperPlaneTiltIcon className="size-3" /> Send
              </Button>
              {hasEndpoint && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs transition-transform active:scale-95"
                  onClick={() => { void saveActiveEndpoint(); }}
                >
                  <FloppyDiskIcon className="size-3" /> Save
                </Button>
              )}
            </div>
          </div>

          {/* Forge Panel */}
          <div className="flex-1 min-h-0">
            <ForgePanel />
          </div>
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
