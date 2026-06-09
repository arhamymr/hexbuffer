import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import type { InspectorConsoleLog, ConsoleFilterLevel } from '@/pages/inspector/types';

interface InspectorState {
  logs: InspectorConsoleLog[];
  filter: ConsoleFilterLevel;
  isConnected: boolean;
  search: string;
  selectedLogId: string | null;
  listenersInitialized: boolean;
  addConsoleLog: (log: InspectorConsoleLog) => void;
  clearLogs: () => void;
  setFilter: (filter: ConsoleFilterLevel) => void;
  setConnected: (connected: boolean) => void;
  setSearch: (search: string) => void;
  setSelectedLogId: (id: string | null) => void;
  initListeners: () => void;
}

export const useInspectorStore = create<InspectorState>()((set, get) => ({
  logs: [],
  filter: 'all',
  isConnected: false,
  search: '',
  selectedLogId: null,
  listenersInitialized: false,

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

  initListeners: () => {
    if (get().listenersInitialized) return;
    set({ listenersInitialized: true });

    const add = get().addConsoleLog;
    const connected = get().setConnected;

    listen<InspectorConsoleLog>('inspector:console-log', (event) => {
      add(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register console-log listener:', err);
    });

    listen<boolean>('inspector:connected', (event) => {
      connected(event.payload);
    }).catch((err) => {
      console.warn('[inspector] Failed to register connected listener:', err);
    });
  },
}));
