import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, ArrowRight } from 'lucide-react';
import { useCollectionsStore, type StashRecord, type StashEndpointRecord } from '@/stores/collections';
import { useRepeaterStore } from '@/stores/repeater';

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
  const { stashes, endpoints, isHydrated, fetchFromDb } = useCollectionsStore();
  const addCollectionTab = useRepeaterStore((s) => s.addCollectionTab);

  // Hydrate on mount
  React.useEffect(() => {
    if (!isHydrated) fetchFromDb();
  }, [isHydrated, fetchFromDb]);

  const rootStashes = React.useMemo(
    () => stashes.filter((s) => !s.parentId),
    [stashes],
  );

  const handleClick = (stash: StashRecord) => {
    addCollectionTab(stash.id, stash.name);
    navigate('/repeater');
  };

  return (
    <div className="p-2 rounded-md border  bg-muted backdrop-blur-md flex flex-col gap-2">
      <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
        Collections
      </span>

      {rootStashes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic px-0.5">
          {isHydrated ? 'No collections yet' : 'Loading…'}
        </p>
      ) : (
        <ul className="flex flex-col gap-px">
          {rootStashes.map((stash) => {
            const epCount = countEndpoints(stash.id, endpoints);
            return (
              <li key={stash.id}>
                <button
                  onClick={() => handleClick(stash)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-sm text-left hover:bg-muted/40 transition-colors group"
                >
                  <FolderHeart className="size-3.5 shrink-0 text-blue-500" />
                  <span className="text-[11px] font-medium truncate flex-1">
                    {stash.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {epCount}
                  </span>
                  <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
