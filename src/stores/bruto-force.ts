import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import type {
  AttackConfig,
  AttackProgress,
  AttackResult,
  AttackMode,
  PayloadType,
  PayloadProcessingStep,
} from '@/pages/brute-force/types';
import { createDefaultAttackConfig } from '@/pages/brute-force/types';

export interface BruteForceTab {
  id: string;
  name: string;
  config: AttackConfig;
  results: AttackResult[];
  isRunning: boolean;
  attackId: string | null;
  progress: { current: number; total: number } | null;
  selectedResult: AttackResult | null;
  startError: string | null;
}

interface BruteForceState {
  tabs: BruteForceTab[];
  activeTabId: string;
  nextAttackTabNumber: number;
  pendingRequest: AttackConfig['base_request'] | null;

  setActiveTabId: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  addAttackTab: (config?: AttackConfig) => string;
  closeTab: (id: string) => void;
  updateConfig: (updates: Partial<AttackConfig>) => void;
  updateAttackMode: (mode: AttackMode) => void;
  updatePayloadType: (payload_type: PayloadType) => void;
  updatePayloadValues: (values: string[]) => void;
  updateNumberRange: (updates: {
    number_start?: number;
    number_end?: number;
    number_step?: number;
    number_format?: string;
  }) => void;
  addProcessingStep: (step: PayloadProcessingStep) => void;
  removeProcessingStep: (index: number) => void;
  updateGrepMatch: (enabled: boolean, keyword?: string, case_sensitive?: boolean) => void;
  updateGrepExtract: (enabled: boolean, regex?: string, replacement?: string) => void;
  updateSessionHandling: (
    enabled: boolean,
    extract_token_name?: string,
    update_header_name?: string,
    extract_from_response?: string
  ) => void;
  setBaseRequest: (base_request: AttackConfig['base_request']) => void;
  setSelectedResult: (result: AttackResult | null) => void;
  setPendingRequest: (request: AttackConfig['base_request'] | null) => void;

  startAttack: () => Promise<void>;
  stopAttack: () => Promise<void>;
  clearResults: () => void;
  clearStartError: () => void;
}

const unlistenProgressByTab = new Map<string, UnlistenFn>();
const unlistenResultByTab = new Map<string, UnlistenFn>();

