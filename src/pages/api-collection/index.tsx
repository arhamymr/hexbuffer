import React, { useEffect, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { useApiCollection } from './hooks/use-api-collection';
import { StashesSidebar } from './components/stashes-sidebar';
import { ForgePanel } from './components/forge-panel';
import { ContextsDialog } from './components/contexts-dialog';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useApiCollectionStore } from '@/stores/api-collection';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings2,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FolderHeart,
  FilePlus2,
} from 'lucide-react';

export function ApiCollectionPage() {
  const {
    stashes,
    activeStashId,
    setActiveStashId,
    activeEndpointId,
    setActiveEndpointId,
    sendRequest,
    saveActiveEndpoint,
    contexts,
    activeContextId,
    setActiveContextId,
  } = useApiCollection();

  const store = useApiCollectionStore();
  const [contextsDialogOpen, setContextsDialogOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Load all initial data from DB on mount
  useEffect(() => {
    void store.fetchFromDb();
  }, []);

  const handleTabRename = async (id: string, newName: string) => {
    await store.renameStash(id, newName);
  };

  const handleTabAdd = async () => {
    const nextNum = stashes.length + 1;
    const name = `Collection ${nextNum}`;
    await store.createStash(name);
  };


  const handleTabClose = async (id: string) => {
    const stash = stashes.find((s) => s.id === id);
    if (stash && confirm(`Are you sure you want to delete the collection "${stash.name}" and all its API requests?`)) {
      await store.deleteStash(id);
    }
  };

  const handleCreateInitialRequest = async () => {
    if (activeStashId) {
      await store.createEndpoint(activeStashId, 'New Request');
    }
  };

  // Map stashes to PageTabItem format
  const pageTabs = stashes.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="h-full flex flex-col min-h-0 bg-background">
      {stashes.length > 0 ? (
        <TabbedPageLayout
          tabs={pageTabs}
          activeTabId={activeStashId || ''}
          onTabChange={setActiveStashId}
          onTabRename={handleTabRename}
          onTabClose={handleTabClose}
          onTabAdd={handleTabAdd}
          className="flex flex-col h-full min-h-0"
          contentClassName="flex-1 min-h-0 flex flex-row m-0 border-t rounded-none bg-background"
        >
          {stashes.map((stash) => (
            <TabsContent
              key={stash.id}
              value={stash.id}
              className="flex-1 w-full h-full flex flex-row min-h-0 data-[state=inactive]:hidden data-[state=active]:flex"
            >
              {/* Sidebar (expandable/minimizeable) */}
              <div
                className={`border-r bg-muted/5 flex flex-col min-h-0 h-full transition-all duration-200 shrink-0 ${
                  sidebarExpanded ? 'w-64 p-4' : 'w-0 overflow-hidden p-0'
                }`}
              >
                <StashesSidebar />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0 h-full">
                {/* Toolbar Header */}
                <div className="flex items-center justify-between p-3 border-b shrink-0 bg-muted/10">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setSidebarExpanded(!sidebarExpanded)}
                      title={sidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    >
                      {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      The Forge
                    </span>
                  </div>

                  {/* Active Context environment selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground font-semibold">Environment:</span>
                    <Select
                      value={activeContextId || 'no-context'}
                      onValueChange={(val) => setActiveContextId(val === 'no-context' ? null : val)}
                    >
                      <SelectTrigger className="h-8 w-44 font-medium text-xs">
                        <SelectValue placeholder="No Environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-context">No Environment</SelectItem>
                        {contexts.map((ctx) => (
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

                {/* Request Builder workspace panel */}
                {activeEndpointId ? (
                  <div className="flex-1 min-h-0">
                    <ForgePanel onSend={sendRequest} onSave={saveActiveEndpoint} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-muted/5">
                    <FolderHeart className="h-10 w-10 text-muted-foreground/30" />
                    <div className="text-center space-y-1">
                      <h3 className="font-semibold text-sm">No Request Selected</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Select a request from the sidebar, or create a new one to start building.
                      </p>
                    </div>
                    <Button size="sm" onClick={handleCreateInitialRequest}>
                      <Plus className="h-4 w-4 mr-2" /> Add request to collection
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </TabbedPageLayout>
      ) : (
        <div className="h-full flex flex-col items-center justify-center space-y-4">
          <FolderHeart className="h-12 w-12 text-muted-foreground/30" />
          <div className="text-center space-y-1">
            <h2 className="font-semibold text-base">No API Collections</h2>
            <p className="text-xs text-muted-foreground max-w-sm">
              Collections act as workspaces or projects. Create one to organize and test your API endpoints.
            </p>
          </div>
          <Button onClick={handleTabAdd}>
            <Plus className="h-4 w-4 mr-2" /> Create First Collection
          </Button>
        </div>
      )}

      {/* Environments Manager Dialog */}
      <ContextsDialog open={contextsDialogOpen} onOpenChange={setContextsDialogOpen} />
    </div>
  );
}

export default ApiCollectionPage;
export { ApiCollectionPage as RepeaterPage };
