'use client';

import { Flag, Loader2, PauseCircle, Play, Plus, ShieldOff, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MethodBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { InterceptBypassPanel } from './bypass-panel';
import { formatRequestTime, getPausedDirection, getRequestHost, getRequestPath } from '../lib';
import { useInterceptStore } from '../state/intercept-store';

export function InterceptQueuePanel() {
  const status = useInterceptStore((state) => state.status);
  const requests = useInterceptStore((state) => state.requests);
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const selectedRequestId = useInterceptStore((state) => state.selectedRequestId);
  const isBusy = useInterceptStore((state) => state.isBusy);
  const isRefreshing = useInterceptStore((state) => state.isRefreshing);
  const setSelectedRequestId = useInterceptStore((state) => state.setSelectedRequestId);
  const forwardSelectedRequest = useInterceptStore((state) => state.forwardSelectedRequest);
  const forwardRequestAndInterceptResponse = useInterceptStore(
    (state) => state.forwardRequestAndInterceptResponse
  );
  const dropRequest = useInterceptStore((state) => state.dropRequest);
  const refresh = useInterceptStore((state) => state.refresh);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHostAndForward = useInterceptStore((state) => state.removeCaptureHostAndForward);
  const isEnabled = status?.mode === 'Enabled';
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeRequests = requests.filter((request) => request.tab_id === activeTabId);
  const hasSelection = activeRequests.some((request) => request.id === selectedRequestId);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted flex h-10 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Intercept Queue</span>
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
            <div className="mt-1 text-sm font-semibold">{requests.length}</div>
            <div className="text-[11px] text-muted-foreground">{activeRequests.length} in tab</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Play className="h-3.5 w-3.5" />
              Mode
            </div>
            <div className="mt-1 truncate text-sm font-medium">
              {isEnabled && activeTab?.captureHosts.length ? 'Capture' : 'Pass through'}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-background">
          {activeRequests.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {isEnabled && activeTab?.captureHosts.length
                ? 'Waiting for matching hosts in this tab...'
                : 'Add a capture host to this tab to pause live requests.'}
            </div>
          ) : (
            <div className="divide-y">
              {activeRequests.map((request) => {
                const isSelected = request.id === selectedRequestId;
                const isRemoving = removingIds.has(request.id);
                const direction = getPausedDirection(request);
                const host = getRequestHost(request);
                const path = getRequestPath(request);

                return (
                  <ContextMenu key={request.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className={cn(
                          'grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60',
                          isSelected && 'bg-muted',
                          isRemoving && 'pointer-events-none animate-slide-out-right'
                        )}
                        title={`${host}${path}`}
                      >
                        <span
                          className="mt-0.5 inline-flex h-5 w-6 items-center justify-center rounded border font-mono text-[11px] text-muted-foreground"
                          title={direction === 'response' ? 'Response' : 'Request'}
                        >
                          {direction === 'response' ? '<-' : '->'}
                        </span>
                        {direction === 'response' ? (
                          <span className="inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold">
                            {request.response?.status_code ?? 'RES'}
                          </span>
                        ) : (
                          <MethodBadge method={request.request.method} />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{host}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {path}
                          </span>
                        </span>
                        <span className="pt-1 text-[11px] text-muted-foreground">
                          {formatRequestTime(request.timestamp)}
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <ContextMenuItem
                        onClick={() => addCaptureHost(host)}
                      >
                        <Plus className="h-4 w-4" />
                        Capture this host
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      {direction === 'request' && (
                        <>
                          <ContextMenuItem
                            onClick={() => {
                              forwardRequestAndInterceptResponse(request);
                            }}
                          >
                            <Flag className="h-4 w-4" />
                            Intercept response
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                        </>
                      )}
                      <ContextMenuItem
                        onClick={() => {
                          setRemovingIds((prev) => new Set([...prev, request.id]));
                          dropRequest(request);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Drop
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          setRemovingIds((prev) => new Set([...prev, request.id]));
                          removeCaptureHostAndForward(request);
                        }}
                      >
                        <ShieldOff className="h-4 w-4" />
                        Don't capture this host
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
