import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { NetworkCaptureConfig } from '@/pages/packet-capture/types';

interface PacketCaptureState {
  savedNetworkConfig: NetworkCaptureConfig | null;
  savedInterfaceId: string | null;
  setSavedNetworkConfig: (config: NetworkCaptureConfig) => void;
  clearSavedNetworkConfig: () => void;
}

export const usePacketCaptureStore = create<PacketCaptureState>()(
  persist(
    (set) => ({
      savedNetworkConfig: null,
      savedInterfaceId: null,
      setSavedNetworkConfig: (config) =>
        set({
          savedNetworkConfig: config,
          savedInterfaceId: config.interfaceId,
        }),
      clearSavedNetworkConfig: () =>
        set({
          savedNetworkConfig: null,
          savedInterfaceId: null,
        }),
    }),
    {
      name: '0xbufferr-packet-capture',
    }
  )
);