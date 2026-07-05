import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SpinnerGapIcon, PauseIcon } from '@phosphor-icons/react';

import { mainNavItems, type NavItem } from '../constants';
import { useNavStore } from '@/stores/nav';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useAutomationStore } from '@/stores/automation';
import { useBrowserAutomationStore } from '@/stores/browser-automation';

export type CrawlStatusKey = 'automation-running' | 'browser-running' | 'browser-paused';

export const STATUS_CONFIG: Record<CrawlStatusKey, { icon: typeof SpinnerGapIcon | typeof PauseIcon; className: string }> = {
  'automation-running': { icon: SpinnerGapIcon, className: 'size-3 animate-spin text-primary' },
  'browser-running': { icon: SpinnerGapIcon, className: 'size-3 animate-spin text-primary' },
  'browser-paused': { icon: PauseIcon, className: 'size-3 text-amber-500' },
};

export function resolveNavStatus(
  href: string,
  isAutomationRunning: boolean,
  crawlerStatus: 'running' | 'paused' | null,
): CrawlStatusKey | null {
  if (href === '/automation' && isAutomationRunning) return 'automation-running';
  if (href === '/browser-automation') {
    if (crawlerStatus === 'running') return 'browser-running';
    if (crawlerStatus === 'paused') return 'browser-paused';
  }
  return null;
}

export function useSidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const blinkingItems = useNavStore((state) => state.blinkingItems);
  const hiddenNavItems = useAppSettingsStore((s) => s.hiddenNavItems);
  const pinnedNavItems = useAppSettingsStore((s) => s.pinnedNavItems);
  const togglePinNavItem = useAppSettingsStore((s) => s.togglePinNavItem);

  const recentApps = useAppSettingsStore((s) => s.recentApps);
  const addRecentApp = useAppSettingsStore((s) => s.addRecentApp);
  const removeRecentApp = useAppSettingsStore((s) => s.removeRecentApp);

  const windows = useNavStore((state) => state.windows);

  const openedApps = React.useMemo(() => {
    return windows.filter((w) => w.isOpen).map((w) => w.id);
  }, [windows]);

  const openWindow = useNavStore((state) => state.openWindow);
  const closeWindow = useNavStore((state) => state.closeWindow);
  const minimizeWindow = useNavStore((state) => state.minimizeWindow);
  const focusWindow = useNavStore((state) => state.focusWindow);

  const visibleNavItems = React.useMemo(
    () => mainNavItems.filter((item) => !hiddenNavItems.includes(item.href)),
    [hiddenNavItems],
  );

  // Auto-register/open window when pathname changes (unless desktop)
  React.useEffect(() => {
    const matchedItem = visibleNavItems.find((item) => item.href === pathname);
    if (matchedItem && pathname !== '/') {
      const activeWindowId = useNavStore.getState().activeWindowId;
      const winState = useNavStore.getState().windows.find((w) => w.id === pathname);
      const isAlreadyActive = winState && winState.isOpen && !winState.isMinimized && activeWindowId === pathname;

      if (!isAlreadyActive) {
        openWindow(pathname, matchedItem.label);
      }
    }
  }, [pathname, visibleNavItems, openWindow]);

  // Track pathname changes to update recent apps list
  React.useEffect(() => {
    const matchedItem = visibleNavItems.find((item) => item.href === pathname);
    if (
      matchedItem &&
      pathname !== '/' &&
      pathname !== '/assistant'
    ) {
      addRecentApp(pathname);
    }
  }, [pathname, visibleNavItems, addRecentApp]);

  const pinnedDockItems = React.useMemo(() => {
    return pinnedNavItems
      .filter((href) => href !== '/')
      .map((href) => visibleNavItems.find((item) => item.href === href))
      .filter((item): item is NavItem => item != null);
  }, [visibleNavItems, pinnedNavItems]);

  const recentDockItems = React.useMemo(() => {
    return (recentApps || [])
      .filter(
        (href) =>
          href !== '/' &&
          href !== '/assistant' &&
          href !== '/scratchpad'
      )
      .map((href) => visibleNavItems.find((item) => item.href === href))
      .filter((item): item is NavItem => item != null);
  }, [visibleNavItems, recentApps]);

  const unpinnedOpenedItems = React.useMemo(() => {
    return openedApps
      .filter(
        (href) =>
          href !== '/' &&
          href !== '/assistant' &&
          !pinnedNavItems.includes(href)
      )
      .map((href) => visibleNavItems.find((item) => item.href === href))
      .filter((item): item is NavItem => item != null);
  }, [visibleNavItems, openedApps, pinnedNavItems]);

  React.useEffect(() => {
    if (hiddenNavItems.includes(pathname)) {
      navigate('/');
    }
  }, [hiddenNavItems, pathname, navigate]);

  const crawlerStatus = useBrowserAutomationStore((s) => {
    for (const t of s.tabs) {
      if (t.session?.status === 'running') return 'running';
      if (t.session?.status === 'paused') return 'paused';
    }
    return null;
  });
  const isAutomationRunning = useAutomationStore((s) =>
    s.runningWorkflowIds.length > 0 ||
    Object.values(s.nodeRuntimeById).some((runtime) => runtime.status === 'running')
  );

  const getNavStatus = React.useCallback(
    (href: string) => resolveNavStatus(href, isAutomationRunning, crawlerStatus),
    [isAutomationRunning, crawlerStatus],
  );

  const isNavItemActive = React.useCallback(
    (item: NavItem) => pathname === item.href,
    [pathname],
  );

  return {
    pathname,
    blinkingItems,
    visibleNavItems,
    pinnedDockItems,
    unpinnedOpenedItems,
    recentDockItems,
    pinnedNavItems,
    togglePinNavItem,
    isNavItemActive,
    getNavStatus,
    openedApps,
    openWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    removeRecentApp,
  };
}
