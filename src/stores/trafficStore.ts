import { create } from 'zustand';
import type { ApiCall, ProxyConnection } from '@/types';

export interface ProxyLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  connection_id: string;
  host: string;
  port: number;
  target_id: string;
  method: string | null;
  url: string | null;
  status: number | null;
  status_text: string | null;
  headers: [string, string][];
  body: string | null;
  body_size: number;
  curl: string | null;
  request_headers: [string, string][] | null;
  request_body: string | null;
  request_body_size: number | null;
  response_headers: [string, string][] | null;
  response_body: string | null;
  response_body_size: number | null;
  content_type: string | null;
  client_addr: string;
  duration_ms: number | null;
  client_bytes: number;
  server_bytes: number;
}

export interface DebugLog {
  id: string;
  timestamp: number;
  type: 'proxy-log' | 'connection' | 'connection-close' | 'error';
  data: unknown;
}

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

function deduplicateLogs(logs: DebugLog[], entry: ProxyLogEntry): DebugLog[] {
  const existingIndex = logs.findIndex((l) => l.id === entry.id);
  if (existingIndex >= 0) {
    const updated = [...logs];
    updated[existingIndex] = {
      id: entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp:
        typeof entry.timestamp === 'string'
          ? new Date(entry.timestamp).getTime()
          : (entry.timestamp as unknown as number) || Date.now(),
      type: 'proxy-log',
      data: entry,
    };
    return updated;
  }
  return logs;
}

export const useTrafficStore = create<TrafficState>((set) => ({
  calls: [],
  connections: [],
  logs: [],

  addCall: (call) =>
    set((state) => {
      const existingIndex = state.calls.findIndex((c) => c.id === call.id);
      if (existingIndex >= 0) {
        const updated = [...state.calls];
        updated[existingIndex] = call;
        return { calls: updated };
      }
      return { calls: [call, ...state.calls].slice(0, MAX_CALLS) };
    }),

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
      const updatedLogs = deduplicateLogs(state.logs, entry);
      return { logs: updatedLogs.slice(0, MAX_LOGS) };
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