import {
  AsteriskIcon,
  DatabaseIcon,
  NetworkIcon,
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MAX_PROXY_PORT,
  MIN_PROXY_PORT,
  getEffectiveProxyPort,
  isValidProxyPort,
} from '@/stores/app';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { NavSettingsCard } from './nav-settings-card';
import { ManualUpdateCommand } from './manual-update-command';

interface GeneralSettingsTabProps {
  settings: SettingsPageState;
}

export function GeneralSettingsTab({ settings }: GeneralSettingsTabProps) {
  const {
    currentVersion,
    handleCheckForUpdates,
    handleInstallUpdate,
    updateAvailable,
    updateChecking,
    updateDownloading,
    updateError,
    updateMessage,
    updateVersion,
    proxyDefaultPort,
    proxyFactoryDefaultPort,
    proxyPort,
    proxyPortDraft,
    proxyStatus,
    setProxyPortDraft,
    handleSaveProxyDefaultPort,
    handleResetProxyDefaultPort,
    storageInfo,
    resettingLocalData,
    handleResetLocalData,
  } = settings;
  const parsedProxyPort = Number(proxyPortDraft);
  const proxyPortIsValid = isValidProxyPort(parsedProxyPort);
  const proxyPortIsChanged = proxyPortIsValid && parsedProxyPort !== proxyDefaultPort;
  const proxyRuntimeDiffers =
    proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
  const currentListenerLabel =
    proxyStatus === 'connected' && proxyPort !== null
      ? `127.0.0.1:${proxyPort}`
      : 'Not running';
  const configuredListenerLabel = `127.0.0.1:${proxyDefaultPort}`;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <NetworkIcon className="size-5 text-primary" />
            <CardTitle>Proxy Listener</CardTitle>
          </div>
          <CardDescription>Choose the port used when the proxy starts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="default-proxy-port">Listener port</Label>
            <Input
              id="default-proxy-port"
              type="number"
              min={MIN_PROXY_PORT}
              max={MAX_PROXY_PORT}
              step={1}
              inputMode="numeric"
              value={proxyPortDraft}
              aria-invalid={!proxyPortIsValid}
              onChange={(event) => setProxyPortDraft(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Current listener: <span className="font-medium">{currentListenerLabel}</span>
            </p>
            <p>
              Configured listener: <span className="font-medium">{configuredListenerLabel}</span>
              {proxyRuntimeDiffers
                ? `; running on ${activeProxyPort} because ${proxyDefaultPort} is unavailable or the proxy has not restarted cleanly.`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveProxyDefaultPort}
              disabled={!proxyPortIsChanged && !proxyRuntimeDiffers}
            >
              <FloppyDiskIcon className="mr-2 size-4" />
              FloppyDiskIcon Port
            </Button>
            <Button
              variant="outline"
              onClick={handleResetProxyDefaultPort}
              disabled={proxyDefaultPort === proxyFactoryDefaultPort}
            >
              <ArrowCounterClockwiseIcon className="mr-2 size-4" />
              Reset Port
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          <CardDescription>CheckIcon for and install application updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Current version: <span className="font-medium">{currentVersion || 'Unknown'}</span>
            {updateVersion && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (v{updateVersion} available)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCheckForUpdates}
              disabled={updateChecking || updateDownloading}
            >
              <ArrowClockwiseIcon className={`mr-2 size-4 ${updateChecking ? 'animate-spin' : ''}`} />
              {updateChecking ? 'Checking...' : 'CheckIcon for Updates'}
            </Button>
            {updateAvailable && (
              <Button
                variant="default"
                onClick={handleInstallUpdate}
                disabled={updateDownloading}
              >
                <AsteriskIcon className={`mr-2 size-4 ${updateDownloading ? 'animate-spin' : ''}`} />
                {updateDownloading ? 'Installing...' : `Install v${updateVersion}`}
              </Button>
            )}
          </div>
          {updateMessage && (
            <p className="text-sm text-muted-foreground">{updateMessage}</p>
          )}
          {updateError && (
            <ManualUpdateCommand message="CopyIcon this command and run it manually in your terminal to update." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseIcon className="size-5 text-primary" />
            <CardTitle>Storage</CardTitle>
          </div>
          <CardDescription>Local application data paths</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">DatabaseIcon</p>
            <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {storageInfo?.databasePath ?? 'Loading...'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Browser Automation Artifacts</p>
            <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {storageInfo?.browserArtifactsPath ?? 'Loading...'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Proxy history, documents, and other local records are stored in this database on your device.
          </p>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={resettingLocalData}
                >
                  <TrashIcon className="mr-2 size-4" />
                  {resettingLocalData ? 'Resetting...' : 'Reset'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset local browser data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears browser automation artifacts, resets the managed intercept browser profile,
                    and removes saved hexbuffer CA files. Proxy history and documents stay in the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetLocalData}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <NavSettingsCard />
    </>
  );
}
