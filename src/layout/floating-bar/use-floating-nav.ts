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

  const visibleNavItems = React.useMemo(
    () => mainNavItems.filter((item) => !hiddenNavItems.includes(item.href)),
    [hiddenNavItems],
  );

  const MAX_DOCK_ITEMS = 10;

  const dockNavItems = React.useMemo(() => {
    // Overview always appears first (if visible), then pinned items, max 10
    const overview = visibleNavItems.find((item) => item.href === '/');
    const pinned = pinnedNavItems
      .filter((href) => href !== '/')
      .map((href) => visibleNavItems.find((item) => item.href === href))
      .filter((item): item is NavItem => item != null);
    const items = overview ? [overview, ...pinned] : pinned;
    return items.slice(0, MAX_DOCK_ITEMS);
  }, [visibleNavItems, pinnedNavItems]);

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
    dockNavItems,
    pinnedNavItems,
    togglePinNavItem,
    isNavItemActive,
    getNavStatus,
  };
}
