import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MockDomain, MockForgeSubTab, MockRoute, RequestLog } from '@/pages/mock-forge/types';

interface MockForgeState {
  activeSubTab: MockForgeSubTab;
  domains: MockDomain[];
  routes: MockRoute[];
  logs: RequestLog[];
  selectedDomainId: string | null;
  selectedRouteId: string | null;
  selectedLogId: string | null;

  setActiveSubTab: (tab: MockForgeSubTab) => void;
  setDomains: (domains: MockDomain[]) => void;
  setRoutes: (routes: MockRoute[]) => void;
  setLogs: (logs: RequestLog[]) => void;
  setSelectedDomainId: (id: string | null) => void;
  setSelectedRouteId: (id: string | null) => void;
  setSelectedLogId: (id: string | null) => void;
}

export const useMockForgeStore = create<MockForgeState>()(
  persist(
    (set) => ({
      activeSubTab: 'domains',
      domains: [],
      routes: [],
      logs: [],
      selectedDomainId: null,
      selectedRouteId: null,
      selectedLogId: null,

      setActiveSubTab: (tab) => set({ activeSubTab: tab }),
      setDomains: (domains) => set({ domains }),
      setRoutes: (routes) => set({ routes }),
      setLogs: (logs) => set({ logs }),
      setSelectedDomainId: (id) => set({ selectedDomainId: id }),
      setSelectedRouteId: (id) => set({ selectedRouteId: id }),
      setSelectedLogId: (id) => set({ selectedLogId: id }),
    }),
    {
      name: 'hexbuffer-mock-forge',
      partialize: (s) => ({ activeSubTab: s.activeSubTab }),
    }
  )
);
