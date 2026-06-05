import * as React from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { relaunch } from '@tauri-apps/plugin-process';
import { AlertTriangle, ArrowUp, Asterisk, CheckCircle2, Loader2, MessageSquare, Moon, RefreshCw, Settings, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/app';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUpdater } from '@/hooks/use-updater';
import { ManualUpdateCommand } from '@/pages/settings/components/manual-update-command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Progress } from './ui/progress';
import pkg from '../../package.json';

const proxyStatusLabel = {
  connected: 'Connected',
  starting: 'Starting',
  stopping: 'Stopping',
  disconnected: 'Disconnected',
} as const;

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return '0 MB';
  }

  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1) {
    return `${Math.max(1, Math.round(megabytes * 1024))} KB`;
  }

  return `${megabytes.toFixed(1)} MB`;
}

interface AppFooterProps {
  isAssistantOpen: boolean;
  onToggleAssistant: () => void;
}

export function AppFooter({ isAssistantOpen, onToggleAssistant }: AppFooterProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false);
  const [updateDialogVersion, setUpdateDialogVersion] = React.useState<string | null>(null);
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);
  const { theme, toggleTheme } = useTheme();
  const {
    updateAvailable,
    updateVersion,
    downloading,
    downloadProgress,
    downloadError,
    updateInstalled,
    installUpdate,
  } = useUpdater();
  const activeProxyPort = proxyPort ?? proxyDefaultPort;
  const isDefaultPortChanged = proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const proxyTitle = isDefaultPortChanged
    ? `Proxy connected on ${activeProxyPort}. Restart to use default port ${proxyDefaultPort}.`
    : `Proxy ${proxyStatusLabel[proxyStatus].toLowerCase()}`;
  const displayedUpdateVersion = updateDialogVersion ?? updateVersion;
  const updateInProgress = downloading || downloadProgress.phase === 'installing';
  const updateFailed = downloadProgress.phase === 'failed';
  const updateSucceeded = updateInstalled || downloadProgress.phase === 'installed';
  const progressValue = downloadProgress.percent ?? 0;
  const progressLabel = downloadProgress.percent !== null
    ? `${downloadProgress.percent}%`
    : downloadProgress.downloadedBytes > 0
      ? `Downloaded ${formatBytes(downloadProgress.downloadedBytes)}`
      : 'Preparing download...';
  const totalProgressLabel = downloadProgress.totalBytes
    ? `${formatBytes(downloadProgress.downloadedBytes)} of ${formatBytes(downloadProgress.totalBytes)}`
    : progressLabel;

  const handleUpdateDialogOpenChange = React.useCallback((open: boolean) => {
    if (updateInProgress) {
      return;
    }

    setUpdateDialogOpen(open);
  }, [updateInProgress]);

  const handleOpenUpdateDialog = React.useCallback(() => {
    setUpdateDialogVersion(updateVersion);
    setUpdateDialogOpen(true);
  }, [updateVersion]);

  const handleInstallUpdate = React.useCallback(async () => {
    const targetVersion = displayedUpdateVersion ?? updateVersion;
    const toastId = toast.loading(`Installing v${targetVersion}...`);
    const result = await installUpdate();

    if (result.ok) {
      toast.success(`Updated to v${targetVersion}`, {
        id: toastId,
        description: 'Restarting app to finish applying the update.',
      });

      window.setTimeout(() => {
        void relaunch();
      }, 1500);
      return;
    }

    const errorMessage = result.error || downloadError || 'The automatic update failed.';

    toast.error('Update failed', {
      id: toastId,
      description: (
        <div className="space-y-2">
          <p>
            {errorMessage.toLowerCase().includes('signature')
              ? 'The release signature does not match the updater public key.'
              : errorMessage}
          </p>
          <ManualUpdateCommand
            className="bg-background/70 p-2"
            message="Copy this command and run it manually in your terminal to update."
          />
        </div>
      ),
    });
  }, [displayedUpdateVersion, downloadError, installUpdate, updateVersion]);

  React.useEffect(() => {
    checkProxyStatus();

    const interval = window.setInterval(() => {
      checkProxyStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  return (
    <>
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>© 0xbuffer v{pkg.version}</span>
        <div className="flex items-center gap-2" title={proxyTitle}>
          <span
            className={`h-2 w-2 rounded-full ${
              proxyStatus === 'connected'
                ? 'bg-green-500 animate-pulse'
                : proxyStatus === 'starting' || proxyStatus === 'stopping'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-muted-foreground/50'
            }`}
          />
          <span className='flex items-center'>
            Proxy: {proxyStatusLabel[proxyStatus]} | <Asterisk className='size-3' />:{activeProxyPort}
            {isDefaultPortChanged ? ' (default port changed)' : ''}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="h-8 w-8 p-0"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className={cn('h-8 w-8 p-0', isAssistantOpen && 'bg-muted text-foreground')}
          onClick={onToggleAssistant}
          title={isAssistantOpen ? 'Hide Chat' : 'Show Chat'}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        {updateAvailable && !updateInstalled && (
          <Button
            variant="ghost"
            size="xs"
            className="h-8 px-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            title={`Update to v${updateVersion}`}
            onClick={handleOpenUpdateDialog}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="mr-1.5 h-4 w-4" />
            )}
            {downloading ? 'Updating...' : `Update v${updateVersion}`}
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="h-8 w-8 p-0"
          title="Settings"
          onClick={async () => {
            try {
              const existing = await WebviewWindow.getByLabel('settings');
              if (existing) {
                await existing.setFocus();
                return;
              }
              new WebviewWindow('settings', {
                url: '/?window=settings',
                title: '0xbuffer - Settings',
                width: 700,
                height: 600,
                decorations: true,
                resizable: true,
              });
            } catch {
              window.open('/settings', '_blank');
            }
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </footer>
    <Dialog open={updateDialogOpen} onOpenChange={handleUpdateDialogOpenChange}>
      <DialogContent showCloseButton={!updateInProgress} className="sm:max-w-md">
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
                  : `Version ${displayedUpdateVersion ? `v${displayedUpdateVersion}` : 'the latest version'} is ready to download. 0xbuffer will install it and restart after you confirm.`}
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
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updateInProgress}
            >
              {updateFailed ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!updateSucceeded && (
            <Button onClick={handleInstallUpdate} disabled={updateInProgress}>
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
    </>
  );
}
