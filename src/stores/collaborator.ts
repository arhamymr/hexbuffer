import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CollaboratorDashboardStats,
  CollaboratorInteraction,
  CollaboratorPayload,
  CollaboratorServer,
  CollaboratorSubTab,
} from '@/pages/collaborator/types';

interface CollaboratorState {
  activeSubTab: CollaboratorSubTab;
  servers: CollaboratorServer[];
  payloads: CollaboratorPayload[];
  interactions: CollaboratorInteraction[];
  stats: CollaboratorDashboardStats;
  selectedInteractionId: string | null;
  selectedPayloadFilter: string | null;
  selectedTypeFilter: string | null;
  isPolling: boolean;
  lastPollError: string | null;

  setActiveSubTab: (tab: CollaboratorSubTab) => void;
  setServers: (servers: CollaboratorServer[]) => void;
  setPayloads: (payloads: CollaboratorPayload[]) => void;
  setInteractions: (interactions: CollaboratorInteraction[]) => void;
  setStats: (stats: CollaboratorDashboardStats) => void;
  setSelectedInteractionId: (id: string | null) => void;
  setSelectedPayloadFilter: (id: string | null) => void;
  setSelectedTypeFilter: (type: string | null) => void;
  setIsPolling: (v: boolean) => void;
  setLastPollError: (err: string | null) => void;
}

const defaultStats: CollaboratorDashboardStats = {
  activePayloads: 0,
  interactionsToday: 0,
  dnsEvents: 0,
  httpEvents: 0,
  httpsEvents: 0,
  lastCallback: null,
  connectedServers: 0,
};

export const useCollaboratorStore = create<CollaboratorState>()(
  persist(
    (set) => ({
      activeSubTab: 'payloads',
      servers: [],
      payloads: [],
      interactions: [],
      stats: defaultStats,
      selectedInteractionId: null,
      selectedPayloadFilter: null,
      selectedTypeFilter: null,
      isPolling: false,
      lastPollError: null,

      setActiveSubTab: (tab) => set({ activeSubTab: tab }),
      setServers: (servers) => set({ servers }),
      setPayloads: (payloads) => set({ payloads }),
      setInteractions: (interactions) => set({ interactions }),
      setStats: (stats) => set({ stats }),
      setSelectedInteractionId: (id) => set({ selectedInteractionId: id }),
      setSelectedPayloadFilter: (id) => set({ selectedPayloadFilter: id }),
      setSelectedTypeFilter: (type) => set({ selectedTypeFilter: type }),
      setIsPolling: (v) => set({ isPolling: v }),
      setLastPollError: (err) => set({ lastPollError: err }),
    }),
    {
      name: '0xbuffer-collaborator',
      partialize: (state) => ({
        activeSubTab: state.activeSubTab,
        servers: state.servers,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CollaboratorState>;
        const activeSubTab =
          p.activeSubTab && ['payloads', 'interactions', 'settings'].includes(p.activeSubTab)
            ? p.activeSubTab
            : 'payloads';

        return {
          ...(current as CollaboratorState),
          ...p,
          activeSubTab,
          interactions: [],
          payloads: [],
          stats: defaultStats,
          isPolling: false,
          lastPollError: null,
          selectedInteractionId: null,
        };
      },
    }
  )
);
