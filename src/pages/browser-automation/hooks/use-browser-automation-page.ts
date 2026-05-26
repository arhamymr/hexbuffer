'use client';

import { useEffect, useCallback } from 'react';
import { useBrowserAutomationStore } from '@/stores/browser-automation';

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

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  useEffect(() => {
    refreshBrowserStatus();
    const interval = setInterval(refreshBrowserStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshBrowserStatus]);

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
