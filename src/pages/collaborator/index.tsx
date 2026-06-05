import { useCollaboratorPage } from './hooks/use-collaborator-page';
import { CollaboratorContent } from './components/collaborator-content';
import { CollaboratorTabBar } from './components/collaborator-tab-bar';
import { InteractionDetailDrawer } from './components/interaction-detail-drawer';

export function CollaboratorPage() {
  const page = useCollaboratorPage();

  return (
    <>
     <CollaboratorTabBar
          activeSubTab={page.activeSubTab}
          isPolling={page.isPolling}
          onTabChange={page.setActiveSubTab}
        />

       
         <div className="flex h-full min-h-0 flex-col p-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <CollaboratorContent page={page} />
      </div>

      <InteractionDetailDrawer
        interaction={page.selectedInteraction}
        open={page.selectedInteractionId !== null}
        onClose={() => page.setSelectedInteractionId(null)}
      />
    </div>
    </>
   
  );
}
