import { InterceptQueuePanel } from './components/intercept-queue-panel';
import { InterceptRequestPanel } from './components/intercept-request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';

export function InterceptPage() {
  const {
    status,
    requests,
    selectedRequestId,
    rawRequest,
    isBusy,
    isRefreshing,
    setSelectedRequestId,
    setRawRequest,
    refresh,
    toggleIntercept,
    forwardSelectedRequest,
    dropSelectedRequest,
  } = useInterceptPage();

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border bg-background">
      <div className="bg-muted grid min-h-0 flex-1 grid-cols-2 gap-0">
        <div className="min-h-0 border-r">
          <InterceptRequestPanel
            status={status}
            rawRequest={rawRequest}
            hasSelection={Boolean(selectedRequestId)}
            onRawRequestChange={setRawRequest}
            onToggleIntercept={toggleIntercept}
          />
        </div>
        <div className="min-h-0">
          <InterceptQueuePanel
            status={status}
            requests={requests}
            selectedRequestId={selectedRequestId}
            isBusy={isBusy}
            isRefreshing={isRefreshing}
            onSelectRequest={setSelectedRequestId}
            onForward={forwardSelectedRequest}
            onDrop={dropSelectedRequest}
            onRefresh={refresh}
          />
        </div>
      </div>
    </div>
  );
}
