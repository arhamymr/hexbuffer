import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { getCaCert, saveCaCert } from '@/pages/http-history/api';

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

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKey: '',
  hasApiKey: false,
  mastraAutoStart: false,
  mastraUrl: 'http://localhost:4111',
};

export function useSettingsPage() {
  const [downloading, setDownloading] = React.useState(false);
  const [aiSettings, setAiSettings] = React.useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = React.useState(true);
  const [aiSettingsSaving, setAiSettingsSaving] = React.useState(false);
  const [mastraStatus, setMastraStatus] = React.useState<MastraStatus>({
    running: false,
    url: DEFAULT_AI_SETTINGS.mastraUrl,
  });
  const [mastraBusy, setMastraBusy] = React.useState(false);

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

  const handleDownloadCert = React.useCallback(async () => {
    try {
      setDownloading(true);

      const filePath = await save({
        title: 'Save CA Certificate',
        defaultPath: 'apprecon-ca.pem',
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

  return {
    aiSettings,
    aiSettingsLoading,
    aiSettingsSaving,
    downloading,
    handleDownloadCert,
    handleClearAiApiKey,
    handleSaveAiSettings,
    handleStartMastra,
    handleStopMastra,
    mastraBusy,
    mastraStatus,
    refreshMastraStatus,
    updateAiSettings,
  };
}
