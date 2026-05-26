'use client';

import { useEffect, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useBrowserAutomationStore } from '@/stores/browser-automation';

export interface MastraStatus {
  running: boolean;
  pid?: number;
  url: string;
}

export function useBrowserAutomationPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    browserStatus,
    refreshBrowserStatus,
    updateUrl,
    updateInstruction,
    openBrowser,
    closeBrowser,
    takeSnapshot,
    runAiAutomation,
    stopAutomation,
    clearActionLog,
  } = useBrowserAutomationStore();
  const [mastraStatus, setMastraStatus] = useState<MastraStatus | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  const refreshMastraStatus = useCallback(async () => {
    try {
      const status = await invoke<MastraStatus>('get_mastra_status');
      setMastraStatus(status);
    } catch (error) {
      console.error('Failed to get Mastra status:', error);
      setMastraStatus({
        running: false,
        url: 'http://localhost:4111',
      });
    }
  }, []);

  useEffect(() => {
    refreshBrowserStatus();
    refreshMastraStatus();
    const interval = setInterval(() => {
      refreshBrowserStatus();
      refreshMastraStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshBrowserStatus, refreshMastraStatus]);

  const handleUrlChange = useCallback((url: string) => {
    if (activeTabId) {
      updateUrl(activeTabId, url);
    }
  }, [activeTabId, updateUrl]);

  const handleInstructionChange = useCallback((instruction: string) => {
    if (activeTabId) {
      updateInstruction(activeTabId, instruction);
    }
  }, [activeTabId, updateInstruction]);

  const handleOpenBrowser = useCallback(() => {
    if (activeTabId) {
      openBrowser(activeTabId);
    }
  }, [activeTabId, openBrowser]);

  const handleCloseBrowser = useCallback(() => {
    closeBrowser();
  }, [closeBrowser]);

  const handleRefreshSnapshot = useCallback(() => {
    if (activeTabId) {
      takeSnapshot(activeTabId);
    }
  }, [activeTabId, takeSnapshot]);

  const handleRunAi = useCallback(() => {
    if (activeTabId) {
      runAiAutomation(activeTabId);
    }
  }, [activeTabId, runAiAutomation]);

  const handleStop = useCallback(() => {
    if (activeTabId) {
      stopAutomation(activeTabId);
    }
  }, [activeTabId, stopAutomation]);

  const handleElementClick = useCallback((refId: string) => {
    if (activeTabId) {
      const { clickElement } = useBrowserAutomationStore.getState();
      clickElement(activeTabId, refId);
    }
  }, [activeTabId]);

  const handleClearActionLog = useCallback(() => {
    if (activeTabId) {
      clearActionLog(activeTabId);
    }
  }, [activeTabId, clearActionLog]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    browserStatus,
    mastraStatus,
    activeTab,
    handleUrlChange,
    handleInstructionChange,
    handleOpenBrowser,
    handleCloseBrowser,
    handleRefreshSnapshot,
    handleRunAi,
    handleStop,
    handleElementClick,
    handleClearActionLog,
  };
}
