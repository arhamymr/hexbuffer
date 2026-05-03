import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ApiCall, ProxyConnection } from '@/types';

const MAX_CALLS = 1000;

interface TrafficState {
  calls: ApiCall[];
  filterHost: string;
  filterMethod: string;
  addHttpLog: (call: ApiCall) => void;
  setFilterHost: (host: string) => void;
  setFilterMethod: (method: string) => void;
  clearCalls: () => void;
}

export const useTrafficStore = create<TrafficState>()(
  persist(
    (set, get) => ({
      calls: [],
      filterHost: '',
      filterMethod: '',

      addHttpLog: (call) =>
        set((state) => {
          const existingIndex = state.calls.findIndex((c) => c.id === call.id);
          if (existingIndex >= 0) {
            const updated = [...state.calls];
            updated[existingIndex] = call;
            return { calls: updated };
          }
          return { calls: [call, ...state.calls].slice(0, MAX_CALLS) };
        }),

      setFilterHost: (host) => set({ filterHost: host }),
      setFilterMethod: (method) => set({ filterMethod: method }),

      clearCalls: () => set({ calls: [] }),
    }),
    {
      name: 'apprecon-traffic',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useFilteredCalls = () => {
  const { calls, filterHost, filterMethod } = useTrafficStore();
  return calls.filter((c) => {
    const hostMatch = !filterHost || c.host.includes(filterHost);
    const methodMatch = !filterMethod || c.method === filterMethod;
    return hostMatch && methodMatch;
  });
};