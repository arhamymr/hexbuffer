import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { getCaCert, saveCaCert, trustInterceptCa } from '@/pages/live-traffic/api';
import { useUpdater } from '@/hooks/use-updater';
import { DEFAULT_PROXY_PORT, MAX_PROXY_PORT, MIN_PROXY_PORT, isValidProxyPort, useAppStore } from '@/stores/app';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { AI_MODEL_OPTIONS_BY_PROVIDER, AI_PROVIDER_OPTIONS } from '../constants';

export interface AiSettings {
  provider: string;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
  allowThirdPartyAiSharing: boolean;
  mastraAutoStart: boolean;
  mastraUrl: string;
}

export interface MastraStatus {
  running: boolean;
  pid?: number;
  url: string;
}

export interface StorageInfo {
  appDataDir: string;
  databasePath: string;
  browserArtifactsPath: string;
}

export interface ClearBrowserArtifactsResult {
  artifactDir: string;
  filesDeleted: number;
  bytesDeleted: number;
  pagesUpdated: number;
}

export interface ResetLocalDataResult extends ClearBrowserArtifactsResult {
  interceptBrowserProfileRemoved: boolean;
  caFileRemoved: boolean;
}

type AiKeyStatus = Record<string, boolean>;

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: '',
  hasApiKey: false,
  allowThirdPartyAiSharing: false,
  mastraAutoStart: true,
  mastraUrl: 'http://localhost:4111',
};
export function useSettingsPage() {
  const [downloading, setDownloading] = React.useState(false);
  const [installingCa, setInstallingCa] = React.useState(false);
  const [aiSettings, setAiSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = React.useState(true);
  const [aiSettingsSaving, setAiSettingsSaving] = React.useState(false);
  const [providerKeyStatus, setProviderKeyStatus] = React.useState<AiKeyStatus>({});
  const [mastraStatus, setMastraStatus] = React.useState<MastraStatus>({
    running: false,
    url: DEFAULT_AI_SETTINGS.mastraUrl,
  });
  const [mastraBusy, setMastraBusy] = React.useState(false);
  const [storageInfo, setStorageInfo] = React.useState<StorageInfo | null>(null);
  const [resettingLocalData, setResettingLocalData] = React.useState(false);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const saveProxyDefaultPort = useAppStore((state) => state.saveProxyDefaultPort);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);
  const [proxyPortDraft, setProxyPortDraft] = React.useState(String(proxyDefaultPort));

  const clearBrowserAutomationArtifactPaths = useBrowserAutomationStore((state) => state.clearArtifactPaths);

  const {
    currentVersion,
    checking: updateChecking,
    downloading: updateDownloading,
    downloadError: updateError,
    downloadMessage: updateMessage,
    updateAvailable,
    updateVersion,
    checkForUpdates,
    installUpdate,
  } = useUpdater();

  const refreshMastraStatus = React.useCallback(async () => {
    try {
      const status = await invoke<MastraStatus>('get_mastra_status');
      setMastraStatus(status);
    } catch (error) {
      console.error('Failed to load Mastra status:', error);
    }
  }, []);

  const refreshAiKeyStatus = React.useCallback(async () => {
    const status = await invoke<AiKeyStatus>('get_ai_key_status');
    setProviderKeyStatus(status);
    return status;
  }, []);

  const migrateLegacyAiKeys = React.useCallback(async () => {
    const legacyValue = window.localStorage.getItem('0xbuffer-ai-keys');
    if (!legacyValue) {
      return;
    }

    try {
      const parsed = JSON.parse(legacyValue) as { state?: { keys?: Record<string, string> }; keys?: Record<string, string> };
      const keys = parsed.state?.keys ?? parsed.keys ?? {};
      const entries = Object.entries(keys).filter(([, value]) => value.trim().length > 0);

      for (const [provider, apiKey] of entries) {
        await invoke<AiKeyStatus>('set_ai_api_key', { provider, apiKey });
      }

      window.localStorage.removeItem('0xbuffer-ai-keys');
      if (entries.length > 0) {
        toast.success('Migrated saved AI API keys to the OS credential store');
      }
    } catch (error) {
      console.error('Failed to migrate legacy AI API keys:', error);
      toast.error(`Failed to migrate saved AI API keys: ${error}`);
    }
  }, []);

  const loadAiSettings = React.useCallback(async () => {
    try {
      setAiSettingsLoading(true);
      await migrateLegacyAiKeys();
      const keyStatus = await refreshAiKeyStatus();
      const settings = await invoke<AiSettings>('get_ai_settings');
      setAiSettings({ ...settings, hasApiKey: !!keyStatus[settings.provider] });
      await refreshMastraStatus();
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error(`Failed to load AI settings: ${error}`);
    } finally {
      setAiSettingsLoading(false);
    }
  }, [migrateLegacyAiKeys, refreshAiKeyStatus, refreshMastraStatus]);

  React.useEffect(() => {
    void loadAiSettings();
  }, [loadAiSettings]);

  React.useEffect(() => {
    invoke<StorageInfo>('get_storage_info')
      .then(setStorageInfo)
      .catch((error) => {
        console.error('Failed to load storage info:', error);
      });
  }, []);

  React.useEffect(() => {
    setProxyPortDraft(String(proxyDefaultPort));
  }, [proxyDefaultPort]);

  React.useEffect(() => {
    void checkProxyStatus();

    const interval = window.setInterval(() => {
      void checkProxyStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  const handleResetLocalData = React.useCallback(async () => {
    try {
      setResettingLocalData(true);
      const result = await invoke<ResetLocalDataResult>('reset_local_data');
      clearBrowserAutomationArtifactPaths();
      const sizeMb = result.bytesDeleted / 1024 / 1024;
      toast.success(
        `Reset local browser data and cleared ${result.filesDeleted} artifact file${result.filesDeleted === 1 ? '' : 's'} (${sizeMb.toFixed(2)} MB)`
      );
    } catch (error) {
      console.error('Failed to reset local data:', error);
      toast.error(`Failed to reset local data: ${error}`);
    } finally {
      setResettingLocalData(false);
    }
  }, [clearBrowserAutomationArtifactPaths]);

  const handleDownloadCert = React.useCallback(async () => {
    try {
      setDownloading(true);

      const filePath = await save({
        title: 'Save CA Certificate',
        defaultPath: '0xbuffer-ca.pem',
        filters: [
          {
            name: 'PEM Certificate',
            extensions: ['pem', 'crt', 'cer'],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      const certPem = await getCaCert();
      await saveCaCert(filePath, certPem);
      toast.success(`Certificate saved to ${filePath}`);
    } catch (error) {
      console.error('Failed to download CA certificate:', error);
      toast.error(`Failed to save certificate: ${error}`);
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleInstallMacCert = React.useCallback(async () => {
    try {
      setInstallingCa(true);
      const message = await trustInterceptCa();
      toast.success(message);
    } catch (error) {
      console.error('Failed to install CA certificate:', error);
      toast.error(`Failed to install certificate: ${error}`);
    } finally {
      setInstallingCa(false);
    }
  }, []);

  const updateAiProvider = React.useCallback((provider: string) => {
    const models = AI_MODEL_OPTIONS_BY_PROVIDER[provider] ?? [];

    setAiSettings((current) => ({
      ...current,
      provider,
      model: models[0] ?? '',
      apiKey: '',
      hasApiKey: !!providerKeyStatus[provider],
    }));
  }, [providerKeyStatus]);

  const updateAiSettings = React.useCallback((updates: Partial<AiSettings>) => {
    setAiSettings((current) => ({ ...current, ...updates }));
  }, []);

  const handleSaveAiSettings = React.useCallback(async () => {
    try {
      setAiSettingsSaving(true);

      let nextKeyStatus = providerKeyStatus;
      if (aiSettings.apiKey.trim()) {
        nextKeyStatus = await invoke<AiKeyStatus>('set_ai_api_key', {
          provider: aiSettings.provider,
          apiKey: aiSettings.apiKey.trim(),
        });
        setProviderKeyStatus(nextKeyStatus);
      }

      // Save provider/model settings to backend (without the key)
      const settingsToSave = { ...aiSettings, apiKey: '' };
      const savedSettings = await invoke<AiSettings>('save_ai_settings', {
        settings: settingsToSave,
      });
      setAiSettings({ ...savedSettings, hasApiKey: !!nextKeyStatus[savedSettings.provider] });
      await refreshMastraStatus();
      toast.success('AI settings saved');
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast.error(`Failed to save AI settings: ${error}`);
    } finally {
      setAiSettingsSaving(false);
    }
  }, [aiSettings, providerKeyStatus, refreshMastraStatus]);

  const handleClearAiApiKey = React.useCallback(async () => {
    try {
      setAiSettingsSaving(true);
      const nextKeyStatus = await invoke<AiKeyStatus>('clear_ai_api_key', {
        provider: aiSettings.provider,
      });
      setProviderKeyStatus(nextKeyStatus);
      setAiSettings((current) => ({ ...current, apiKey: '', hasApiKey: false }));
      toast.success('AI API key cleared');
    } catch (error) {
      console.error('Failed to clear AI API key:', error);
      toast.error(`Failed to clear AI API key: ${error}`);
    } finally {
      setAiSettingsSaving(false);
    }
  }, [aiSettings.provider]);

  const handleStartMastra = React.useCallback(async () => {
    try {
      setMastraBusy(true);
      const status = await invoke<MastraStatus>('start_mastra');
      setMastraStatus(status);
      toast.success('Mastra started');
    } catch (error) {
      console.error('Failed to start Mastra:', error);
      toast.error(`Failed to start Mastra: ${error}`);
    } finally {
      setMastraBusy(false);
    }
  }, []);

  const handleStopMastra = React.useCallback(async () => {
    try {
      setMastraBusy(true);
      const status = await invoke<MastraStatus>('stop_mastra');
      setMastraStatus(status);
      toast.success('Mastra stopped');
    } catch (error) {
      console.error('Failed to stop Mastra:', error);
      toast.error(`Failed to stop Mastra: ${error}`);
    } finally {
      setMastraBusy(false);
    }
  }, []);

  const handleToggleMastra = React.useCallback(async (enabled: boolean) => {
    const nextSettings = { ...aiSettings, mastraAutoStart: enabled };

    try {
      setMastraBusy(true);
      setAiSettings(nextSettings);

      const savedSettings = await invoke<AiSettings>('save_ai_settings', {
        settings: nextSettings,
      });
      setAiSettings(savedSettings);

      const status = enabled
        ? await invoke<MastraStatus>('start_mastra')
        : await invoke<MastraStatus>('stop_mastra');
      setMastraStatus(status);
      toast.success(enabled ? 'Mastra enabled' : 'Mastra disabled');
    } catch (error) {
      console.error('Failed to update Mastra runtime:', error);
      toast.error(`Failed to update Mastra runtime: ${error}`);
      await loadAiSettings();
    } finally {
      setMastraBusy(false);
    }
  }, [aiSettings, loadAiSettings]);

  const handleSaveProxyDefaultPort = React.useCallback(async () => {
    const parsedPort = Number(proxyPortDraft);

    if (!isValidProxyPort(parsedPort)) {
      toast.error(`Enter a port between ${MIN_PROXY_PORT} and ${MAX_PROXY_PORT}`);
      return;
    }

    try {
      const activePort = await saveProxyDefaultPort(parsedPort);
      toast.success(
        proxyStatus === 'connected'
          ? `Proxy listener restarted on ${activePort}`
          : `Proxy listener port saved: ${parsedPort}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save proxy port: ${error}`);
    }
  }, [proxyPortDraft, proxyStatus, saveProxyDefaultPort]);

  const handleResetProxyDefaultPort = React.useCallback(async () => {
    try {
      const activePort = await saveProxyDefaultPort(DEFAULT_PROXY_PORT);
      setProxyPortDraft(String(DEFAULT_PROXY_PORT));
      toast.success(
        proxyStatus === 'connected'
          ? `Proxy listener reset and restarted on ${activePort}`
          : 'Proxy listener port reset'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to reset proxy port: ${error}`);
    }
  }, [proxyStatus, saveProxyDefaultPort]);

  return {
    aiSettings,
    aiSettingsLoading,
    aiSettingsSaving,
    currentVersion,
    proxyDefaultPort,
    proxyFactoryDefaultPort: DEFAULT_PROXY_PORT,
    proxyPort,
    proxyPortDraft,
    proxyStatus,
    resettingLocalData,
    downloading,
    installingCa,
    handleDownloadCert,
    handleInstallMacCert,
    handleClearAiApiKey,
    handleResetLocalData,
    handleResetProxyDefaultPort,
    handleSaveProxyDefaultPort,
    handleSaveAiSettings,
    handleStartMastra,
    handleStopMastra,
    handleToggleMastra,
    mastraBusy,
    mastraStatus,
    refreshMastraStatus,
    setProxyPortDraft,
    storageInfo,
    providerKeyStatus,
    updateAiProvider,
    updateAiSettings,
    updateAvailable,
    updateChecking,
    updateDownloading,
    updateError,
    updateMessage,
    updateVersion,
    handleCheckForUpdates: checkForUpdates,
    handleInstallUpdate: installUpdate,
  };
}

export type SettingsPageState = ReturnType<typeof useSettingsPage>;
