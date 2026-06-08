import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Target } from '@/types';

interface TargetState {
  targets: Target[];
  isLoading: boolean;
  error: string | null;
  addTarget: (target: Target) => void;
  addHostTarget: (host: string) => Target | null;
  addHostsToTarget: (targetId: string, hosts: string[]) => Target | null;
  removeTarget: (targetId: string) => void;
  removeAllTargets: () => void;
  updateTarget: (targetId: string, updates: Partial<Target>) => void;
  getTarget: (targetId: string) => Target | undefined;

  getActiveTab: () => Target[] | undefined;
  removeActiveTab: (targetId: string) => void;

}

function createTargetId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `target-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeHostScope(host: string) {
  const trimmedHost = host.trim();

  if (!trimmedHost) {
    return '';
  }

  try {
    return new URL(trimmedHost).host.toLowerCase();
  } catch {
    return trimmedHost
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .replace(/\.$/, '')
      .toLowerCase();
  }
}

export const useTargetStore = create<TargetState>()(
  persist(
    (set, get) => ({
      targets: [],
      isLoading: false,
      error: null,
      addTarget: (target) => set({ targets: [...get().targets, target] }),
      addHostsToTarget: (targetId, hosts) => {
        const target = get().targets.find((t) => t.id === targetId);
        if (!target) return null;

        const normalizedHosts = hosts
          .map((h) => normalizeHostScope(h))
          .filter(Boolean);
        if (!normalizedHosts.length) return target;

        const existingSet = new Set(target.scope.map((s) => normalizeHostScope(s)).filter(Boolean));
        const newHosts = normalizedHosts.filter((h) => !existingSet.has(h));
        if (!newHosts.length) return target;

        const updated = {
          ...target,
          scope: [...target.scope, ...newHosts],
          updatedAt: new Date().toISOString(),
        };
        get().updateTarget(targetId, { scope: updated.scope });
        return updated;
      },
      addHostTarget: (host) => {
        const normalizedHost = normalizeHostScope(host);

        if (!normalizedHost) {
          return null;
        }

        const existingTarget = get().targets.find((target) =>
          target.scope.some((pattern) => normalizeHostScope(pattern) === normalizedHost)
        );

        if (existingTarget) {
          get().updateTarget(existingTarget.id, { tabActive: true });
          return { ...existingTarget, tabActive: true };
        }

        const now = new Date().toISOString();
        const target: Target = {
          id: createTargetId(),
          name: normalizedHost,
          description: '',
          scope: [normalizedHost],
          createdAt: now,
          updatedAt: now,
          tabActive: true,
        };

        set({ targets: [...get().targets, target] });
        return target;
      },
      removeTarget: (targetId) => set({ targets: get().targets.filter((t) => t.id !== targetId) }),
      removeAllTargets: () => set({ targets: [] }),
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
