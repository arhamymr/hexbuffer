import { useChat } from '@ai-sdk/react';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileUIPart } from 'ai';
import { DASHBOARD_DEFAULT_AI_MODEL } from '../constants';
import { DashboardSettingsChatTransport } from '../lib/dashboard-chat-transport';
import type { DashboardAiSettings, DashboardChatMessage } from '../types';

const DEFAULT_AI_SETTINGS: DashboardAiSettings = {
  provider: 'openai',
  model: DASHBOARD_DEFAULT_AI_MODEL,
  hasApiKey: false,
};

interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

export function useDashboardPage() {
  const [aiSettings, setAiSettings] = useState<DashboardAiSettings>(DEFAULT_AI_SETTINGS);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
  const aiSettingsRef = useRef(aiSettings);

  useEffect(() => {
    aiSettingsRef.current = aiSettings;
  }, [aiSettings]);

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

  const handleSubmit = useCallback(async ({ text, files }: PromptInputMessage) => {
    if (!text.trim()) {
      return;
    }

    clearError();
    await sendMessage(
      { text, files },
      {
        body: {
          aiSettings: aiSettingsRef.current,
        },
      }
    );
  }, [clearError, sendMessage]);

  const setModel = useCallback((model: string) => {
    setAiSettings((prev) => ({ ...prev, model }));
  }, []);

  const setProvider = useCallback((provider: DashboardAiSettings['provider']) => {
    setAiSettings((prev) => ({ ...prev, provider }));
  }, []);

  return {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    isStreaming: status === 'submitted' || status === 'streaming',
    messages,
    model: aiSettings.model,
    provider: aiSettings.provider,
    setModel,
    setProvider,
    status,
    stop,
  };
}