function createAttackTab(index: number, config = createDefaultAttackConfig()): BruteForceTab {
  return {
    id: `brute-force-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: String(index),
    config: {
      ...config,
      name: config.name === 'New Attack' ? `Attack ${index}` : config.name,
    },
    results: [],
    isRunning: false,
    attackId: null,
    progress: null,
    selectedResult: null,
    startError: null,
  };
}

const initialTab = createAttackTab(1);

function cleanupTabListeners(tabId: string) {
  unlistenProgressByTab.get(tabId)?.();
  unlistenResultByTab.get(tabId)?.();
  unlistenProgressByTab.delete(tabId);
  unlistenResultByTab.delete(tabId);
}

function getActiveTab(state: BruteForceState) {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0] ?? null;
}

function updateActiveTab(
  set: (partial: Partial<BruteForceState> | ((state: BruteForceState) => Partial<BruteForceState>)) => void,
  updater: (tab: BruteForceTab) => BruteForceTab
) {
  set((state) => ({
    tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? updater(tab) : tab)),
  }));
}

export const useBruteForceStore = create<BruteForceState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  nextAttackTabNumber: 2,
  pendingRequest: null,

  setActiveTabId: (id) => set({ activeTabId: id }),
  renameTab: (id, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
    })),
  addAttackTab: (config) => {
    const { nextAttackTabNumber } = get();
    const newTab = createAttackTab(nextAttackTabNumber, config);

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      nextAttackTabNumber: state.nextAttackTabNumber + 1,
    }));

    return newTab.id;
  },
  closeTab: (id) =>
    set((state) => {
      cleanupTabListeners(id);
      const remainingTabs = state.tabs.filter((tab) => tab.id !== id);

      if (remainingTabs.length === 0) {
        const replacementTab = createAttackTab(1);
        return {
          tabs: [replacementTab],
          activeTabId: replacementTab.id,
          nextAttackTabNumber: 2,
        };
      }

      if (state.activeTabId !== id) {
        return { tabs: remainingTabs };
      }

      const closedTabIndex = state.tabs.findIndex((tab) => tab.id === id);
      const nextActiveTab = remainingTabs[Math.max(0, closedTabIndex - 1)] ?? remainingTabs[0];
      return {
        tabs: remainingTabs,
        activeTabId: nextActiveTab.id,
      };
    }),

  updateConfig: (updates) =>
    updateActiveTab(set, (tab) => ({ ...tab, config: { ...tab.config, ...updates } })),

  updateAttackMode: (mode) =>
    updateActiveTab(set, (tab) => ({ ...tab, config: { ...tab.config, mode } })),

  updatePayloadType: (payload_type) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        payload_config: { ...tab.config.payload_config, payload_type },
      },
    })),

  updatePayloadValues: (values) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        payload_config: { ...tab.config.payload_config, values },
      },
    })),

  updateNumberRange: (updates) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        payload_config: { ...tab.config.payload_config, ...updates },
      },
    })),

  addProcessingStep: (step) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        payload_config: {
          ...tab.config.payload_config,
          processing: [...tab.config.payload_config.processing, step],
        },
      },
    })),

  removeProcessingStep: (index) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        payload_config: {
          ...tab.config.payload_config,
          processing: tab.config.payload_config.processing.filter((_, i) => i !== index),
        },
      },
    })),

  updateGrepMatch: (enabled, keyword, case_sensitive) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        grep_match: {
          ...tab.config.grep_match,
          enabled,
          ...(keyword !== undefined && { keyword }),
          ...(case_sensitive !== undefined && { case_sensitive }),
        },
      },
    })),

  updateGrepExtract: (enabled, regex, replacement) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        grep_extract: {
          ...tab.config.grep_extract,
          enabled,
          ...(regex !== undefined && { regex }),
          ...(replacement !== undefined && { replacement }),
        },
      },
    })),

  updateSessionHandling: (enabled, extract_token_name, update_header_name, extract_from_response) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      config: {
        ...tab.config,
        session_handling: {
          ...tab.config.session_handling,
          enabled,
          ...(extract_token_name !== undefined && { extract_token_name }),
          ...(update_header_name !== undefined && { update_header_name }),
          ...(extract_from_response !== undefined && { extract_from_response }),
        },
      },
    })),

  setBaseRequest: (base_request) =>
    updateActiveTab(set, (tab) => ({ ...tab, config: { ...tab.config, base_request } })),

  setSelectedResult: (result) => updateActiveTab(set, (tab) => ({ ...tab, selectedResult: result })),
  setPendingRequest: (request) => set({ pendingRequest: request }),

  startAttack: async () => {
    const tab = getActiveTab(get());
    if (!tab) return;

    if (!tab.config.base_request.url) {
      const message = 'Base request URL is required';
      updateActiveTab(set, (currentTab) =>
        currentTab.id === tab.id ? { ...currentTab, startError: message } : currentTab
      );
      toast.error(message);
      return;
    }

    cleanupTabListeners(tab.id);

    try {
      const id = await invoke<string>('start_intruder_attack', { config: tab.config });
      set((state) => ({
        tabs: state.tabs.map((currentTab) =>
          currentTab.id === tab.id
            ? {
                ...currentTab,
                attackId: id,
                isRunning: true,
                results: [],
                progress: null,
                selectedResult: null,
                startError: null,
              }
            : currentTab
        ),
      }));

      const unlistenProgress = await listen<AttackProgress>(`intruder-progress-${id}`, (event) => {
        const p = event.payload;
        set((state) => ({
          tabs: state.tabs.map((currentTab) => {
            if (currentTab.id !== tab.id) return currentTab;

            if (p.type === 'Update' && p.current !== undefined && p.total !== undefined) {
              return { ...currentTab, progress: { current: p.current, total: p.total } };
            }

            if (p.type === 'Complete') {
              return { ...currentTab, isRunning: false, progress: null, attackId: null };
            }

            return currentTab;
          }),
        }));
      });

      const unlistenResult = await listen<AttackResult>(`intruder-result-${id}`, (event) => {
        set((state) => ({
          tabs: state.tabs.map((currentTab) =>
            currentTab.id === tab.id
              ? { ...currentTab, results: [...currentTab.results, event.payload] }
              : currentTab
          ),
        }));
      });

      unlistenProgressByTab.set(tab.id, unlistenProgress);
      unlistenResultByTab.set(tab.id, unlistenResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to start attack:', error);
      set((state) => ({
        tabs: state.tabs.map((currentTab) =>
          currentTab.id === tab.id
            ? { ...currentTab, isRunning: false, startError: message }
            : currentTab
        ),
      }));
      toast.error(message || 'Failed to start attack');
    }
  },

  stopAttack: async () => {
    const tab = getActiveTab(get());
    if (!tab?.attackId) return;

    try {
      await invoke('stop_intruder_attack', { attackId: tab.attackId });
    } catch (error) {
      console.error('Failed to stop attack:', error);
    } finally {
      cleanupTabListeners(tab.id);
      set((state) => ({
        tabs: state.tabs.map((currentTab) =>
          currentTab.id === tab.id
            ? { ...currentTab, isRunning: false, attackId: null }
            : currentTab
        ),
      }));
    }
  },

  clearResults: () =>
    updateActiveTab(set, (tab) => ({ ...tab, results: [], selectedResult: null })),
  clearStartError: () => updateActiveTab(set, (tab) => ({ ...tab, startError: null })),
}));
