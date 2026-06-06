import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export type LicenseStatus = 'free' | 'lifetime';

export interface LicenseInfo {
  key: string;
  plan: string;
  activated_at: string;
}

export interface LicenseState {
  licenseKey: string | null;
  status: LicenseStatus;
  activating: boolean;
  verifying: boolean;
  activate: (key: string) => Promise<void>;
  deactivate: () => Promise<void>;
  verifyOnStartup: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>()(
  persist<LicenseState, [], [], Pick<LicenseState, 'licenseKey' | 'status'>>(
    (set, get) => ({
      licenseKey: null,
      status: 'free' as LicenseStatus,
      activating: false,
      verifying: false,

      activate: async (key: string) => {
        set({ activating: true });
        try {
          const info = await invoke<LicenseInfo>('activate_license', { key });
          set({
            licenseKey: info.key,
            status: 'lifetime',
            activating: false,
          });
          toast.success('License activated', {
            description: 'Your lifetime license is now active.',
          });
        } catch (error) {
          set({ activating: false });
          toast.error('Failed to activate license', {
            description: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      deactivate: async () => {
        const { licenseKey } = get();
        if (!licenseKey) return;

        try {
          await invoke('deactivate_license', { key: licenseKey });
          set({ licenseKey: null, status: 'free' });
          toast.success('License deactivated', {
            description: 'You are now using the free evaluation.',
          });
        } catch (error) {
          toast.error('Failed to deactivate license', {
            description: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      verifyOnStartup: async () => {
        const { licenseKey } = get();
        if (!licenseKey) return;

        set({ verifying: true });
        try {
          const info = await invoke<LicenseInfo>('verify_license', { key: licenseKey });
          set({
            licenseKey: info.key,
            status: 'lifetime',
            verifying: false,
          });
        } catch {
          // If verification fails (offline, server error), keep last known status
          set({ verifying: false });
        }
      },
    }),
    {
      name: '0xbuffer-license',
      partialize: (state) => ({
        licenseKey: state.licenseKey,
        status: state.status,
      }),
    }
  )
);
