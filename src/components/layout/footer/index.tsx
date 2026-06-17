import * as React from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getEffectiveProxyPort, useAppStore } from '@/stores/app';
import { useLicenseStore } from '@/stores/license';
import { LicenseModal } from '../../license-modal';
import { useTheme } from '../../theme-provider';
import { Button } from '../../ui/button';
import { useUpdater } from '@/hooks/use-updater';
import { ManualUpdateCommand } from '@/pages/settings/components/manual-update-command';
import pkg from '../../../../package.json';
import { proxyStatusLabel, formatBytes } from './utils';
import { ProxyStatusIndicator } from './proxy-status';
import { FooterActions } from './footer-actions';
import { UpdateDialog } from './update-dialog';

interface AppFooterProps {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
}

export function AppFooter({ isTerminalOpen, onToggleTerminal }: AppFooterProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false);
  const [updateDialogVersion, setUpdateDialogVersion] = React.useState<string | null>(null);
  const [updateConfirmReady, setUpdateConfirmReady] = React.useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = React.useState(false);

  const licenseStatus = useLicenseStore((state) => state.status);
  const verifyOnStartup = useLicenseStore((state) => state.verifyOnStartup);
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

  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
  const isDefaultPortChanged = proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const proxyTitle = isDefaultPortChanged
    ? `Proxy connected on ${activeProxyPort}. Restart to use configured port ${proxyDefaultPort}.`
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
    if (!open) {
      setUpdateConfirmReady(false);
    }
  }, [updateInProgress]);

  const handleOpenUpdateDialog = React.useCallback(() => {
    setUpdateDialogVersion(updateVersion);
    setUpdateConfirmReady(false);
    setUpdateDialogOpen(true);
  }, [updateVersion]);

  const handleInstallUpdate = React.useCallback(async () => {
    if (!updateConfirmReady) {
      return;
    }

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
  }, [displayedUpdateVersion, downloadError, installUpdate, updateConfirmReady, updateVersion]);

  React.useEffect(() => {
    if (!updateDialogOpen || updateInProgress || updateSucceeded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setUpdateConfirmReady(true);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [updateDialogOpen, updateInProgress, updateSucceeded]);

  React.useEffect(() => {
    void verifyOnStartup();
  }, [verifyOnStartup]);

  React.useEffect(() => {
    checkProxyStatus();

    const interval = window.setInterval(() => {
      checkProxyStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  return (
    <>
      <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground bg-background">
        <div className="flex items-center gap-4">
          <span>© 0xbuffer v{pkg.version}</span>
          <ProxyStatusIndicator
            proxyStatus={proxyStatus}
            activeProxyPort={activeProxyPort}
            isDefaultPortChanged={isDefaultPortChanged}
            proxyTitle={proxyTitle}
          />
        </div>
        <div className='flex gap-2 items-center'>
          <FooterActions
            theme={theme}
            toggleTheme={toggleTheme}
            isTerminalOpen={isTerminalOpen}
            onToggleTerminal={onToggleTerminal}
            updateAvailable={updateAvailable}
            updateInstalled={updateInstalled}
            updateVersion={updateVersion}
            downloading={downloading}
            onOpenUpdateDialog={handleOpenUpdateDialog}
          />
          <Button
            variant="outline"
            size="xs"
            className="h-6 px-2 text-xs"
            onClick={() => setLicenseModalOpen(true)}
            title={licenseStatus === 'lifetime' ? 'License active' : 'Free evaluation — click to activate license'}
          >
            {licenseStatus === 'lifetime' ? (
              <>
                <CheckCircle2 className="mr-1 size-3 text-green-600 dark:text-green-400" />
                Lifetime
              </>
            ) : (
              <>
                Free Evaluation
              </>
            )}
          </Button>

        </div>
      </footer>
      <UpdateDialog
        open={updateDialogOpen}
        onOpenChange={handleUpdateDialogOpenChange}
        displayedVersion={displayedUpdateVersion}
        updateInProgress={updateInProgress}
        updateFailed={updateFailed}
        updateSucceeded={updateSucceeded}
        updateConfirmReady={updateConfirmReady}
        downloadProgress={downloadProgress}
        downloadError={downloadError}
        progressValue={progressValue}
        progressLabel={progressLabel}
        totalProgressLabel={totalProgressLabel}
        onInstall={handleInstallUpdate}
      />
      <LicenseModal open={licenseModalOpen} onOpenChange={setLicenseModalOpen} />

    </>
  );
}
