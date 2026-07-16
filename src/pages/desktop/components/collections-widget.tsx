import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  CaretRightIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';
import { useCollectionsStore, type StashRecord, type StashEndpointRecord } from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';
import { getMethodColor } from '@/lib/method-colors';
import { cn } from '@/lib/utils';
import folderIcon from '@/assets/explorer-icon/_folder.svg';
import folderOpenIcon from '@/assets/explorer-icon/_folder_open.svg';
import folderComponentIcon from '@/assets/explorer-icon/folder_component.svg';
import folderComponentOpenIcon from '@/assets/explorer-icon/folder_component_open.svg';

// ── Helpers ──

/** Count endpoints belonging to a stash (recursively). */
function countEndpoints(
  stashId: string,
  stashes: StashRecord[],
  endpoints: StashEndpointRecord[],
): number {
  let count = endpoints.filter((ep) => ep.stashId === stashId).length;
  const children = stashes.filter((s) => s.parentId === stashId);
  for (const child of children) {
    count += countEndpoints(child.id, stashes, endpoints);
  }
  return count;
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

  const findWorkspaceId = React.useCallback((parentId: string): string => {
    const parentStash = stashes.find((s) => s.id === parentId);
    if (parentStash && parentStash.parentId) {
      return findWorkspaceId(parentStash.parentId);
    }
    return parentId; // this is the workspaceId
  }, [stashes]);

  const handleCollectionClick = (stash: StashRecord) => {
    // ponytail: ensure workspace is active before opening collection
    if (stash.parentId) {
      setActiveWorkspaceId(findWorkspaceId(stash.parentId));
    }
    setSelectedNodeId(`stash-${stash.id}`);
    setMode('craft');
    navigate('/repeater');
  };

  const handleEndpointClick = (ep: StashEndpointRecord, stash: StashRecord) => {
    // ponytail: ensure workspace is active before opening endpoint
    if (stash.parentId) {
      setActiveWorkspaceId(findWorkspaceId(stash.parentId));
    }
    setSelectedNodeId(`ep-${ep.id}`);
    setActiveEndpointId(ep.id);
    setMode('repeater');
    navigate('/repeater');
  };

  return (
    <div className="p-3 rounded-md border bg-muted/60 backdrop-blur-md flex flex-col gap-3 transition-shadow duration-200 hover:shadow-md max-h-[200px] overflow-y-auto scrollbar-thin">
      <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
        API Collections
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
                    {/* ponytail: use workspace folder icon */}
                    <img
                      src={wsExpanded ? folderComponentOpenIcon : folderComponentIcon}
                      alt="workspace"
                      className="size-3.5 shrink-0"
                    />
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
                  <div className="flex flex-col gap-0.5">
                    {wsStashes.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60 italic py-0.5 pl-6">
                        No collections
                      </span>
                    ) : (
                      wsStashes.map((stash) => {
                        const renderStash = (s: StashRecord, depth: number) => {
                          const stashExpanded = expandedNodes.has(`stash-${s.id}`);
                          const epCount = countEndpoints(s.id, stashes, endpoints);
                          const childStashes = stashes
                            .filter((child) => child.parentId === s.id)
                            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
                          const stashEndpoints = endpoints
                            .filter((ep) => ep.stashId === s.id)
                            .sort((a, b) => a.sortOrder - b.sortOrder);

                          return (
                            <div key={s.id} className="flex ml-5 flex-col gap-0.5" style={{ paddingLeft: depth > 0 ? '8px' : '0px' }}>
                              {/* Collection Row */}
                              <div className="w-full flex items-center gap-1 group rounded-sm hover:bg-muted/40 transition-colors px-1 py-0.5">

                                {/* Icon + Name */}
                                <div
                                  onClick={() => toggleExpand(`stash-${s.id}`)}
                                  className="flex-1 min-w-0 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {/* ponytail: use custom SVG folder icon */}
                                  <img
                                    src={stashExpanded ? folderOpenIcon : folderIcon}
                                    alt="folder"
                                    className="size-3.5 shrink-0"
                                  />
                                  <span className="text-[11px] font-medium truncate text-muted-foreground hover:text-foreground transition-colors">
                                    {s.name}
                                  </span>
                                  {epCount > 0 && (
                                    <span className="text-[9px] text-muted-foreground/50 tabular-nums shrink-0">
                                      ({epCount})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Endpoints & Subfolders */}
                              {stashExpanded && (
                                <div className="flex ml-1 flex-col gap-0.5">
                                  {/* Subfolders */}
                                  {childStashes.map((child) => renderStash(child, depth + 1))}

                                  {/* Endpoints list */}
                                  {stashEndpoints.map((ep) => (
                                    <div
                                      key={ep.id}
                                      onClick={() => handleEndpointClick(ep, s)}
                                      className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-muted/40 text-left group pl-5"
                                    >
                                      {ep.method && (
                                        <span className={cn('text-[9px] font-bold font-mono uppercase shrink-0', getMethodColor(ep.method))}>
                                          {ep.method}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">
                                        {ep.name || ep.url || 'Untitled Request'}
                                      </span>
                                      <ArrowRightIcon className="size-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                  ))}

                                  {childStashes.length === 0 && stashEndpoints.length === 0 && (
                                    <span className="text-[10px] text-muted-foreground/50 italic py-0.5 pl-6">
                                      No contents
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        };

                        return renderStash(stash, 0);
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


