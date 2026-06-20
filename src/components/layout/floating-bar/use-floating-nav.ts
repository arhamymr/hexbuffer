'use client';

import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Pause } from 'lucide-react';

import { navCategories, type NavCategory } from '../constants';
import { useNavStore } from '@/stores/nav';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { useAutomationStore } from '@/stores/automation';
import { useBrowserAutomationStore } from '@/stores/browser-automation';

export type CrawlStatusKey = 'automation-running' | 'browser-running' | 'browser-paused';

export const STATUS_CONFIG: Record<CrawlStatusKey, { icon: typeof Loader2 | typeof Pause; className: string }> = {
  'automation-running': { icon: Loader2, className: 'size-3 animate-spin text-primary' },
  'browser-running': { icon: Loader2, className: 'size-3 animate-spin text-primary' },
  'browser-paused': { icon: Pause, className: 'size-3 text-amber-500' },
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

  const visibleCategories = React.useMemo(
    () => navCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => !hiddenNavItems.includes(item.href)),
      }))
      .filter((cat) => cat.items.length > 0),
    [hiddenNavItems],
  );

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

  const isCategoryActive = React.useCallback(
    (cat: NavCategory) => cat.items.some((item) => pathname === item.href),
    [pathname],
  );

  return {
    pathname,
    blinkingItems,
    visibleCategories,
    isCategoryActive,
    getNavStatus,
  };
}
