import { useState } from 'react';
import { MagnifyingGlassIcon, GlobeIcon, PencilSimpleIcon, TreeStructureIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MockDomain, MockRoute } from '../types';
import { useRoutesPanel } from './hooks/use-routes-panel';
import { NewRouteDialog } from './new-route-dialog';
import { RouteEditor } from './route-editor';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500 font-bold',
  POST: 'text-blue-500 font-bold',
  PUT: 'text-yellow-500 font-bold',
  DELETE: 'text-red-500 font-bold',
  PATCH: 'text-orange-500 font-bold',
  OPTIONS: 'text-purple-500 font-bold',
};

interface RoutesProps {
  domains: MockDomain[];
  routes: MockRoute[];
  selectedRouteId: string | null;
  onSelect: (id: string) => void;
  onAdd: (route: Omit<MockRoute, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<MockRoute>) => void;
  onDelete: (id: string) => void;
  onClone?: (route: Omit<MockRoute, 'id'>) => void;
}

export function RoutesPanel({
  domains,
  routes,
  selectedRouteId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: RoutesProps) {
  const { searchQuery, setSearchQuery, filteredRoutes, routesByDomain } = useRoutesPanel(routes, domains);
  // ponytail: all folders open by default
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(() => new Set(Object.keys(routesByDomain)));
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  const toggle = (id: string) =>
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Left: route tree */}
      <div className="flex w-72 shrink-0 flex-col border-r bg-background">
        <div className="flex flex-col gap-2 border-b p-2 bg-muted/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Mock Rules ({filteredRoutes.length})</h3>
            <NewRouteDialog domains={domains} onAdd={onAdd} />
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filter routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7.5 h-7.5 text-xs bg-muted/30 focus-visible:ring-primary focus-visible:ring-1 border-border"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <TreeStructureIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No matching routes</p>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              {Object.entries(routesByDomain).map(([domainId, domainRoutes]) => {
                const domain = domains.find((d) => d.id === domainId);
                const isOpen = expandedDomains.has(domainId);
                return (
                  <div key={domainId} className="flex flex-col">
                    {/* Folder header */}
                    <button
                      onClick={() => toggle(domainId)}
                      className="flex w-full min-w-0 bg-muted  border-b items-center gap-1.5 px-2 py-1.5 transition-colors text-left select-none"
                    >
                      <CaretRightIcon
                        className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                      <GlobeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex-1">
                        {domain ? domain.hostname : 'Fallback Host'}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">{domainRoutes.length}</span>
                    </button>

                    {/* Routes inside folder */}
                    {isOpen && (
                      <div className="flex flex-col">
                        {domainRoutes.map((route) => {
                          const isSelected = selectedRouteId === route.id;

                          return (
                            <div
                              key={route.id}
                              className={`group flex cursor-pointer items-center border-b gap-2 pl-6 pr-3 py-1 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-muted/50' : ''} ${!route.enabled ? 'opacity-40' : ''}`}
                              onClick={() => onSelect(route.id)}
                            >
                              <span className={`text-[10px] mt-0.5 shrink-0 ${METHOD_COLORS[route.method] ?? ''}`}>{route.method}</span>
                              <div className="min-w-0 flex-1 overflow-hidden pl-0.5">
                                <p className="text-[11px] font-medium text-foreground text-elipsis-1">{route.path}</p>
                              </div>
                              <Switch
                                checked={route.enabled}
                                onCheckedChange={(v) => onUpdate(route.id, { enabled: v })}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-0.5 shrink-0 scale-75 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: route detail editor */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedRoute ? (
          <RouteEditor
            key={selectedRoute.id}
            route={selectedRoute}
            domains={domains}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
            <div className="text-center">
              <PencilSimpleIcon className="mx-auto mb-2 h-8 w-8 opacity-30 text-muted-foreground" />
              <p className="text-sm font-medium">Select a mock route ruleset to configure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
