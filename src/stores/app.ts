import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

interface ProxyRuntimeStatus {
  running: boolean;
  port: number | null;
  connections: number;
}

interface AppState {
  proxyStatus: ProxyStatus;
  setProxyStatus: (status: ProxyStatus) => void;
  startProxy: () => Promise<void>;
  checkProxyStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      proxyStatus: 'disconnected',

      setProxyStatus: (proxyStatus) => set({ proxyStatus }),

      startProxy: async () => {
        console.log('[store] startProxy called');
        set({ proxyStatus: 'starting' });
        try {
          console.log('[store] calling invoke with port=8888, tlsPort=8889');
          await invoke('start_proxy', { port: 8888, tlsPort: 8889 });
          console.log('[store] invoke completed, checking status...');
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          set({ proxyStatus: status.running ? 'connected' : 'disconnected' });
        } catch (error) {
          console.error('[store] Failed to start proxy:', error);
          set({ proxyStatus: 'disconnected' });
        }
      },

      checkProxyStatus: async () => {
        try {
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          console.log('[store] proxy status check result:', status);
          set({ proxyStatus: status.running ? 'connected' : 'disconnected' });
        } catch (error) {
          console.log('[store] proxy status check failed:', error);
          set({ proxyStatus: 'disconnected' });
        }
      },
    }),
    {
      name: '0xbuffer-app',
      partialize: (state) => ({
        proxyStatus: state.proxyStatus,
      }),
    }
  )
);
