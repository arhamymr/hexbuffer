import { useListenerPage } from './hooks/use-listener-page';
import { ListenerHosts } from './components/hosts-panel';
import { ListenerInteractions } from './components/interactions-panel';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import type { ListenerSubTab } from './types';

export function ListenerPage() {
  const page = useListenerPage();

  // ponytail: simplified two tabs layout
  const tabs = [
    {
      id: 'hosts',
      name: 'Hosts',
      closable: false,
    },
    {
      id: 'interactions',
      name: 'Interactions',
      closable: false,
      status: page.isEnabled
        ? page.isPolling
          ? { kind: 'running' as const, label: 'Polling active' }
          : undefined
        : { kind: 'needs-action' as const, label: 'Polling disabled' },
    },
  ];

  return (
    <div className="relative h-full flex flex-col">
      {/* Global Listener Toggle */}
      <div className="absolute right-4 top-[9px] z-20 flex items-center gap-2">
        <span className="text-[10px] font-semibold font-mono tracking-wider text-muted-foreground select-none">
          LISTENER: {page.isEnabled ? 'ACTIVE' : 'DISABLED'}
        </span>
        <Switch
          checked={page.isEnabled}
          onCheckedChange={page.setIsEnabled}
          aria-label="Toggle listener active state"
          className="h-4 w-7 data-[state=checked]:bg-green-500 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
        />
      </div>

      <TabbedPageLayout
        tabs={tabs}
        activeTabId={page.activeSubTab}
        onTabChange={(tabId) => page.setActiveSubTab(tabId as ListenerSubTab)}
      >
        <TabsContent value="hosts" className="h-full min-h-0 flex flex-col">
          <ListenerHosts
            servers={page.servers}
            payloads={page.payloads}
            onAddServer={page.handleAddServer}
            onUpdateServer={page.handleUpdateServer}
            onDeleteServer={page.handleDeleteServer}
            onCheckHealth={page.handleCheckHealth}
            onCreatePayload={page.handleCreatePayload}
            onDeletePayload={page.handleDeletePayload}
            onArchivePayload={page.handleArchivePayload}
          />
        </TabsContent>

        <TabsContent value="interactions" className="h-full min-h-0 flex flex-col">
          <ListenerInteractions
            servers={page.servers}
            interactions={page.interactions}
            payloads={page.payloads}
            selectedTypeFilter={page.selectedTypeFilter}
            setSelectedTypeFilter={page.setSelectedTypeFilter}
            selectedInteractionId={page.selectedInteractionId}
            setSelectedInteractionId={page.setSelectedInteractionId}
            selectedInteraction={page.selectedInteraction}
            stats={page.stats}
            isEnabled={page.isEnabled}
          />
        </TabsContent>
      </TabbedPageLayout>
    </div>
  );
}
