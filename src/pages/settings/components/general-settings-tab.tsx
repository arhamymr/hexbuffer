import { Asterisk, DatabaseIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SettingsPageState } from '../hooks/use-settings-page';

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
    updateMessage,
    updateVersion,
    storageInfo,
  } = settings;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          <CardDescription>Check for and install application updates</CardDescription>
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
            <Button size="xs" onClick={handleCheckForUpdates} disabled={updateChecking || updateDownloading}>
              <RefreshCwIcon className={`mr-2 size-4 ${updateChecking ? 'animate-spin' : ''}`} />
              {updateChecking ? 'Checking...' : 'Check for Updates'}
            </Button>
            {updateAvailable && (
              <Button size="xs" variant="default" onClick={handleInstallUpdate} disabled={updateDownloading}>
                <Asterisk className={`mr-2 size-4 ${updateDownloading ? 'animate-spin' : ''}`} />
                {updateDownloading ? 'Installing...' : `Install v${updateVersion}`}
              </Button>
            )}
          </div>
          {updateMessage && (
            <p className="text-sm text-muted-foreground">{updateMessage}</p>
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
            <p className="text-sm font-medium">Database</p>
            <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {storageInfo?.databasePath ?? 'Loading...'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Proxy history, documents, and other local records are stored in this database on your device.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
