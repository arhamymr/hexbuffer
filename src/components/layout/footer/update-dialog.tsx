import { AlertTriangle, ArrowUp, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { ManualUpdateCommand } from '@/pages/settings/components/manual-update-command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Progress } from '../../ui/progress';
import { Button } from '../../ui/button';
import type { useUpdater } from '@/hooks/use-updater';

type UpdaterState = ReturnType<typeof useUpdater>;

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayedVersion: string | null;
  updateInProgress: boolean;
  updateFailed: boolean;
  updateSucceeded: boolean;
  updateConfirmReady: boolean;
  downloadProgress: UpdaterState['downloadProgress'];
  downloadError: string;
  progressValue: number;
  progressLabel: string;
  totalProgressLabel: string;
  onInstall: () => Promise<void>;
}

export function UpdateDialog({
  open,
  onOpenChange,
  displayedVersion,
  updateInProgress,
  updateFailed,
  updateSucceeded,
  updateConfirmReady,
  downloadProgress,
  downloadError,
  progressValue,
  progressLabel,
  totalProgressLabel,
  onInstall,
}: UpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!updateInProgress}
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {updateSucceeded
              ? 'Update installed'
              : updateFailed
                ? 'Update failed'
                : updateInProgress
                  ? 'Updating 0xbuffer'
                  : 'Install app update?'}
          </DialogTitle>
          <DialogDescription>
            {updateSucceeded
              ? 'The update was installed successfully. 0xbuffer is restarting to finish applying it.'
              : updateFailed
                ? 'The automatic update could not be installed. You can try again or run the manual update command.'
                : updateInProgress
                  ? 'Keep 0xbuffer open while the update downloads and installs.'
                  : `Version ${displayedVersion ? `v${displayedVersion}` : 'the latest version'} is ready to download. 0xbuffer will install it and restart after you confirm.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!updateInProgress && !updateSucceeded && !updateFailed && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Downloading starts only after you confirm. Any active proxy work should be paused before the app restarts.
            </div>
          )}

          {(updateInProgress || updateSucceeded) && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {updateSucceeded ? (
                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                ) : downloadProgress.phase === 'installing' ? (
                  <RefreshCw className="size-4 animate-spin text-primary" />
                ) : (
                  <Loader2 className="size-4 animate-spin text-primary" />
                )}
                <span>{downloadProgress.message || (updateSucceeded ? 'Restarting app...' : 'Preparing update...')}</span>
              </div>
              {downloadProgress.percent !== null ? (
                <Progress value={progressValue} />
              ) : (
                <div className="h-2 overflow-hidden rounded-full bg-primary/20">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalProgressLabel}</span>
                {downloadProgress.percent !== null && <span>{progressLabel}</span>}
              </div>
            </div>
          )}

          {updateFailed && (
            <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-muted-foreground">
                  {(downloadError || downloadProgress.message).toLowerCase().includes('signature')
                    ? 'The release signature does not match the updater public key.'
                    : downloadError || downloadProgress.message || 'The automatic update failed.'}
                </p>
              </div>
              <ManualUpdateCommand
                className="bg-background/70 p-2"
                message="Copy this command and run it manually in your terminal to update."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {!updateSucceeded && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateInProgress}
            >
              {updateFailed ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!updateSucceeded && (
            <Button onClick={onInstall} disabled={updateInProgress || !updateConfirmReady}>
              {updateInProgress ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
              {updateInProgress ? 'Updating...' : updateFailed ? 'Try Again' : 'Download and Install'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
