import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderStarIcon,
  ArrowRightIcon,
  CaretRightIcon,
  CaretDownIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { useCollectionsStore, type StashRecord, type StashEndpointRecord } from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';
import { MethodBadge } from '@/components/status-badge';

// ── Helpers ──

/** Count endpoints belonging to a stash. */
function countEndpoints(
  stashId: string,
  endpoints: StashEndpointRecord[],
): number {
  return endpoints.filter((ep) => ep.stashId === stashId).length;
}

// ── Component ──

export function CollectionsWidget() {
  const navigate = useNavigate();
  const {
    stashes,
    endpoints,
    isHydrated,
    fetchFromDb,
    setSelectedNodeId,
    setActiveEndpointId,
    setMode,
  } = useCollectionsStore();
  const workspaces = useRepeaterStore((s) => s.workspaces);
  const activeWorkspaceId = useRepeaterStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useRepeaterStore((s) => s.setActiveWorkspaceId);

  // Hydrate on mount
  React.useEffect(() => {
    if (!isHydrated) fetchFromDb();
  }, [isHydrated, fetchFromDb]);

  // Track expanded state for workspaces and collections
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(() => {
    // Expand the active workspace by default if available
    const initial = new Set<string>();
    if (activeWorkspaceId) {
      initial.add(`ws-${activeWorkspaceId}`);
    }
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleWorkspaceSwitch = (wsId: string) => {
    setActiveWorkspaceId(wsId);
    navigate('/repeater');
  };

  const handleCollectionClick = (stash: StashRecord) => {
    // ponytail: ensure workspace is active before opening collection
    if (stash.parentId) {
      setActiveWorkspaceId(stash.parentId);
    }
    setSelectedNodeId(`stash-${stash.id}`);
    setMode('craft');
    navigate('/repeater');
  };

  const handleEndpointClick = (ep: StashEndpointRecord, stash: StashRecord) => {
    // ponytail: ensure workspace is active before opening endpoint
    if (stash.parentId) {
      setActiveWorkspaceId(stash.parentId);
    }
    setSelectedNodeId(`ep-${ep.id}`);
    setActiveEndpointId(ep.id);
    setMode('repeater');
    navigate('/repeater');
  };

  return (
    <div className="p-2 rounded-md border bg-muted backdrop-blur-md flex flex-col gap-2 max-h-[350px] overflow-y-auto scrollbar-thin">
      <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
        Workspaces & Collections
      </span>

      {workspaces.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-0.5">
          {isHydrated ? 'No workspaces yet' : 'Loading…'}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {workspaces.map((ws) => {
            const wsExpanded = expandedNodes.has(`ws-${ws.id}`);
            const isActive = ws.id === activeWorkspaceId;
            const wsStashes = stashes.filter((s) => s.parentId === ws.id);

            return (
              <div key={ws.id} className="flex flex-col gap-0.5">
                {/* Workspace Row */}
                <div className="w-full flex items-center gap-1 group rounded-sm hover:bg-muted/40 transition-colors px-1 py-0.5">
                  {/* Chevron to expand */}
                  <button
                    onClick={() => toggleExpand(`ws-${ws.id}`)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {wsExpanded ? (
                      <CaretDownIcon className="size-3" />
                    ) : (
                      <CaretRightIcon className="size-3" />
                    )}
                  </button>

                  {/* Icon and Name */}
                  <div
                    onClick={() => toggleExpand(`ws-${ws.id}`)}
                    className="flex-1 min-w-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <SquaresFourIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-semibold truncate">
                      {ws.name}
                    </span>
                    {isActive && (
                      <span className="text-[8px] font-mono font-bold bg-blue-500/10 text-blue-500 px-1 py-px rounded shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Switch Action */}
                  <button
                    onClick={() => handleWorkspaceSwitch(ws.id)}
                    className="text-[10px] font-medium text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 pl-1 hover:underline"
                  >
                    Switch <ArrowRightIcon className="size-2.5" />
                  </button>
                </div>

                {/* Collections list (Indented) */}
                {wsExpanded && (
                  <div className="pl-3.5 flex flex-col gap-0.5 border-l border-border/40 ml-2">
                    {wsStashes.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60 italic py-0.5 pl-4">
                        No collections
                      </span>
                    ) : (
                      wsStashes.map((stash) => {
                        const stashExpanded = expandedNodes.has(`stash-${stash.id}`);
                        const epCount = countEndpoints(stash.id, endpoints);
                        const stashEndpoints = endpoints
                          .filter((ep) => ep.stashId === stash.id)
                          .sort((a, b) => a.sortOrder - b.sortOrder);

                        return (
                          <div key={stash.id} className="flex flex-col gap-0.5">
                            {/* Collection Row */}
                            <div className="w-full flex items-center gap-1 group rounded-sm hover:bg-muted/40 transition-colors px-1 py-0.5">
                              {/* Chevron */}
                              <button
                                onClick={() => toggleExpand(`stash-${stash.id}`)}
                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              >
                                {stashExpanded ? (
                                  <CaretDownIcon className="size-2.5" />
                                ) : (
                                  <CaretRightIcon className="size-2.5" />
                                )}
                              </button>

                              {/* Clickable collection name */}
                              <div
                                onClick={() => handleCollectionClick(stash)}
                                className="flex-1 min-w-0 flex items-center gap-1.5 cursor-pointer"
                              >
                                <FolderStarIcon className="size-3.5 text-blue-500 shrink-0" />
                                <span className="text-[11px] font-medium truncate text-muted-foreground hover:text-foreground transition-colors">
                                  {stash.name}
                                </span>
                                <span className="text-[9px] text-muted-foreground/50 tabular-nums shrink-0">
                                  ({epCount})
                                </span>
                              </div>
                            </div>

                            {/* Endpoints list (Double indented) */}
                            {stashExpanded && (
                              <div className="pl-3 flex flex-col gap-0.5 border-l border-border/40 ml-2.5">
                                {stashEndpoints.length === 0 ? (
                                  <span className="text-[10px] text-muted-foreground/50 italic py-0.5 pl-3">
                                    No endpoints
                                  </span>
                                ) : (
                                  stashEndpoints.map((ep) => (
                                    <div
                                      key={ep.id}
                                      onClick={() => handleEndpointClick(ep, stash)}
                                      className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-muted/40 text-left group"
                                    >
                                      <MethodBadge
                                        method={ep.method}
                                        className="text-[8px] px-1 py-px shrink-0 font-bold scale-90 origin-left"
                                      />
                                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">
                                        {ep.name || ep.url || 'Untitled Request'}
                                      </span>
                                      <ArrowRightIcon className="size-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


