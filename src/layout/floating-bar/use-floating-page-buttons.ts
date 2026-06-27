import * as React from 'react';
import { Target, Play, Pause, ArrowLeftRight, ShieldCheck, ShieldOff, SendHorizonal, Square, RotateCcw, Loader2 } from 'lucide-react';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { openTargetSelector, toggleStreamPause, toggleHistoryMode } from '@/triggers';
import { toggleInterceptEnabled, forwardPaused } from '@/triggers';
import { toggleBrowserCrawl, stopBrowserCrawl, startBrowserCrawl } from '@/triggers';
import { startInvokerUiAttack, stopInvokerUiAttack } from '@/triggers';
import { sendRepeaterRequest } from '@/triggers';
import { useInvokerStore } from '@/stores/invoker';
import { useRepeaterStore } from '@/stores/repeater';

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
  const isPaused = useHistoryQueryStore((s) => s.isStreamManuallyPaused);
  const interceptStatus = useInterceptStore((s) => s.status);
  const interceptRequests = useInterceptStore((s) => s.requests);
  const interceptActiveTabId = useInterceptStore((s) => s.activeTabId);
  const interceptSelectedId = useInterceptStore((s) => s.selectedRequestId);
  const interceptIsBusy = useInterceptStore((s) => s.isBusy);
  const browserTabs = useBrowserAutomationStore((s) => s.tabs);
  const browserActiveTabId = useBrowserAutomationStore((s) => s.activeTabId);
  const invokerTabs = useInvokerStore((s) => s.tabs);
  const invokerActiveTabId = useInvokerStore((s) => s.activeTabId);
  const repeaterTabs = useRepeaterStore((s) => s.tabs);
  const repeaterActiveTabId = useRepeaterStore((s) => s.activeTabId);

  const [historyMode, setHistoryMode] = React.useState<'http' | 'websocket'>(() =>
    localStorage.getItem('history-mode') === 'websocket' ? 'websocket' : 'http'
  );

  // Listen for external history mode changes
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as 'http' | 'websocket';
      setHistoryMode(detail);
    };
    window.addEventListener('history-mode-change', handler);
    return () => window.removeEventListener('history-mode-change', handler);
  }, []);

  return React.useMemo<PageButton[]>(() => {

    if (pathname === '/live-traffic') {
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
          icon: isPaused ? Play : Pause,
          label: isPaused ? 'Resume' : 'Pause',
          showLabel: true,
          isActive: isPaused,
          onClick: toggleStreamPause,
          visible: true,
        },
        {
          key: 'history-mode',
          icon: ArrowLeftRight,
          showLabel: true,
          label: historyMode === 'http' ? 'HTTP' : 'WebSocket',
          isActive: false,
          onClick: toggleHistoryMode,
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
      const repeaterTab = repeaterTabs.find((t) => t.id === repeaterActiveTabId);
      const repeaterLoading = repeaterTab?.isLoading ?? false;

      return [
        {
          key: 'repeater-send',
          icon: repeaterLoading ? Loader2 : SendHorizonal,
          label: 'Send',
          showLabel: true,
          isActive: false,
          onClick: () => { void sendRepeaterRequest(); },
          visible: true,
          variant: 'primary',
        },
      ];
    }

    return [];

  }, [pathname, isPaused, historyMode, interceptStatus, interceptRequests, interceptActiveTabId, interceptSelectedId, interceptIsBusy, browserTabs, browserActiveTabId, invokerTabs, invokerActiveTabId, repeaterTabs, repeaterActiveTabId]);
}
