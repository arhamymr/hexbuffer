import { create } from 'zustand';
import type { ApiCall, ProxyConnection } from '@/types';
import type { DebugLog, ProxyLogEntry } from '@/hooks/useDebugLogs';

interface TrafficState {
  calls: ApiCall[];
  connections: ProxyConnection[];
  logs: DebugLog[];
  addCall: (call: ApiCall) => void;
  setCalls: (calls: ApiCall[]) => void;
  addConnection: (conn: ProxyConnection) => void;
  updateConnection: (id: string, updates: Partial<ProxyConnection>) => void;
  addLog: (log: DebugLog) => void;
  addProxyLog: (entry: ProxyLogEntry) => void;
  removeLog: (id: string) => void;
  clearCalls: () => void;
  clearConnections: () => void;
  clearLogs: () => void;
  clearAll: () => void;
}

const MAX_CALLS = 1000;
const MAX_CONNECTIONS = 500;
const MAX_LOGS = 500;

export const useTrafficStore = create<TrafficState>((set) => ({
  calls: [],
  connections: [],
  logs: [],

  addCall: (call) =>
    set((state) => ({
      calls: [call, ...state.calls].slice(0, MAX_CALLS),
    })),

  setCalls: (calls) =>
    set({ calls: calls.slice(0, MAX_CALLS) }),

  addConnection: (conn) =>
    set((state) => {
      const existing = state.connections.findIndex((c) => c.id === conn.id);
      if (existing >= 0) {
        const updated = [...state.connections];
        updated[existing] = conn;
        return { connections: updated };
      }
      return {
        connections: [conn, ...state.connections].slice(0, MAX_CONNECTIONS),
      };
    }),

  updateConnection: (id, updates) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs].slice(0, MAX_LOGS),
    })),

  addProxyLog: (entry) =>
    set((state) => {
      const timestamp =
        typeof entry.timestamp === 'string'
          ? new Date(entry.timestamp).getTime()
          : (entry.timestamp as unknown as number) || Date.now();

      const log: DebugLog = {
        id: entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        type: 'proxy-log',
        data: entry,
      };
      return { logs: [log, ...state.logs].slice(0, MAX_LOGS) };
    }),

  removeLog: (id) =>
    set((state) => ({
      logs: state.logs.filter((log) => log.id !== id),
    })),

  clearCalls: () => set({ calls: [] }),
  clearConnections: () => set({ connections: [] }),
  clearLogs: () => set({ logs: [] }),
  clearAll: () => set({ calls: [], connections: [], logs: [] }),
}));
