import { CollaboratorInteractions } from './interactions-panel';
import { CollaboratorMetrics } from './metrics';
import { CollaboratorPayloads } from './payloads-panel';
import { CollaboratorSettings } from './settings-panel';
import type { useCollaboratorPage } from '../hooks/use-collaborator-page';

interface CollaboratorContentProps {
  page: ReturnType<typeof useCollaboratorPage>;
}

export function CollaboratorContent({ page }: CollaboratorContentProps) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      {page.activeSubTab === 'payloads' && (
        <CollaboratorPayloads
          payloads={page.payloads}
          servers={page.servers}
          onCreatePayload={page.handleCreatePayload}
          onDeletePayload={page.handleDeletePayload}
          onArchivePayload={page.handleArchivePayload}
        />
      )}
      {page.activeSubTab === 'interactions' && (
        <div className="flex h-full min-h-0 flex-col">
          <CollaboratorMetrics stats={page.stats} />
          <div className="min-h-0 flex-1">
            <CollaboratorInteractions
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
        <CollaboratorSettings
          servers={page.servers}
          onAddServer={page.handleAddServer}
          onDeleteServer={page.handleDeleteServer}
          onCheckHealth={page.handleCheckHealth}
        />
      )}
    </div>
  );
}
