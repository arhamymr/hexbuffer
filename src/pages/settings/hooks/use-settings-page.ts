import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { getCaCert, saveCaCert, trustInterceptCa } from '@/pages/live-traffic/api';
import { useUpdater } from '@/hooks/use-updater';
import { AI_MODEL_OPTIONS_BY_PROVIDER } from '../constants';

export interface AiSettings {
  provider: string;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
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
}

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: '',
  hasApiKey: false,
  mastraAutoStart: true,
  mastraUrl: 'http://localhost:4111',
};

export function useSettingsPage() {
  const [downloading, setDownloading] = React.useState(false);
  const [installingCa, setInstallingCa] = React.useState(false);
  const [aiSettings, setAiSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = React.useState(true);
  const [aiSettingsSaving, setAiSettingsSaving] = React.useState(false);
  const [mastraStatus, setMastraStatus] = React.useState<MastraStatus>({
    running: false,
    url: DEFAULT_AI_SETTINGS.mastraUrl,
  });
  const [mastraBusy, setMastraBusy] = React.useState(false);
  const [storageInfo, setStorageInfo] = React.useState<StorageInfo | null>(null);

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

  const loadAiSettings = React.useCallback(async () => {
    try {
      setAiSettingsLoading(true);
      const settings = await invoke<AiSettings>('get_ai_settings');
      setAiSettings(settings);
      await refreshMastraStatus();
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error(`Failed to load AI settings: ${error}`);
    } finally {
      setAiSettingsLoading(false);
    }
  }, [refreshMastraStatus]);

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

  const loadAiApiKeyStatus = React.useCallback(async (provider: string) => {
    try {
      return await invoke<boolean>('has_ai_api_key', { provider });
    } catch (error) {
      console.error('Failed to load AI API key status:', error);
      return false;
    }
  }, []);

  const updateAiProvider = React.useCallback((provider: string) => {
    const models = AI_MODEL_OPTIONS_BY_PROVIDER[provider] ?? [];

    setAiSettings((current) => ({
      ...current,
      provider,
      model: models[0] ?? '',
      apiKey: '',
      hasApiKey: false,
    }));

    void loadAiApiKeyStatus(provider).then((hasApiKey) => {
      setAiSettings((current) => (
        current.provider === provider
          ? { ...current, hasApiKey }
          : current
      ));
    });
  }, [loadAiApiKeyStatus]);

  const updateAiSettings = React.useCallback((updates: Partial<AiSettings>) => {
    setAiSettings((current) => ({ ...current, ...updates }));
  }, []);

  const handleSaveAiSettings = React.useCallback(async () => {
    try {
      setAiSettingsSaving(true);
      const savedSettings = await invoke<AiSettings>('save_ai_settings', {
        settings: aiSettings,
      });
      setAiSettings(savedSettings);
      await refreshMastraStatus();
      toast.success('AI settings saved');
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast.error(`Failed to save AI settings: ${error}`);
    } finally {
      setAiSettingsSaving(false);
    }
  }, [aiSettings, refreshMastraStatus]);

  const handleClearAiApiKey = React.useCallback(async () => {
    try {
      setAiSettingsSaving(true);
      const savedSettings = await invoke<AiSettings>('clear_ai_api_key');
      setAiSettings(savedSettings);
      toast.success('AI API key cleared');
    } catch (error) {
      console.error('Failed to clear AI API key:', error);
      toast.error(`Failed to clear AI API key: ${error}`);
    } finally {
      setAiSettingsSaving(false);
    }
  }, []);

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

  return {
    aiSettings,
    aiSettingsLoading,
    aiSettingsSaving,
    currentVersion,
    downloading,
    installingCa,
    handleDownloadCert,
    handleInstallMacCert,
    handleClearAiApiKey,
    handleSaveAiSettings,
    handleStartMastra,
    handleStopMastra,
    handleToggleMastra,
    mastraBusy,
    mastraStatus,
    refreshMastraStatus,
    storageInfo,
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
