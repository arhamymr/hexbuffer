import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMockForgeStore } from '@/stores/mock-forge';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { MockDomain, MockRoute, RequestLog } from '../types';

export function useMockForgePage() {
  const {
    activeSubTab, setActiveSubTab,
    domains, setDomains,
    routes, setRoutes,
    logs, setLogs,
    selectedDomainId, setSelectedDomainId,
    selectedRouteId, setSelectedRouteId,
    selectedLogId, setSelectedLogId,
  } = useMockForgeStore(
    useShallow((s) => ({
      activeSubTab: s.activeSubTab, setActiveSubTab: s.setActiveSubTab,
      domains: s.domains, setDomains: s.setDomains,
      routes: s.routes, setRoutes: s.setRoutes,
      logs: s.logs, setLogs: s.setLogs,
      selectedDomainId: s.selectedDomainId, setSelectedDomainId: s.setSelectedDomainId,
      selectedRouteId: s.selectedRouteId, setSelectedRouteId: s.setSelectedRouteId,
      selectedLogId: s.selectedLogId, setSelectedLogId: s.setSelectedLogId,
    }))
  );

  useEffect(() => {
    // ponytail: load mock forge state from Rust backend
    const loadState = async () => {
      try {
        const backendDomains = await invoke<MockDomain[]>('mock_forge_get_domains');
        const backendRoutes = await invoke<MockRoute[]>('mock_forge_get_routes');
        const backendLogs = await invoke<RequestLog[]>('mock_forge_get_logs');
        setDomains(backendDomains);
        setRoutes(backendRoutes);
        setLogs(backendLogs);
      } catch (err) {
        console.error('Failed to load MockForge state from backend:', err);
      }
    };
    loadState();

    const unlistenPromise = listen<RequestLog>('mock-forge-log', (event) => {
      // Prepend new log
      const currentLogs = useMockForgeStore.getState().logs;
      setLogs([event.payload, ...currentLogs].slice(0, 200));
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [setDomains, setRoutes, setLogs]);

  const toggleDomain = useCallback(async (id: string) => {
    try {
      await invoke('mock_forge_toggle_domain', { id });
      setDomains(
        domains.map((d) =>
          d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
        )
      );
    } catch (err) {
      console.error(err);
    }
  }, [domains, setDomains]);

  const addDomain = useCallback(async (hostname: string, ssl: boolean) => {
    try {
      const domain = await invoke<MockDomain>('mock_forge_add_domain', { hostname, ssl });
      setDomains([...domains, domain]);
      return domain;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [domains, setDomains]);

  const deleteDomain = useCallback(async (id: string) => {
    try {
      await invoke('mock_forge_delete_domain', { id });
      setDomains(domains.filter((d) => d.id !== id));
      setRoutes(routes.filter((r) => r.domainId !== id));
      if (selectedDomainId === id) setSelectedDomainId(null);
    } catch (err) {
      console.error(err);
    }
  }, [domains, routes, selectedDomainId, setDomains, setRoutes, setSelectedDomainId]);

  const addRoute = useCallback(async (route: Omit<MockRoute, 'id'>) => {
    try {
      const r = await invoke<MockRoute>('mock_forge_add_route', { route });
      setRoutes([...routes, r]);
      return r;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [routes, setRoutes]);

  const updateRoute = useCallback(async (id: string, patch: Partial<MockRoute>) => {
    try {
      const current = routes.find((r) => r.id === id);
      if (!current) return;
      const updated = { ...current, ...patch } as MockRoute;
      await invoke('mock_forge_update_route', { id, patch: updated });
      setRoutes(routes.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error(err);
    }
  }, [routes, setRoutes]);

  const deleteRoute = useCallback(async (id: string) => {
    try {
      await invoke('mock_forge_delete_route', { id });
      setRoutes(routes.filter((r) => r.id !== id));
      if (selectedRouteId === id) setSelectedRouteId(null);
    } catch (err) {
      console.error(err);
    }
  }, [routes, selectedRouteId, setRoutes, setSelectedRouteId]);

  const selectedDomain = useMemo<MockDomain | null>(
    () => domains.find((d) => d.id === selectedDomainId) ?? null,
    [domains, selectedDomainId]
  );

  const selectedRoute = useMemo<MockRoute | null>(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const selectedLog = useMemo<RequestLog | null>(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId]
  );

  const domainRoutes = useMemo(
    () => (selectedDomainId ? routes.filter((r) => r.domainId === selectedDomainId) : routes),
    [routes, selectedDomainId]
  );

  return {
    activeSubTab, setActiveSubTab,
    domains, routes, logs,
    selectedDomainId, setSelectedDomainId,
    selectedRouteId, setSelectedRouteId,
    selectedLogId, setSelectedLogId,
    selectedDomain, selectedRoute, selectedLog,
    domainRoutes,
    toggleDomain, addDomain, deleteDomain,
    addRoute, updateRoute, deleteRoute,
  };
}
