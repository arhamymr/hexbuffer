import * as React from 'react';
import { Target, Play, Pause, ArrowLeftRight, ShieldCheck, ShieldOff, SendHorizonal, Square, RotateCcw, Loader2 } from 'lucide-react';
import { useHttpHistoryQueryStore } from '@/pages/http-history/state/history-query-store';
import { useWebSocketHistoryQueryStore } from '@/pages/websocket-history/state/query-store';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { openTargetSelector } from '@/triggers';
import { toggleInterceptEnabled, forwardPaused } from '@/triggers';
import { toggleBrowserCrawl, stopBrowserCrawl, startBrowserCrawl } from '@/triggers';
import { startInvokerUiAttack, stopInvokerUiAttack } from '@/triggers';
import { sendCraftRequest } from '@/triggers/repeater/craft';
import { useInvokerStore } from '@/stores/invoker';
import { useCollectionsStore } from '@/stores/collections';

export interface PageButton {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  showLabel?: boolean;
  isActive: boolean;
  onClick: () => void;
  visible: boolean;
  variant?: 'primary' | 'destructive';
}

export function useFloatingPageButtons(pathname: string): PageButton[] {
  const isHttpPaused = useHttpHistoryQueryStore((s) => s.isStreamManuallyPaused);
  const isWebSocketPaused = useWebSocketHistoryQueryStore((s) => s.isStreamManuallyPaused);
  const interceptStatus = useInterceptStore((s) => s.status);
  const interceptRequests = useInterceptStore((s) => s.requests);
  const interceptActiveTabId = useInterceptStore((s) => s.activeTabId);
  const interceptSelectedId = useInterceptStore((s) => s.selectedRequestId);
  const interceptIsBusy = useInterceptStore((s) => s.isBusy);
  const browserTabs = useBrowserAutomationStore((s) => s.tabs);
  const browserActiveTabId = useBrowserAutomationStore((s) => s.activeTabId);
  const invokerTabs = useInvokerStore((s) => s.tabs);
  const invokerActiveTabId = useInvokerStore((s) => s.activeTabId);
  const collectionsActiveReq = useCollectionsStore((s) => s.activeRequest);

  const toggleHttpPause = React.useCallback(() => {
    const store = useHttpHistoryQueryStore.getState();
    const wasPaused = store.isStreamManuallyPaused;
    store.setStreamManuallyPaused(!wasPaused);
    if (wasPaused) store.triggerRefresh();
  }, []);

  const toggleWebSocketPause = React.useCallback(() => {
    const store = useWebSocketHistoryQueryStore.getState();
    const wasPaused = store.isStreamManuallyPaused;
    store.setStreamManuallyPaused(!wasPaused);
    if (wasPaused) store.triggerRefresh();
  }, []);

  return React.useMemo<PageButton[]>(() => {

    if (pathname === '/http-history') {
      return [
        {
          key: 'target-selector',
          icon: Target,
          label: 'Manage Target',
          isActive: false,
          onClick: openTargetSelector,
          visible: true,
        },
        {
          key: 'pause-resume',
          icon: isHttpPaused ? Play : Pause,
          label: isHttpPaused ? 'Resume' : 'Pause',
          showLabel: true,
          isActive: isHttpPaused,
          onClick: toggleHttpPause,
          visible: true,
        },
      ];
    }

    if (pathname === '/websocket-history') {
      return [
        {
          key: 'target-selector',
          icon: Target,
          label: 'Manage Target',
          isActive: false,
          onClick: openTargetSelector,
          visible: true,
        },
        {
          key: 'pause-resume',
          icon: isWebSocketPaused ? Play : Pause,
          label: isWebSocketPaused ? 'Resume' : 'Pause',
          showLabel: true,
          isActive: isWebSocketPaused,
          onClick: toggleWebSocketPause,
          visible: true,
        },
      ];
    }

    if (pathname === '/intercept') {
      const isEnabled = interceptStatus?.mode === 'Enabled';
      const activeRequests = interceptRequests.filter((r) => r.tab_id === interceptActiveTabId);
      const hasSelection = activeRequests.some((r) => r.id === interceptSelectedId);
      return [
        {
          key: 'intercept-toggle',
          icon: isEnabled ? ShieldCheck : ShieldOff,
          label: isEnabled ? 'On' : 'Off',
          showLabel: true,
          isActive: isEnabled,
          onClick: toggleInterceptEnabled,
          visible: true,
        },
        {
          key: 'intercept-forward',
          icon: SendHorizonal,
          label: 'Forward',
          showLabel: true,
          isActive: hasSelection && !interceptIsBusy,
          onClick: forwardPaused,
          visible: true,
          variant: 'primary',
        },
      ];
    }

    if (pathname === '/browser') {
      const browserTab = browserTabs.find((t) => t.id === browserActiveTabId);
      const browserStatus = browserTab?.session?.status ?? 'idle';
      const isRunning = browserStatus === 'running';
      const isPaused = browserStatus === 'paused';
      const hasUrl = Boolean(browserTab?.setup?.targetUrl?.trim());

      const isStartable = browserStatus === 'idle' || browserStatus === 'completed' || browserStatus === 'failed' || browserStatus === 'stopped';

      return [
        {
          key: 'browser-start',
          icon: Play,
          label: 'Start',
          isActive: false,
          onClick: startBrowserCrawl,
          visible: isStartable,
          variant: 'primary',
        },
        {
          key: 'browser-pause',
          icon: Pause,
          label: 'Pause',
          isActive: false,
          onClick: toggleBrowserCrawl,
          visible: isRunning,
        },
        {
          key: 'browser-resume',
          icon: RotateCcw,
          label: 'Resume',
          isActive: false,
          onClick: toggleBrowserCrawl,
          visible: isPaused,
        },
        {
          key: 'browser-stop',
          icon: Square,
          label: 'Stop',
          isActive: false,
          onClick: stopBrowserCrawl,
          visible: isRunning || isPaused,
          variant: 'destructive',
        },
      ];
    }

    if (pathname === '/invoker') {
      const invokerTab = invokerTabs.find((t) => t.id === invokerActiveTabId);
      const invokerRunning = invokerTab?.isRunning ?? false;
      return [
        {
          key: 'invoker-start',
          icon: Play,
          label: 'Start',
          showLabel: true,
          isActive: false,
          onClick: startInvokerUiAttack,
          visible: !invokerRunning,
          variant: 'primary',
        },
        {
          key: 'invoker-stop',
          icon: Square,
          label: 'Stop',
          isActive: false,
          onClick: stopInvokerUiAttack,
          visible: invokerRunning,
          variant: 'destructive',
        },
      ];
    }

    if (pathname === '/repeater') {
      const craftLoading = collectionsActiveReq.isLoading;

      return [
        {
          key: 'repeater-send',
          icon: craftLoading ? Loader2 : SendHorizonal,
          label: 'Send',
          showLabel: true,
          isActive: false,
          onClick: () => { void sendCraftRequest(); },
          visible: true,
          variant: 'primary',
        },
      ];
    }

    return [];
  }, [pathname, isHttpPaused, isWebSocketPaused, interceptStatus, interceptRequests, interceptActiveTabId, interceptSelectedId, interceptIsBusy, browserTabs, browserActiveTabId, invokerTabs, invokerActiveTabId, collectionsActiveReq]);
}
