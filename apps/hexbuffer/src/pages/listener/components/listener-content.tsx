import { ListenerInteractions } from './interactions-panel';
import { ListenerMetrics } from './metrics';
import { ListenerPayloads } from './payloads-panel';
import { ListenerSettings } from './settings-panel';
import type { useListenerPage } from '../hooks/use-listener-page';

interface ListenerContentProps {
  page: ReturnType<typeof useListenerPage>;
}

export function ListenerContent({ page }: ListenerContentProps) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      {page.activeSubTab === 'payloads' && (
        <ListenerPayloads
          payloads={page.payloads}
          servers={page.servers}
          onCreatePayload={page.handleCreatePayload}
          onDeletePayload={page.handleDeletePayload}
          onArchivePayload={page.handleArchivePayload}
        />
      )}
      {page.activeSubTab === 'interactions' && (
        <div className="flex h-full min-h-0 flex-col">
          <ListenerMetrics stats={page.stats} />
          <div className="min-h-0 flex-1">
            <ListenerInteractions
              interactions={page.interactions}
              payloads={page.payloads}
              selectedPayloadFilter={page.selectedPayloadFilter}
              setSelectedPayloadFilter={page.setSelectedPayloadFilter}
              selectedTypeFilter={page.selectedTypeFilter}
              setSelectedTypeFilter={page.setSelectedTypeFilter}
              selectedInteractionId={page.selectedInteractionId}
              setSelectedInteractionId={page.setSelectedInteractionId}
            />
          </div>
        </div>
      )}
      {page.activeSubTab === 'settings' && (
        <ListenerSettings
          servers={page.servers}
          onAddServer={page.handleAddServer}
          onDeleteServer={page.handleDeleteServer}
          onCheckHealth={page.handleCheckHealth}
        />
      )}
    </div>
  );
}
