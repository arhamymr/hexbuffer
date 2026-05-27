import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

interface ProxyRuntimeStatus {
  running: boolean;
  port: number | null;
  default_port: number;
  connections: number;
}

interface AppState {
  proxyStatus: ProxyStatus;
  proxyPort: number | null;
  proxyDefaultPort: number;
  setProxyStatus: (status: ProxyStatus) => void;
  startProxy: () => Promise<void>;
  checkProxyStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      proxyStatus: 'disconnected',
      proxyPort: null,
      proxyDefaultPort: 8888,

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
          set({
            proxyStatus: status.running ? 'connected' : 'disconnected',
            proxyPort: status.port,
            proxyDefaultPort: status.default_port,
          });
        } catch (error) {
          console.error('[store] Failed to start proxy:', error);
          set({ proxyStatus: 'disconnected', proxyPort: null });
        }
      },

      checkProxyStatus: async () => {
        try {
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          console.log('[store] proxy status check result:', status);
          set({
            proxyStatus: status.running ? 'connected' : 'disconnected',
            proxyPort: status.port,
            proxyDefaultPort: status.default_port,
          });
        } catch (error) {
          console.log('[store] proxy status check failed:', error);
          set({ proxyStatus: 'disconnected', proxyPort: null });
        }
      },
    }),
    {
      name: '0xbuffer-app',
      partialize: (state) => ({
        proxyStatus: state.proxyStatus,
        proxyPort: state.proxyPort,
        proxyDefaultPort: state.proxyDefaultPort,
      }),
    }
  )
);
