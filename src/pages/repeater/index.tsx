import { useEffect, useState } from 'react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollectionsStore } from '@/stores/collections';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';
import { RepeaterWsPanel } from './components/RepeaterWsPanel';
import { CollectionsTree } from './components/CollectionsTree';
import { ForgePanel } from './components/ForgePanel';
import { ContextsDialog } from './components/ContextsDialog';
import { useRepeaterPage } from './hooks/use-repeater-page';
import {
  Settings2,
  FolderHeart,
} from 'lucide-react';

export function RepeaterPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
    activeTab,
    addEmptyHttpTab,
    updateRawRequest,
    sendRequest,
    updateTab,
    sendCraftRequest,
  } = useRepeaterPage();

  const collectionsStore = useCollectionsStore();
  const mode = collectionsStore.mode;
  const setMode = collectionsStore.setMode;
  const [contextsDialogOpen, setContextsDialogOpen] = useState(false);

  // Hydrate collections from DB on mount
  useEffect(() => {
    void collectionsStore.fetchFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync collections store mode and selection when active tab changes
  useEffect(() => {
    if (!activeTab) return;

    if (activeTab.mode === 'collection' && activeTab.collectionId) {
      collectionsStore.setMode('craft');
      collectionsStore.setSelectedNodeId(`stash-${activeTab.collectionId}`);
    } else {
      collectionsStore.setMode('repeater');
    }
  }, [activeTab?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Craft Mode Content ──

  const renderCraftContent = () => {
    const hasEndpoint = collectionsStore.selectedNodeId?.startsWith('ep-');

    if (!hasEndpoint) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-muted/5">
          <FolderHeart className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-sm">No Request Selected</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Select an endpoint from the collections tree, or create a new one to start building.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col">
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
    );
  };

  // ── Main Layout ──

  if (!activeTab) {
    return null;
  }

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabRename={renameTab}
      onTabClose={closeTab}
      onCloseTabsToLeft={closeTabsToLeft}
      onCloseTabsToRight={closeTabsToRight}
      onTabAdd={() => addEmptyHttpTab()}
      className="flex flex-col h-full min-h-0"
      contentClassName="flex-1 min-h-0"
    >
      <div className="flex flex-row h-full min-h-0">
        {/* Left: Collections Tree — fixed 20% width */}
        <div className="w-1/5 min-w-[200px] max-w-[300px] border-r shrink-0">
          <CollectionsTree />
        </div>

        {/* Right: Content Area — fills remaining 80% */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {mode === 'craft' ? (
            renderCraftContent()
          ) : activeTab.mode === 'websocket' ? (
            <RepeaterWsPanel tab={activeTab} onUpdate={updateTab} />
          ) : (
            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0">
                <RepeaterRequestPanel
                  rawRequest={activeTab.request.raw}
                  isLoading={activeTab.isLoading}
                  onRawRequestChange={updateRawRequest}
                  onSend={sendRequest}
                />
              </div>
              <div className="flex-1 min-w-0 border-l">
                <RepeaterResponsePanel
                  response={activeTab.response}
                  isLoading={activeTab.isLoading}
                  error={activeTab.error}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contexts Dialog */}
      <ContextsDialog open={contextsDialogOpen} onOpenChange={setContextsDialogOpen} />
    </TabbedPageLayout>
  );
}
