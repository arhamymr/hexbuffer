import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import type {
  InspectorConsoleLog,
  ConsoleFilterLevel,
  InspectorPageInfo,
  InspectorNetworkEntry,
  InspectorCookie,
  InspectorStorageEntry,
  InspectorTab,
} from '@/pages/inspector/types';

interface InspectorState {
  logs: InspectorConsoleLog[];
  filter: ConsoleFilterLevel;
  isConnected: boolean;
  search: string;
  selectedLogId: string | null;
  listenersInitialized: boolean;
  pages: InspectorPageInfo[];
  networkEntries: InspectorNetworkEntry[];
  selectedNetworkId: string | null;
  activeTab: InspectorTab;
  selectedPageId: string | null;
  cookies: InspectorCookie[];
  storage: InspectorStorageEntry[];
  addConsoleLog: (log: InspectorConsoleLog) => void;
  clearLogs: () => void;
  setFilter: (filter: ConsoleFilterLevel) => void;
  setConnected: (connected: boolean) => void;
  setSearch: (search: string) => void;
  setSelectedLogId: (id: string | null) => void;
  setPages: (pages: InspectorPageInfo[]) => void;
  addNetworkEntry: (entry: InspectorNetworkEntry) => void;
  clearNetworkEntries: () => void;
  setSelectedNetworkId: (id: string | null) => void;
  setActiveTab: (tab: InspectorTab) => void;
  setSelectedPageId: (id: string | null) => void;
  setCookies: (cookies: InspectorCookie[]) => void;
  setStorage: (entries: InspectorStorageEntry[]) => void;
  initListeners: () => void;
}

export const useInspectorStore = create<InspectorState>()((set, get) => ({
  logs: [],
  filter: 'all',
  isConnected: false,
  search: '',
  selectedLogId: null,
  listenersInitialized: false,
  pages: [],
  networkEntries: [],
  selectedNetworkId: null,
  activeTab: 'console',
  selectedPageId: null,
  cookies: [],
  storage: [],

  addConsoleLog: (log) =>
    set((state) => {
      const last = state.logs[state.logs.length - 1];
      if (
        last &&
        last.text === log.text &&
        last.level === log.level &&
        Math.abs(last.timestamp - log.timestamp) < 1000
      ) {
        return state;
      }
      return { logs: [...state.logs.slice(-4999), log] };
    }),

  clearLogs: () => set({ logs: [] }),
  setFilter: (filter) => set({ filter }),
  setConnected: (isConnected) => set({ isConnected }),
  setSearch: (search) => set({ search }),
  setSelectedLogId: (selectedLogId) => set({ selectedLogId }),
  setPages: (pages) => set({ pages }),

  addNetworkEntry: (entry) =>
    set((state) => ({
      networkEntries: [...state.networkEntries.slice(-4999), entry],
    })),

  clearNetworkEntries: () => set({ networkEntries: [] }),
  setSelectedNetworkId: (selectedNetworkId) => set({ selectedNetworkId }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedPageId: (selectedPageId) => set({ selectedPageId }),
  setCookies: (cookies) => set({ cookies }),
  setStorage: (storage) => set({ storage }),

  initListeners: () => {
    if (get().listenersInitialized) return;
    set({ listenersInitialized: true });

    listen<InspectorConsoleLog>('inspector:console-log', (event) => {
      get().addConsoleLog(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register console-log listener:', err);
    });

    listen<boolean>('inspector:connected', (event) => {
      get().setConnected(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register connected listener:', err);
    });

    listen<InspectorPageInfo[]>('inspector:pages-updated', (event) => {
      get().setPages(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register pages-updated listener:', err);
    });

    listen<InspectorNetworkEntry>('inspector:network-entry', (event) => {
      get().addNetworkEntry(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register network-entry listener:', err);
    });
  },
}));
