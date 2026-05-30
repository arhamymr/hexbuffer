import { useState, useEffect, useCallback, useRef } from 'react';
import { getHttpLogs, getWebSocketLogs } from '@/pages/live-traffic/api';
import { useAppStore } from '@/stores/app';
import { useTargetStore } from '@/stores/target';
import { useRepeaterStore } from '@/stores/repeater';
import { useBruteForceStore } from '@/stores/bruto-force';

export interface LiveTrafficSummary {
  proxyStatus: string;
  proxyPort: number | null;
  httpTotalCalls: number;
  wsConnectionCount: number;
  activeTargets: number;
  totalTargets: number;
}

export interface BruteForceSummary {
  tabsOpen: number;
  attacksRunning: number;
  totalResults: number;
  bypassPatterns: number;
}

export interface RepeaterSummary {
  httpTabs: number;
  wsTabs: number;
  tabsWithResponses: number;
  activeWsConnections: number;
}

const POLL_INTERVAL_MS = 15_000;

export function useDashboardPage() {
  const { proxyStatus, proxyPort, checkProxyStatus } = useAppStore();
  const targets = useTargetStore((s) => s.targets);
  const repeaterTabs = useRepeaterStore((s) => s.tabs);
  const bruteForceTabs = useBruteForceStore((s) => s.tabs);
  const bypassPatterns = useBruteForceStore((s) => s.bypassPatterns);

  const [httpTotal, setHttpTotal] = useState(0);
  const [wsTotal, setWsTotal] = useState(0);

  const mountedRef = useRef(true);

  const fetchTotals = useCallback(async () => {
    try {
      const [httpRes, wsRes] = await Promise.all([
        getHttpLogs(1, 1, undefined, 'desc'),
        getWebSocketLogs(1, 1),
      ]);
      if (mountedRef.current) {
        setHttpTotal(httpRes.total);
        setWsTotal(wsRes.total);
      }
    } catch {
      // Backend may not be available yet
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkProxyStatus();
    fetchTotals();

    const interval = setInterval(fetchTotals, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkProxyStatus, fetchTotals]);

  const liveTraffic: LiveTrafficSummary = {
    proxyStatus,
    proxyPort,
    httpTotalCalls: httpTotal,
    wsConnectionCount: wsTotal,
    activeTargets: targets.filter((t) => t.tabActive).length,
    totalTargets: targets.length,
  };

  const bruteForce: BruteForceSummary = {
    tabsOpen: bruteForceTabs.length,
    attacksRunning: bruteForceTabs.filter((t) => t.isRunning).length,
    totalResults: bruteForceTabs.reduce((sum, t) => sum + t.results.length, 0),
    bypassPatterns: bypassPatterns.length,
  };

  const repeater: RepeaterSummary = {
    httpTabs: repeaterTabs.filter((t) => t.mode === 'http').length,
    wsTabs: repeaterTabs.filter((t) => t.mode === 'websocket').length,
    tabsWithResponses: repeaterTabs.filter((t) => t.response !== null).length,
    activeWsConnections: repeaterTabs.filter((t) => t.wsConnected).length,
  };

  return { liveTraffic, bruteForce, repeater };
}
