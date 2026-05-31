import * as React from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
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
  const [downloadError, setDownloadError] = React.useState('');
  const [updateInstalled, setUpdateInstalled] = React.useState(false);
  const [pendingUpdate, setPendingUpdate] = React.useState<Update | null>(null);
  const updateAvailable = pendingUpdate !== null;

  const checkForUpdates = React.useCallback(async (silent = false) => {
    if (checking) return;
    try {
      setChecking(true);
      if (!silent) {
        setDownloadMessage('');
        setDownloadError('');
      }
      const update = await check({ timeout: 15000 });
      setPendingUpdate(update);
      setUpdateInstalled(false);
      if (!silent && !update) {
        setDownloadMessage('You are up to date.');
      }
      return update;
    } catch (error) {
      console.error('Update check failed:', error);
      setPendingUpdate(null);
      if (!silent) {
        const message = `Update check failed: ${toUpdaterErrorMessage(error)}`;
        setDownloadMessage(message);
        setDownloadError(message);
      }
      return null;
    } finally {
      setChecking(false);
    }
  }, [checking]);

  const installUpdate = React.useCallback(async () => {
    if (!pendingUpdate || downloading) {
      return {
        ok: false,
        error: 'No update is ready to install.',
      };
    }

    try {
      setUpdateInstalled(false);
      setDownloadError('');
      setDownloading(true);
      setDownloadMessage(`Downloading update ${pendingUpdate.version}...`);

      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Finished':
            setDownloadMessage('Installing...');
            break;
        }
      });

      setDownloadMessage('Update installed successfully. Restarting app...');
      setUpdateInstalled(true);
      setPendingUpdate(null);
      return { ok: true };
    } catch (error) {
      console.error('Update install failed:', error);
      const message = toUpdaterErrorMessage(error);
      setDownloadMessage(`Update failed: ${message}`);
      setDownloadError(message);
      setUpdateInstalled(false);
      return {
        ok: false,
        error: message,
      };
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
    downloadError,
    updateInstalled,
    updateAvailable,
    updateVersion: pendingUpdate?.version ?? null,
    checkForUpdates: () => checkForUpdates(false),
    installUpdate,
  };
}
