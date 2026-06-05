import { useListenerPage } from './hooks/use-listener-page';
import { ListenerContent } from './components/listener-content';
import { ListenerTabBar } from './components/listener-tab-bar';
import { InteractionDetailDrawer } from './components/interaction-detail-drawer';

export function ListenerPage() {
  const page = useListenerPage();

  return (
    <>
     <ListenerTabBar
          activeSubTab={page.activeSubTab}
          isPolling={page.isPolling}
          onTabChange={page.setActiveSubTab}
        />

       
         <div className="flex h-full min-h-0 flex-col p-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <ListenerContent page={page} />
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
