import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMockForgeStore } from '@/stores/mock-forge';
import { MOCK_DOMAINS, MOCK_LOGS, MOCK_ROUTES } from '../mock-data';
import type { MockDomain, MockRoute, RequestLog } from '../types';

// ponytail: USE_MOCK flag — swap for real Tauri IPC later
const USE_MOCK = true;

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
    if (USE_MOCK) {
      setDomains(MOCK_DOMAINS);
      setRoutes(MOCK_ROUTES);
      setLogs(MOCK_LOGS);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDomain = useCallback((id: string) => {
    setDomains(
      domains.map((d) =>
        d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
      )
    );
  }, [domains, setDomains]);

  const addDomain = useCallback((hostname: string, ssl: boolean) => {
    const domain: MockDomain = {
      id: `d${Date.now()}`,
      hostname,
      ssl,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setDomains([...domains, domain]);
    return domain;
  }, [domains, setDomains]);

  const deleteDomain = useCallback((id: string) => {
    setDomains(domains.filter((d) => d.id !== id));
    setRoutes(routes.filter((r) => r.domainId !== id));
    if (selectedDomainId === id) setSelectedDomainId(null);
  }, [domains, routes, selectedDomainId, setDomains, setRoutes, setSelectedDomainId]);

  const addRoute = useCallback((route: Omit<MockRoute, 'id'>) => {
    const r: MockRoute = { ...route, id: `r${Date.now()}` };
    setRoutes([...routes, r]);
    return r;
  }, [routes, setRoutes]);

  const updateRoute = useCallback((id: string, patch: Partial<MockRoute>) => {
    setRoutes(routes.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, [routes, setRoutes]);

  const deleteRoute = useCallback((id: string) => {
    setRoutes(routes.filter((r) => r.id !== id));
    if (selectedRouteId === id) setSelectedRouteId(null);
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
