import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Target } from '@/types';

interface TargetState {
  targets: Target[];
  isLoading: boolean;
  error: string | null;
  addTarget: (target: Target) => void;
  removeTarget: (targetId: string) => void;
  updateTarget: (targetId: string, updates: Partial<Target>) => void;
  getTarget: (targetId: string) => Target | undefined;

  getActiveTab: () => Target[] | undefined;
  removeActiveTab: (targetId: string) => void;

}

export const useTargetStore = create<TargetState>()(
  persist(
    (set, get) => ({
      targets: [],
      isLoading: false,
      error: null,
      addTarget: (target) => set({ targets: [...get().targets, target] }),
      removeTarget: (targetId) => set({ targets: get().targets.filter((t) => t.id !== targetId) }),
      updateTarget: (targetId, updates) => {
        const targets = get().targets.map((t) =>
          t.id === targetId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        set({ targets });
      },

      getTarget: (targetId) => {
        return get().targets.find((t) => t.id === targetId);
      },

      getActiveTab: () => {
        return get().targets.filter((t) => t.tabActive === true);
      },

      removeActiveTab: (targetId) => {
        get().updateTarget(targetId, { tabActive: false });
      }
    }),
    {
      name: '0xbuffer-targets',
      partialize: (state) => ({
        targets: state.targets,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<TargetState> | undefined;
        const persistedTargets = typedState?.targets ?? [];

        return {
          ...currentState,
          ...typedState,
          targets: persistedTargets.map((target) => ({
            ...target,
            tabActive: target.tabActive ?? false,
          })),
        };
      },
    }
  )
);
