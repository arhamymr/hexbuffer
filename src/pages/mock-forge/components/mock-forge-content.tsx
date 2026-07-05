import { MockForgeTabBar } from './mock-forge-tab-bar';
import { DomainsPanel } from './domains-panel';
import { RoutesPanel } from './routes-panel';
import { LogsPanel } from './logs-panel';
import type { useMockForgePage } from '../hooks/use-mock-forge-page';

interface MockForgeContentProps {
  page: ReturnType<typeof useMockForgePage>;
}

export function MockForgeContent({ page }: MockForgeContentProps) {
  return (
    <>
      <MockForgeTabBar activeSubTab={page.activeSubTab} onTabChange={page.setActiveSubTab} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {page.activeSubTab === 'domains' && (
          <DomainsPanel
            domains={page.domains}
            onToggle={page.toggleDomain}
            onAdd={page.addDomain}
            onDelete={page.deleteDomain}
            selectedDomainId={page.selectedDomainId}
            onSelect={page.setSelectedDomainId}
          />
        )}
        {page.activeSubTab === 'routes' && (
          <RoutesPanel
            domains={page.domains}
            routes={page.routes}
            selectedRouteId={page.selectedRouteId}
            onSelect={page.setSelectedRouteId}
            onAdd={page.addRoute}
            onUpdate={page.updateRoute}
            onDelete={page.deleteRoute}
          />
        )}
        {page.activeSubTab === 'logs' && (
          <LogsPanel
            logs={page.logs}
            domains={page.domains}
            routes={page.routes}
            selectedLogId={page.selectedLogId}
            onSelect={page.setSelectedLogId}
          />
        )}
      </div>
    </>
  );
}
