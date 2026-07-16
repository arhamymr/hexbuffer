// ponytail: simple persisted Zustand store for OpenVPN configurations, override options, and logs.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { toast } from 'sonner';

export type VpnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface VpnState {
  status: VpnStatus;
  error: string | null;
  configPath: string | null;
  access: string;
  server: string;
  protocol: string;
  port: number;
  logs: string[];
  username: string;
  password: string;
  showCredentials: boolean;

  setConfigPath: (path: string | null) => void;
  setAccess: (access: string) => void;
  setServer: (server: string) => void;
  setProtocol: (protocol: string) => void;
  setPort: (port: number) => void;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  setShowCredentials: (show: boolean) => void;
  clearLogs: () => void;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  initListeners: () => Promise<void>;
}

let unlistenLog: UnlistenFn | null = null;
let unlistenStatus: UnlistenFn | null = null;

export const useVpnStore = create<VpnState>()(
  persist<VpnState, [], [], Omit<VpnState, 'status' | 'logs' | 'error' | 'connect' | 'disconnect' | 'fetchStatus' | 'initListeners'>>(
    (set, get) => ({
      status: 'disconnected',
      error: null,
      configPath: null,
      access: 'Default',
      server: '',
      protocol: 'udp',
      port: 1337,
      logs: [],
      username: '',
      password: '',
      showCredentials: false,

      setConfigPath: (configPath) => set({ configPath }),
      setAccess: (access) => set({ access }),
      setServer: (server) => set({ server }),
      setProtocol: (protocol) => set({ protocol }),
      setPort: (port) => set({ port }),
      setUsername: (username) => set({ username }),
      setPassword: (password) => set({ password }),
      setShowCredentials: (showCredentials) => set({ showCredentials }),

      clearLogs: () => set({ logs: [] }),

      connect: async () => {
        const { configPath, server, port, protocol, access, username, password } = get();
        if (!configPath) {
          toast.error('Please select an OpenVPN configuration file first.');
          return;
        }

        set({ status: 'connecting', error: null, logs: [] });

        try {
          await invoke('start_vpn', {
            configPath,
            server: server || null,
            port: port || null,
            protocol: protocol || null,
            access: access || null,
            username: username || null,
            password: password || null,
          });
        } catch (e: any) {
          console.error(e);
          set({ status: 'error', error: e.toString() });
          toast.error(e.toString() || 'Failed to start VPN');
        }
      },

      disconnect: async () => {
        try {
          await invoke('stop_vpn');
        } catch (e: any) {
          console.error(e);
          toast.error(e.toString() || 'Failed to stop VPN');
        }
      },

      fetchStatus: async () => {
        try {
          const res = await invoke<{ status: VpnStatus; logs: string[] }>('get_vpn_status');
          set({ status: res.status, logs: res.logs });
        } catch (e) {
          console.error('Failed to fetch VPN status', e);
        }
      },

      initListeners: async () => {
        if (unlistenLog && unlistenStatus) return;

        unlistenLog = await listen<string>('vpn:log', (event) => {
          set((state) => ({ logs: [...state.logs, event.payload] }));
        });

        unlistenStatus = await listen<{ status: VpnStatus; error: string | null }>('vpn:status', (event) => {
          set({ status: event.payload.status, error: event.payload.error });
          if (event.payload.status === 'connected') {
            toast.success('VPN connected successfully');
          } else if (event.payload.status === 'error') {
            toast.error(event.payload.error || 'VPN connection failed');
          } else if (event.payload.status === 'disconnected') {
            toast.info('VPN disconnected');
          }
        });
      },
    }),
    {
      name: 'vpn-store-persistent',
      partialize: (state) => ({
        configPath: state.configPath,
        access: state.access,
        server: state.server,
        protocol: state.protocol,
        port: state.port,
        username: state.username,
        password: state.password,
        showCredentials: state.showCredentials,
      }),
    }
  )
);
