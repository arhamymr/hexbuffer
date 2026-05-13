import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { ApiCall } from '@/types';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

interface ProxyState {
  status: ProxyStatus;
  port: number;
  calls: ApiCall[];
  startProxy: () => Promise<void>;
  setStatus: (status: ProxyStatus) => void;
  setCalls: (calls: ApiCall[]) => void;
  clearCalls: () => void;
}

export const useProxyStore = create<ProxyState>()(
  persist(
    (set) => ({
      status: 'disconnected',
      port: 8888,
      calls: [],

      startProxy: async () => {
        set({ status: 'starting' });
        try {
          await invoke('start_proxy', { port: 8888 });
          set({ status: 'connected' });
        } catch (error) {
          console.error('Failed to start proxy:', error);
          set({ status: 'disconnected' });
        }
      },

      setStatus: (status) => set({ status }),
      setCalls: (calls) => set({ calls }),
      clearCalls: () => set({ calls: [] }),
    }),
    {
      name: 'apprecon-proxy',
      partialize: (state) => ({ calls: state.calls, port: state.port }),
    }
  )
);