import { TabsContent } from '@/components/ui/tabs';
import { DomainsPanel } from './domains-panel';
import { RoutesPanel } from './routes-panel';
import { LogsPanel } from './logs-panel';
import type { useMockForgePage } from '../hooks/use-mock-forge-page';

interface MockForgeContentProps {
  page: ReturnType<typeof useMockForgePage>;
}

export function MockForgeContent({ page }: MockForgeContentProps) {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <TabsContent value="domains" className="h-full min-h-0 flex flex-col focus-visible:outline-none data-[state=inactive]:hidden">
        <DomainsPanel
          domains={page.domains}
          routes={page.routes}
          onToggle={page.toggleDomain}
          onDelete={page.deleteDomain}
          selectedDomainId={page.selectedDomainId}
          onSelect={page.setSelectedDomainId}
        />
      </TabsContent>
      <TabsContent value="routes" className="h-full min-h-0 flex flex-col focus-visible:outline-none data-[state=inactive]:hidden">
        <RoutesPanel
          domains={page.domains}
          routes={page.routes}
          selectedRouteId={page.selectedRouteId}
          onSelect={page.setSelectedRouteId}
          onAdd={page.addRoute}
          onUpdate={page.updateRoute}
          onDelete={page.deleteRoute}
        />
      </TabsContent>
      <TabsContent value="logs" className="h-full min-h-0 flex flex-col focus-visible:outline-none data-[state=inactive]:hidden">
        <LogsPanel
          logs={page.logs}
          domains={page.domains}
          routes={page.routes}
          selectedLogId={page.selectedLogId}
          onSelect={page.setSelectedLogId}
        />
      </TabsContent>
    </div>
  );
}

