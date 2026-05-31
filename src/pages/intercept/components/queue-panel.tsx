'use client';

import { Loader2, PauseCircle, Play, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { MethodBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { InterceptBypassPanel } from './bypass-panel';
import { formatRequestTime, getRequestHost, getRequestPath } from '../lib';
import { useInterceptStore } from '../state/intercept-store';

export function InterceptQueuePanel() {
  const status = useInterceptStore((state) => state.status);
  const requests = useInterceptStore((state) => state.requests);
  const selectedRequestId = useInterceptStore((state) => state.selectedRequestId);
  const isBusy = useInterceptStore((state) => state.isBusy);
  const isRefreshing = useInterceptStore((state) => state.isRefreshing);
  const setSelectedRequestId = useInterceptStore((state) => state.setSelectedRequestId);
  const forwardSelectedRequest = useInterceptStore((state) => state.forwardSelectedRequest);
  const dropRequest = useInterceptStore((state) => state.dropRequest);
  const refresh = useInterceptStore((state) => state.refresh);
  const bypassHostAndForward = useInterceptStore((state) => state.bypassHostAndForward);
  const isEnabled = status?.mode === 'Enabled';
  const hasSelection = Boolean(selectedRequestId);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted flex h-10 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Request Queue</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" onClick={forwardSelectedRequest} disabled={!hasSelection || isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            FORWARD
          </Button>
          <Button size="xs" variant="ghost" onClick={refresh} disabled={isRefreshing}>
            Refresh
          </Button>
        </div>
      </div>

      <InterceptBypassPanel />

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-background p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PauseCircle className="h-3.5 w-3.5" />
              Paused
            </div>
            <div className="mt-1 text-xl font-semibold">{requests.length}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Play className="h-3.5 w-3.5" />
              Mode
            </div>
            <div className="mt-1 truncate text-sm font-medium">{isEnabled ? 'Capture' : 'Pass through'}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background">
          {requests.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {isEnabled ? 'Waiting for matching requests...' : 'Turn intercept on to pause live requests.'}
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((request) => {
                const isSelected = request.id === selectedRequestId;
                const isRemoving = removingIds.has(request.id);

                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={cn(
                      'grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60',
                      isSelected && 'bg-muted',
                      isRemoving && 'pointer-events-none animate-slide-out-right'
                    )}
                    title={`${getRequestHost(request)}${getRequestPath(request)}`}
                  >
                    <MethodBadge method={request.request.method} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{getRequestHost(request)}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {getRequestPath(request)}
                      </span>
                    </span>
                    <span className="pt-1 text-[11px] text-muted-foreground">
                      {formatRequestTime(request.timestamp)}
                    </span>
                    <span
                      className="inline-flex border items-center cursor-pointer gap-0.5 rounded px-1 text-[12px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemovingIds((prev) => new Set([...prev, request.id]));
                        dropRequest(request);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      DROP
                    </span>
                    <span
                      className="inline-flex items-center border cursor-pointer gap-0.5 rounded px-1 text-[12px] font-medium text-muted-foreground hover:bg-muted-foreground/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemovingIds((prev) => new Set([...prev, request.id]));
                        bypassHostAndForward(request);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      PASS THROUGH
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
