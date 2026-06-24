import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';

export const MAX_PINS = 10;

interface PinnedRequestsState {
  pinnedIds: string[];
  pinnedCalls: Record<string, ApiCall>;
  togglePin: (call: ApiCall) => void;
  isPinned: (id: string) => boolean;
  unpinId: (id: string) => void;
  unpinAll: () => void;
  pinnedCount: () => number;
  getPinnedCalls: () => ApiCall[];
}

export const usePinnedRequestsStore = create<PinnedRequestsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      pinnedCalls: {},

      togglePin: (call: ApiCall) => {
        const { pinnedIds, pinnedCalls } = get();
        const alreadyPinned = pinnedIds.includes(call.id);

        if (alreadyPinned) {
          const { [call.id]: _, ...rest } = pinnedCalls;
          set({
            pinnedIds: pinnedIds.filter((pid) => pid !== call.id),
            pinnedCalls: rest,
          });
        } else {
          if (pinnedIds.length >= MAX_PINS) {
            toast.warning(`Maximum ${MAX_PINS} pins reached. Unpin a request first.`);
            return;
          }
          const wasEmpty = pinnedIds.length === 0;
          set({
            pinnedIds: [...pinnedIds, call.id],
            pinnedCalls: { ...pinnedCalls, [call.id]: call },
          });
          if (wasEmpty) {
            toast.success('Request pinned — view it in the Pinned tab');
          }
        }
      },

      isPinned: (id: string) => get().pinnedIds.includes(id),

      unpinId: (id: string) => {
        set((state) => {
          const { [id]: _, ...rest } = state.pinnedCalls;
          return {
            pinnedIds: state.pinnedIds.filter((pid) => pid !== id),
            pinnedCalls: rest,
          };
        });
      },

      unpinAll: () => set({ pinnedIds: [], pinnedCalls: {} }),

      pinnedCount: () => get().pinnedIds.length,

      getPinnedCalls: () => Object.values(get().pinnedCalls),
    }),
    {
      name: 'hexbuffer-pinned-requests',
    }
  )
);
