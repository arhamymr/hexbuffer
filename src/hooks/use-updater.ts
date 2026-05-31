import * as React from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { Update } from '@tauri-apps/plugin-updater';

function toUpdaterErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useUpdater() {
  const [currentVersion, setCurrentVersion] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadMessage, setDownloadMessage] = React.useState('');
  const [pendingUpdate, setPendingUpdate] = React.useState<Update | null>(null);
  const updateAvailable = pendingUpdate !== null;

  const checkForUpdates = React.useCallback(async (silent = false) => {
    if (checking) return;
    try {
      setChecking(true);
      if (!silent) setDownloadMessage('');
      const update = await check({ timeout: 15000 });
      setPendingUpdate(update);
      if (!silent && !update) {
        setDownloadMessage('You are up to date.');
      }
      return update;
    } catch (error) {
      console.error('Update check failed:', error);
      setPendingUpdate(null);
      if (!silent) {
        setDownloadMessage(`Update check failed: ${toUpdaterErrorMessage(error)}`);
      }
      return null;
    } finally {
      setChecking(false);
    }
  }, [checking]);

  const installUpdate = React.useCallback(async () => {
    if (!pendingUpdate || downloading) return;
    try {
      setDownloading(true);
      setDownloadMessage(`Downloading update ${pendingUpdate.version}...`);

      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Finished':
            setDownloadMessage('Installing...');
            break;
        }
      });

      setDownloadMessage('Update installed. Restarting...');
      await relaunch();
    } catch (error) {
      console.error('Update install failed:', error);
      setDownloadMessage(`Update failed: ${error}`);
    } finally {
      setDownloading(false);
    }
  }, [pendingUpdate, downloading]);

  React.useEffect(() => {
    void checkForUpdates(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    void getVersion()
      .then(setCurrentVersion)
      .catch((error) => {
        console.error('Failed to load app version:', error);
      });
  }, []);

  return {
    currentVersion,
    checking,
    downloading,
    downloadMessage,
    updateAvailable,
    updateVersion: pendingUpdate?.version ?? null,
    checkForUpdates: () => checkForUpdates(false),
    installUpdate,
  };
}
