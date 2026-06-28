import { ArrowLeftIcon, ArrowRightIcon, FlagIcon, PauseCircleIcon, PlayIcon, PlusIcon, ShieldSlashIcon, TrashIcon } from '@phosphor-icons/react';
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
    selectedRequestId,
    removingIds,
    setSelectedRequestId,
    getRequestMeta,
    handleInterceptResponse,
    handleDrop,
    handleDontCapture,
    handleAddCaptureHost,
  } = useQueuePanel();

  return (
    <div className="flex h-full flex-col">
      <InterceptBypassPanel />

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="rounded-md border bg-background p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PauseCircleIcon className="h-3.5 w-3.5" />
              Paused
            </div>
            <div className="mt-1 text-sm font-semibold">{activeRequests.length}</div>
            <div className="text-[11px] text-muted-foreground">{activeRequests.length} in tab</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PlayIcon className="h-3.5 w-3.5" />
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
                const { direction, host, path } = getRequestMeta(request);

                return (
                  <ContextMenu key={request.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className={cn(
                          'flex gap-2 p-2 items-start justify-between w-full text-sm hover:bg-muted cursor-pointer',
                          isSelected && 'bg-muted',
                          isRemoving && 'pointer-events-none animate-slide-out-right'
                        )}
                        title={`${host}${path}`}
                      >
                        <div className='flex gap-2'>
                        <span
                          className="mt-0.5 inline-flex size-8 bg-background items-center justify-center rounded border font-mono text-[11px] text-muted-foreground"
                          title={direction === 'response' ? 'Response' : 'Request'}
                        >
                          {direction === 'response' ? <ArrowLeftIcon className='size-4' /> : <ArrowRightIcon className='size-4' />}
                        </span>
                        <div>
                          <div className='flex flex-col items-start gap-1'>
                            <div className='mb-1 flex gap-2'>
                              {direction === 'response' ? (
                                <span className="inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold">
                                  {request.response?.status_code ?? 'RES'}
                                </span>
                              ) : (
                                <MethodBadge method={request.request.method} />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-medium">{host}</span>
                              </span>
                            </div>

                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {path}
                            </span>
                          </div>


                        </div>
                        </div>
                        <span className="pt-1 text-[11px] text-muted-foreground">
                          {formatRequestTime(request.timestamp)}
                        </span>
                      </button>
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
