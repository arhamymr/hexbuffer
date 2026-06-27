import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollectionsStore } from '@/stores/collections';
import { CollectionsTree } from './components/collection-tree';
import { ForgePanel } from './components/ForgePanel';
import { ContextsDialog } from './components/ContextsDialog';
import { sendCraftRequest as triggerSendCraftRequest } from '@/triggers/repeater/craft';
import { Settings2, FolderHeart } from 'lucide-react';

export function RepeaterPage() {
  const collectionsStore = useCollectionsStore();
  const [contextsDialogOpen, setContextsDialogOpen] = useState(false);

  // Hydrate collections from DB on mount
  useEffect(() => {
    void collectionsStore.fetchFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendCraftRequest = useCallback(async () => {
    await triggerSendCraftRequest();
  }, []);

  const hasEndpoint = collectionsStore.selectedNodeId?.startsWith('ep-');

  return (
    <div className="flex flex-row h-full min-h-0">
      {/* Left: Collections Tree */}
      <div className="w-1/5 min-w-[200px] max-w-[300px] border-r shrink-0">
        <CollectionsTree />
      </div>

      {/* Right: Forge Content */}
      {hasEndpoint ? (
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Craft Toolbar */}
          <div className="flex items-center justify-between p-3 border-b shrink-0 bg-muted/10">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              The Forge
            </span>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground font-semibold">Environment:</span>
              <Select
                value={collectionsStore.activeContextId || 'no-context'}
                onValueChange={(val) =>
                  collectionsStore.setActiveContextId(val === 'no-context' ? null : val)
                }
              >
                <SelectTrigger className="h-8 w-44 font-medium text-xs">
                  <SelectValue placeholder="No Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-context">No Environment</SelectItem>
                  {collectionsStore.contexts.map((ctx) => (
                    <SelectItem key={ctx.id} value={ctx.id}>
                      {ctx.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setContextsDialogOpen(true)}
                title="Manage Environments"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Forge Panel */}
          <div className="flex-1 min-h-0">
            <ForgePanel onSend={sendCraftRequest} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-muted/5">
          <FolderHeart className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-sm">No Request Selected</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Select an endpoint from the collections tree, or create a new one to start building.
            </p>
          </div>
        </div>
      )}

      {/* Contexts Dialog */}
      <ContextsDialog open={contextsDialogOpen} onOpenChange={setContextsDialogOpen} />
    </div>
  );
}
