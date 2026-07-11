import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ListenerDashboardStats,
  ListenerInteraction,
  ListenerPayload,
  ListenerServer,
  ListenerSubTab,
} from '@/pages/listener/types';

interface ListenerState {
  activeSubTab: ListenerSubTab;
  servers: ListenerServer[];
  payloads: ListenerPayload[];
  interactions: ListenerInteraction[];
  stats: ListenerDashboardStats;
  selectedInteractionId: string | null;
  selectedPayloadFilter: string | null;
  selectedTypeFilter: string | null;
  isPolling: boolean;
  lastPollError: string | null;
  isEnabled: boolean;
  search: string;

  setActiveSubTab: (tab: ListenerSubTab) => void;
  setServers: (servers: ListenerServer[]) => void;
  setPayloads: (payloads: ListenerPayload[]) => void;
  setInteractions: (interactions: ListenerInteraction[]) => void;
  setStats: (stats: ListenerDashboardStats) => void;
  setSelectedInteractionId: (id: string | null) => void;
  setSelectedPayloadFilter: (id: string | null) => void;
  setSelectedTypeFilter: (type: string | null) => void;
  setIsPolling: (v: boolean) => void;
  setLastPollError: (err: string | null) => void;
  setIsEnabled: (v: boolean) => void;
  setSearch: (search: string) => void;
}

const defaultStats: ListenerDashboardStats = {
  activePayloads: 0,
  interactionsToday: 0,
  dnsEvents: 0,
  httpEvents: 0,
  httpsEvents: 0,
  lastCallback: null,
  connectedServers: 0,
};

export const useListenerStore = create<ListenerState>()(
  persist(
    (set) => ({
      activeSubTab: 'hosts',
      servers: [],
      payloads: [],
      interactions: [],
      stats: defaultStats,
      selectedInteractionId: null,
      selectedPayloadFilter: null,
      selectedTypeFilter: null,
      isPolling: false,
      lastPollError: null,
      isEnabled: true,
      search: '',

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
      setIsEnabled: (v) => set({ isEnabled: v }),
      setSearch: (search) => set({ search }),
    }),
    {
      name: 'hexbuffer-listener',
      partialize: (state) => ({
        activeSubTab: state.activeSubTab,
        servers: state.servers,
        isEnabled: state.isEnabled,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ListenerState>;
        const activeSubTab =
          p.activeSubTab && ['hosts', 'interactions'].includes(p.activeSubTab)
            ? p.activeSubTab
            : 'hosts';
        const isEnabled = typeof p.isEnabled === 'boolean' ? p.isEnabled : true;

        return {
          ...(current as ListenerState),
          ...p,
          activeSubTab,
          isEnabled,
          search: '',
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
