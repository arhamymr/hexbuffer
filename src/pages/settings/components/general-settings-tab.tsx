import {
  AsteriskIcon,
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
import { Input } from '@/components/ui/input';
import {
  MAX_PROXY_PORT,
  MIN_PROXY_PORT,
  getEffectiveProxyPort,
  isValidProxyPort,
} from '@/stores/app';
import type { SettingsPageState } from '../hooks/use-settings-page';
import { ManualUpdateCommand } from './manual-update-command';
import { SettingsGroup, SettingsRow } from './settings-group';

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
    resettingDatabase,
    handleResetDatabase,
    resettingAllAppData,
    handleResetAllAppData,
  } = settings;
  const parsedProxyPort = Number(proxyPortDraft);
  const proxyPortIsValid = isValidProxyPort(parsedProxyPort);
  const proxyPortIsChanged = proxyPortIsValid && parsedProxyPort !== proxyDefaultPort;
  const proxyRuntimeDiffers =
    proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;

  const currentListenerLabel =
    proxyStatus === 'connected' && proxyPort !== null
      ? `127.0.0.1:${proxyPort}`
      : 'Not running';

  return (
    <>
      <SettingsGroup label="Proxy Listener" description="Choose the port used when the proxy starts.">
        <SettingsRow
          label="Listener port"
          description={`Current: ${currentListenerLabel} — Configured: 127.0.0.1:${proxyDefaultPort}${proxyRuntimeDiffers ? ` (running on ${getEffectiveProxyPort({ proxyPort, proxyDefaultPort })})` : ''}`}
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={MIN_PROXY_PORT}
              max={MAX_PROXY_PORT}
              step={1}
              inputMode="numeric"
              value={proxyPortDraft}
              aria-invalid={!proxyPortIsValid}
              onChange={(event) => setProxyPortDraft(event.target.value)}
              className="w-28"
            />
            <Button
              size="xs"
              variant="outline"
              onClick={handleSaveProxyDefaultPort}
              disabled={!proxyPortIsChanged && !proxyRuntimeDiffers}
            >
              <FloppyDiskIcon className="mr-1.5 size-3.5" />
              Save
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={handleResetProxyDefaultPort}
              disabled={proxyDefaultPort === proxyFactoryDefaultPort}
            >
              <ArrowCounterClockwiseIcon className="size-3.5" />
            </Button>
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="Updates" description={`Current version: ${currentVersion || 'Unknown'}${updateVersion ? ` (v${updateVersion} available)` : ''}`}>
        <SettingsRow label="Check for updates">
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={handleCheckForUpdates}
              disabled={updateChecking || updateDownloading}
            >
              <ArrowClockwiseIcon className={`mr-1.5 size-3.5 ${updateChecking ? 'animate-spin' : ''}`} />
              {updateChecking ? 'Checking…' : 'Check'}
            </Button>
            {updateAvailable && (
              <Button
                size="xs"
                onClick={handleInstallUpdate}
                disabled={updateDownloading}
              >
                <AsteriskIcon className={`mr-1.5 size-3.5 ${updateDownloading ? 'animate-spin' : ''}`} />
                {updateDownloading ? 'Installing…' : `Install v${updateVersion}`}
              </Button>
            )}
          </div>
        </SettingsRow>
        {updateMessage && (
          <SettingsRow label="Status">
            <span className="text-xs text-muted-foreground">{updateMessage}</span>
          </SettingsRow>
        )}
        {updateError && (
          <div className="px-4 py-3">
            <ManualUpdateCommand message="Copy this command and run it manually in your terminal to update." />
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup label="Storage" description="Local application data paths.">
        <SettingsRow label="Database" description={storageInfo?.databasePath ?? 'Loading…'} />
        <SettingsRow label="Browser Artifacts" description={storageInfo?.browserArtifactsPath ?? 'Loading…'} />
        
        <SettingsRow label="Reset local data" description="Clears browser automation artifacts, resets the managed intercept browser profile, and removes saved CA files.">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="destructive"
                disabled={resettingLocalData}
              >
                <TrashIcon className="mr-1.5 size-3.5" />
                {resettingLocalData ? 'Resetting…' : 'Reset'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset local browser data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears browser automation artifacts, resets the managed intercept browser profile,
                  and removes saved CA files. Proxy history and documents stay in the database.
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
        </SettingsRow>

        <SettingsRow label="Delete database & data" description="Deletes the SQLite database and all saved data (HTTP history, WebSocket messages, documents, mock configurations, regression tests).">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="destructive"
                disabled={resettingDatabase}
              >
                <TrashIcon className="mr-1.5 size-3.5" />
                {resettingDatabase ? 'Deleting…' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all database data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your SQLite database. All proxy history, WebSocket messages,
                  documents, mock configurations, and regression tests will be lost. The app will reload.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDatabase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsRow>

        <SettingsRow label="Reset entire application" description="Deletes the database, browser automation artifacts, browser profile, and CA certificate files. Fully resets the app state.">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="destructive"
                disabled={resettingAllAppData}
              >
                <TrashIcon className="mr-1.5 size-3.5" />
                {resettingAllAppData ? 'Resetting…' : 'Reset All'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fully reset the application?</AlertDialogTitle>
                <AlertDialogDescription>
                  This is a complete reset. It deletes all database data, CA certificates, local browser automation
                  profiles, and browser artifacts. Everything will be wiped and the app will reload to a fresh state.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAllAppData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
