'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { useInspectorStore } from '@/stores/inspector';
import { useAppStore, getEffectiveProxyPort } from '@/stores/app';
import {
  connectInspectorCdp,
  disconnectInspectorCdp,
  resetInspectorBrowser,
} from '../api';
import { DEFAULT_DEBUGGING_PORT } from '../constants';
import type { InspectorConsoleLog } from '../types';

export function useInspectorPage() {
  // ── Local UI state ─────────────────────────────────────────────
  const [isConnecting, setIsConnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Store selectors ────────────────────────────────────────────
  const isConnected = useInspectorStore((state) => state.isConnected);
  const setConnected = useInspectorStore((state) => state.setConnected);
  const logs = useInspectorStore((state) => state.logs);
  const selectedLogId = useInspectorStore((state) => state.selectedLogId);
  const setSelectedLogId = useInspectorStore((state) => state.setSelectedLogId);
  const activeTab = useInspectorStore((state) => state.activeTab);
  const setActiveTab = useInspectorStore((state) => state.setActiveTab);
  const networkEntries = useInspectorStore((state) => state.networkEntries);
  const selectedNetworkId = useInspectorStore((state) => state.selectedNetworkId);
  const addConsoleLog = useInspectorStore((state) => state.addConsoleLog);

  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);

  // ── Derived values ─────────────────────────────────────────────
  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });

  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId]
  );

  const selectedNetwork = useMemo(
    () => networkEntries.find((e) => e.id === selectedNetworkId) ?? null,
    [networkEntries, selectedNetworkId]
  );

  // ── Callbacks ──────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connectInspectorCdp(DEFAULT_DEBUGGING_PORT);
      toast.success('Connected to browser DevTools');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect';
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectInspectorCdp();
      setConnected(false);
      toast.success('Disconnected from browser');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to disconnect';
      toast.error(msg);
    }
  }, [setConnected]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await disconnectInspectorCdp();
      setConnected(false);
      await resetInspectorBrowser(DEFAULT_DEBUGGING_PORT, activeProxyPort);
      await connectInspectorCdp(DEFAULT_DEBUGGING_PORT);
      toast.success('Browser reset');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to reset browser';
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  }, [setConnected, activeProxyPort]);

  const handleSelectLog = useCallback((log: InspectorConsoleLog) => {
    setSelectedLogId(log.id);
  }, [setSelectedLogId]);

  // ── Tauri event listeners ──────────────────────────────────────
  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      try {
        unlisteners.push(
          await listen<InspectorConsoleLog>('inspector:console-log', (event) => {
            addConsoleLog(event.payload);
          })
        );
        unlisteners.push(
          await listen<boolean>('inspector:connected', (event) => {
            if (mounted) {
              setConnected(event.payload);
            }
          })
        );
      } catch (error) {
        if (mounted) {
          console.warn(
            '[inspector] Tauri event listeners unavailable in this runtime.',
            error
          );
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [addConsoleLog, setConnected]);

  // ── Return consumed by page entry ──────────────────────────────
  return {
    // connection
    isConnected,
    isConnecting,
    isResetting,
    // sidebar
    sidebarOpen,
    setSidebarOpen,
    // tabs
    activeTab,
    setActiveTab,
    // port
    activeProxyPort,
    // logs
    logs,
    selectedLogId,
    selectedLog,
    handleSelectLog,
    // network
    networkEntries,
    selectedNetworkId,
    selectedNetwork,
    // actions
    handleConnect,
    handleDisconnect,
    handleReset,
  };
}
