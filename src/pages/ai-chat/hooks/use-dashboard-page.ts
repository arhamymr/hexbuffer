import { useChat } from '@ai-sdk/react';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useMemo, useState } from 'react';
import { DASHBOARD_DEFAULT_AI_MODEL } from '../constants';
import { DashboardSettingsChatTransport } from '../lib/dashboard-chat-transport';
import type { DashboardAiSettings, DashboardChatMessage } from '../types';

const DEFAULT_AI_SETTINGS: DashboardAiSettings = {
  provider: 'openai',
  model: DASHBOARD_DEFAULT_AI_MODEL,
  hasApiKey: false,
};

export function useDashboardPage() {
  const [aiSettings, setAiSettings] = useState<DashboardAiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const transport = useMemo(() => new DashboardSettingsChatTransport(), []);
  const {
    clearError,
    error,
    messages,
    sendMessage,
    status,
    stop,
  } = useChat<DashboardChatMessage>({
    transport,
  });

  async function refreshAiSettings() {
    const settings = await invoke<DashboardAiSettings>('get_ai_settings');
    setAiSettings(settings);
    return settings;
  }

  useEffect(() => {
    let active = true;

    async function loadAiSettings() {
      try {
        setAiSettingsLoading(true);
        const settings = await invoke<DashboardAiSettings>('get_ai_settings');
        if (active) {
          setAiSettings(settings);
        }
      } catch (error) {
        console.error('Failed to load AI settings for chat:', error);
      } finally {
        if (active) {
          setAiSettingsLoading(false);
        }
      }
    }

    void loadAiSettings();

    return () => {
      active = false;
    };
  }, []);

  const handleSend = async () => {
    const text = prompt.trim();

    if (!text) {
      return;
    }

    let currentAiSettings = aiSettings;

    try {
      currentAiSettings = await refreshAiSettings();
    } catch (error) {
      console.error('Failed to refresh AI settings for chat:', error);
    }

    clearError();
    await sendMessage(
      { text },
      {
        body: {
          aiSettings: currentAiSettings,
        },
      }
    );
    setPrompt('');
  };

  return {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSend,
    isStreaming: status === 'submitted' || status === 'streaming',
    messages,
    model: aiSettings.model,
    prompt,
    setPrompt,
    status,
    stop,
  };
}
