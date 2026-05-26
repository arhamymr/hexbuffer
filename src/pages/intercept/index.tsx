import { CaInstallDialog } from '@/components/ca-install-dialog';
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
    isCaDialogOpen,
    isInstallingCa,
    isOpeningBrowser,
    isRefreshing,
    installCa,
    setSelectedRequestId,
    setIsCaDialogOpen,
    setRawRequest,
    refresh,
    toggleIntercept,
    openBrowser,
    forwardSelectedRequest,
    dropSelectedRequest,
  } = useInterceptPage();

  return (
    <>
      <CaInstallDialog
        open={isCaDialogOpen}
        installing={isInstallingCa}
        onOpenChange={setIsCaDialogOpen}
        onInstall={installCa}
      />

      <div className="flex h-full min-h-0 overflow-hidden rounded-lg border bg-background">
        <div className="bg-muted grid min-h-0 flex-1 grid-cols-2 gap-0">
          <div className="min-h-0 border-r">
            <InterceptRequestPanel
              status={status}
              rawRequest={rawRequest}
              hasSelection={Boolean(selectedRequestId)}
              isOpeningBrowser={isOpeningBrowser}
              onOpenCaDialog={() => setIsCaDialogOpen(true)}
              onRawRequestChange={setRawRequest}
              onToggleIntercept={toggleIntercept}
              onOpenBrowser={openBrowser}
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
    </>
  );
}
