import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting' | 'stopping';

interface ProxyRuntimeStatus {
  running: boolean;
  port: number | null;
  connections: number;
}

interface AppState {
  proxyStatus: ProxyStatus;
  proxyPort: number | null;
  proxyDefaultPort: number;
  invokerSafetyAlertDismissed: boolean;
  browserAutomationSafetyAlertDismissed: boolean;
  setProxyStatus: (status: ProxyStatus) => void;
  setProxyDefaultPort: (port: number) => void;
  setInvokerSafetyAlertDismissed: (dismissed: boolean) => void;
  setBrowserAutomationSafetyAlertDismissed: (dismissed: boolean) => void;
  startProxy: () => Promise<void>;
  stopProxy: () => Promise<void>;
  checkProxyStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      proxyStatus: 'disconnected',
      proxyPort: null,
      proxyDefaultPort: 8888,
      invokerSafetyAlertDismissed: false,
      browserAutomationSafetyAlertDismissed: false,

      setProxyStatus: (proxyStatus) => set({ proxyStatus }),
      setProxyDefaultPort: (proxyDefaultPort) => set({ proxyDefaultPort }),
      setInvokerSafetyAlertDismissed: (invokerSafetyAlertDismissed) =>
        set({ invokerSafetyAlertDismissed }),
      setBrowserAutomationSafetyAlertDismissed: (browserAutomationSafetyAlertDismissed) =>
        set({ browserAutomationSafetyAlertDismissed }),

      startProxy: async () => {
        console.log('[store] startProxy called');
        set({ proxyStatus: 'starting' });
        try {
          const port = useAppStore.getState().proxyDefaultPort;
          await invoke('start_proxy', { port, tlsPort: Math.min(port + 1, 65535) });
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          if (!status.running || status.port === null) {
            throw new Error(`Failed to start proxy on port ${port}`);
          }

          if (status.port !== port) {
            toast.warning(`Port ${port} is already in use. Proxy started on ${status.port}.`);
          }

          set({
            proxyStatus: 'connected',
            proxyPort: status.port,
            proxyDefaultPort: port,
          });
        } catch (error) {
          console.error('[store] Failed to start proxy:', error);
          set({ proxyStatus: 'disconnected', proxyPort: null });
          throw new Error(error instanceof Error ? error.message : String(error));
        }
      },

      stopProxy: async () => {
        console.log('[store] stopProxy called');
        set({ proxyStatus: 'stopping' });
        try {
          await invoke('stop_proxy');
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          set({
            proxyStatus: status.running ? 'connected' : 'disconnected',
            proxyPort: status.port,
          });
        } catch (error) {
          console.error('[store] Failed to stop proxy:', error);
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          set({
            proxyStatus: status.running ? 'connected' : 'disconnected',
            proxyPort: status.port,
          });
          throw error;
        }
      },

      checkProxyStatus: async () => {
        try {
          const status = await invoke<ProxyRuntimeStatus>('get_proxy_status');
          set({
            proxyStatus: status.running ? 'connected' : 'disconnected',
            proxyPort: status.port,
          });
        } catch (error) {
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
        invokerSafetyAlertDismissed: state.invokerSafetyAlertDismissed,
        browserAutomationSafetyAlertDismissed: state.browserAutomationSafetyAlertDismissed,
      }),
    }
  )
);
