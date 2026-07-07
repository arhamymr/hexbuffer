import { ArrowLeftIcon, ArrowRightIcon, FlagIcon, PlusIcon, ShieldSlashIcon, ShieldCheckIcon, PaperPlaneTiltIcon, TrashIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
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
import { formatRequestTime } from '../lib';
import { useQueuePanel } from './hooks/use-queue-panel';

export function InterceptQueuePanel() {
  const {
    isEnabled,
    activeTab,
    activeRequests,
    hasSelection,
    isBusy,
    selectedRequestId,
    removingIds,
    setSelectedRequestId,
    getRequestMeta,
    handleForward,
    handleForwardRequest,
    handleInterceptResponse,
    handleDrop,
    handleDontCapture,
    handleAddCaptureHost,
    handleToggleIntercept,
  } = useQueuePanel();

  return (
    <div className="flex h-full flex-col">
      <InterceptBypassPanel />

      {/* Intercept toggle + forward actions */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b shrink-0 bg-muted/30">
        <button
          type="button"
          onClick={() => handleToggleIntercept(!isEnabled)}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
            isEnabled
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          )}
        >
          {isEnabled
            ? <><PauseIcon className="size-4" /> Intercept</>
            : <><PlayIcon className="size-4" /> Off</>}
        </button>
        {activeRequests.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {activeRequests.length} paused req{activeRequests.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2">

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
                const { direction, host, path } = getRequestMeta(request);

                return (
                  <ContextMenu key={request.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedRequestId(request.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedRequestId(request.id);
                          }
                        }}
                        className={cn(
                          'group relative flex gap-2 p-2 items-start justify-between w-full text-sm hover:bg-muted cursor-pointer transition-colors outline-none focus-visible:bg-muted',
                          isSelected && 'bg-muted',
                          isRemoving && 'pointer-events-none animate-slide-out-right'
                        )}
                        title={`${host}${path}`}
                      >
                        <div className='flex gap-2 min-w-0 flex-1'>
                          <span
                            className="mt-0.5 inline-flex size-8 bg-background items-center justify-center rounded border font-mono text-[11px] text-muted-foreground shrink-0"
                            title={direction === 'response' ? 'Response' : 'Request'}
                          >
                            {direction === 'response' ? <ArrowLeftIcon className='size-4' /> : <ArrowRightIcon className='size-4' />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className='flex flex-col items-start gap-1'>
                              <div className='mb-1 flex gap-2 w-full'>
                                {direction === 'response' ? (
                                  <span className="inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold shrink-0">
                                    {request.response?.status_code ?? 'RES'}
                                  </span>
                                ) : (
                                  <MethodBadge method={request.request.method} className="shrink-0" />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium">{host}</span>
                                </span>
                              </div>

                              <span className="block truncate font-mono text-xs text-muted-foreground w-full">
                                {path}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="relative flex flex-col items-end gap-1.5 self-stretch shrink-0 justify-center min-w-[160px]">
                          {/* Normal state: time */}
                          <span className="pt-1 text-[11px] text-muted-foreground group-hover:opacity-0 transition-opacity duration-150">
                            {formatRequestTime(request.timestamp)}
                          </span>

                          {/* Hover state: actions */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 flex items-center gap-1.5">
                            {direction === 'request' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInterceptResponse(request);
                                }}
                                className="flex h-6 items-center gap-1 rounded border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-sm px-2 text-[11px] font-medium"
                                title="Intercept Response"
                              >
                                <PauseIcon className="size-4" />
                                Intercept
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForwardRequest(request);
                              }}
                              className="flex h-6 items-center gap-1 rounded bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
                              title="Forward"
                            >
                              <PaperPlaneTiltIcon className="size-3 text-primary-foreground" />
                              Forward
                            </button>
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <ContextMenuItem
                        onClick={() => handleAddCaptureHost(host)}
                        className='text-xs'
                      >
                        <PlusIcon className="size-3.5" />
                        Capture this host
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      {direction === 'request' && (
                        <>
                          <ContextMenuItem
                            onClick={() => handleInterceptResponse(request)}
                            className='text-xs'
                          >
                            <FlagIcon className="size-3.5" />
                            Intercept response
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                        </>
                      )}
                      <ContextMenuItem
                        onClick={() => handleDrop(request)}
                        variant="destructive"
                        className='text-xs'
                      >
                        <TrashIcon className="size-3.5" />
                        Drop
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleDontCapture(request)}
                        className='text-xs'
                      >
                        <ShieldSlashIcon className="size-3.5" />
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
