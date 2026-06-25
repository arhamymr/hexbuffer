import * as React from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import type { DownloadEvent, Update } from '@tauri-apps/plugin-updater';

type DownloadProgressPhase = 'idle' | 'downloading' | 'installing' | 'installed' | 'failed';

interface DownloadProgress {
  phase: DownloadProgressPhase;
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  message: string;
}

const idleDownloadProgress: DownloadProgress = {
  phase: 'idle',
  downloadedBytes: 0,
  totalBytes: null,
  percent: null,
  message: '',
};

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
  const [downloadProgress, setDownloadProgress] = React.useState<DownloadProgress>(idleDownloadProgress);
  const [updateInstalled, setUpdateInstalled] = React.useState(false);
  const [pendingUpdate, setPendingUpdate] = React.useState<Update | null>(null);
  const updateAvailable = pendingUpdate !== null;

  const updateDownloadProgress = React.useCallback((event: DownloadEvent) => {
    switch (event.event) {
      case 'Started': {
        const totalBytes = event.data.contentLength ?? null;

        setDownloadProgress({
          phase: 'downloading',
          downloadedBytes: 0,
          totalBytes,
          percent: totalBytes ? 0 : null,
          message: 'Downloading update...',
        });
        setDownloadMessage('Downloading update...');
        break;
      }
      case 'Progress':
        setDownloadProgress((current) => {
          const downloadedBytes = current.downloadedBytes + event.data.chunkLength;
          const percent = current.totalBytes
            ? Math.min(100, Math.round((downloadedBytes / current.totalBytes) * 100))
            : null;

          return {
            ...current,
            phase: 'downloading',
            downloadedBytes,
            percent,
            message: percent === null ? 'Downloading update...' : `Downloading update... ${percent}%`,
          };
        });
        break;
      case 'Finished':
        setDownloadProgress((current) => ({
          ...current,
          phase: 'installing',
          percent: current.totalBytes ? 100 : current.percent,
          message: 'Installing update...',
        }));
        setDownloadMessage('Installing...');
        break;
    }
  }, []);

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
      setDownloadProgress({
        phase: 'downloading',
        downloadedBytes: 0,
        totalBytes: null,
        percent: null,
        message: `Downloading update ${pendingUpdate.version}...`,
      });

      await pendingUpdate.downloadAndInstall(updateDownloadProgress);

      setDownloadMessage('Update installed successfully. Restarting app...');
      setDownloadProgress((current) => ({
        ...current,
        phase: 'installed',
        percent: current.totalBytes ? 100 : current.percent,
        message: 'Update installed successfully. Restarting app...',
      }));
      setUpdateInstalled(true);
      setPendingUpdate(null);
      return { ok: true };
    } catch (error) {
      console.error('Update install failed:', error);
      const message = toUpdaterErrorMessage(error);
      setDownloadMessage(`Update failed: ${message}`);
      setDownloadError(message);
      setDownloadProgress((current) => ({
        ...current,
        phase: 'failed',
        message,
      }));
      setUpdateInstalled(false);
      return {
        ok: false,
        error: message,
      };
    } finally {
      setDownloading(false);
    }
  }, [pendingUpdate, downloading, updateDownloadProgress]);

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
    downloadProgress,
    downloadMessage,
    downloadError,
    updateInstalled,
    updateAvailable,
    updateVersion: pendingUpdate?.version ?? null,
    checkForUpdates: () => checkForUpdates(false),
    installUpdate,
  };
}
