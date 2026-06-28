import type { UIMessage } from '@ai-sdk/react';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatSessions } from './use-chat-sessions';
import { useDashboardPage } from './use-dashboard-page';
import { useAiChatActions } from '@/hooks/use-ai-chat-actions';
import { useTrackedActions, clearTrackedActions } from '@/lib/ai-chat-actions';
import { AI_MODEL_OPTIONS_BY_PROVIDER } from '@/pages/settings/constants';
import { allNavItems, type NavItem } from '@/layout/constants';

export function useAiChatPane() {
  const setMessagesRef = useRef<((messages: UIMessage<unknown>[]) => void) | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const location = useLocation();

  const currentPage: NavItem | null = useMemo(() => {
    const match = allNavItems.find((item) => item.href === location.pathname);
    return match ?? null;
  }, [location.pathname]);

  const {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    saveMessages,
  } = useChatSessions({ setMessagesRef });

  const {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    isStreaming,
    messages,
    model,
    provider,
    setModel,
    status,
    stop,
    pendingCrawlInput,
    dismissCrawlInput,
    pendingSelection,
    dismissSelection,
    submitSelection,
    pendingClarification,
    dismissClarification,
    submitClarification,
  } = useDashboardPage({
    sessionId: activeSessionId,
    setMessagesRef,
    onSaveMessages: saveMessages,
    currentPage,
  });

  const providerDisplay = 'DeepSeek';
  const modelOptions = AI_MODEL_OPTIONS_BY_PROVIDER[aiSettings.provider] ?? [];

  useAiChatActions();
  const trackedActions = useTrackedActions();

  useEffect(() => {
    if (status === 'submitted') {
      clearTrackedActions();
    }
  }, [status]);

  const handleModelChange = useCallback((newModel: string) => {
    setModel(newModel);
  }, [setModel]);

  const requestedFieldLabels = pendingCrawlInput?.requestedFields?.length
    ? pendingCrawlInput.requestedFields.join(', ')
    : 'credentials';

  return {
    aiSettings,
    aiSettingsLoading,
    error,
    handleSubmit,
    handleModelChange,
    isStreaming,
    messages,
    model,
    modelOptions,
    provider,
    providerDisplay,
    status,
    stop,
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    deleteSession,
    saveMessages,
    sidebarCollapsed,
    setSidebarCollapsed,
    trackedActions,
    pendingCrawlInput,
    dismissCrawlInput,
    pendingSelection,
    dismissSelection,
    submitSelection,
    pendingClarification,
    dismissClarification,
    submitClarification,
    requestedFieldLabels,
    currentPage,
  };
}
