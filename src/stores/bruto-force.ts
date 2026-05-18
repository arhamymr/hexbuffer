import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type {
  AttackConfig,
  AttackProgress,
  AttackResult,
  AttackMode,
  PayloadType,
  PayloadProcessingStep,
} from '@/pages/brute-force/types';
import { createDefaultAttackConfig } from '@/pages/brute-force/types';

interface BruteForceState {
  config: AttackConfig;
  results: AttackResult[];
  isRunning: boolean;
  attackId: string | null;
  progress: { current: number; total: number } | null;
  selectedResult: AttackResult | null;
  pendingRequest: AttackConfig['base_request'] | null;

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
    update_header_name?: string
  ) => void;
  setBaseRequest: (base_request: AttackConfig['base_request']) => void;
  setSelectedResult: (result: AttackResult | null) => void;
  setPendingRequest: (request: AttackConfig['base_request'] | null) => void;

  startAttack: () => Promise<void>;
  stopAttack: () => Promise<void>;
  clearResults: () => void;
}

let unlistenProgress: UnlistenFn | null = null;
let unlistenResult: UnlistenFn | null = null;

export const useBruteForceStore = create<BruteForceState>((set, get) => ({
  config: createDefaultAttackConfig(),
  results: [],
  isRunning: false,
  attackId: null,
  progress: null,
  selectedResult: null,
  pendingRequest: null,

  updateConfig: (updates) =>
    set((state) => ({ config: { ...state.config, ...updates } })),

  updateAttackMode: (mode) =>
    set((state) => ({ config: { ...state.config, mode } })),

  updatePayloadType: (payload_type) =>
    set((state) => ({
      config: { ...state.config, payload_config: { ...state.config.payload_config, payload_type } },
    })),

  updatePayloadValues: (values) =>
    set((state) => ({
      config: {
        ...state.config,
        payload_config: { ...state.config.payload_config, values },
      },
    })),

  updateNumberRange: (updates) =>
    set((state) => ({
      config: {
        ...state.config,
        payload_config: { ...state.config.payload_config, ...updates },
      },
    })),

  addProcessingStep: (step) =>
    set((state) => ({
      config: {
        ...state.config,
        payload_config: {
          ...state.config.payload_config,
          processing: [...state.config.payload_config.processing, step],
        },
      },
    })),

  removeProcessingStep: (index) =>
    set((state) => ({
      config: {
        ...state.config,
        payload_config: {
          ...state.config.payload_config,
          processing: state.config.payload_config.processing.filter((_, i) => i !== index),
        },
      },
    })),

  updateGrepMatch: (enabled, keyword, case_sensitive) =>
    set((state) => ({
      config: {
        ...state.config,
        grep_match: {
          ...state.config.grep_match,
          enabled,
          ...(keyword !== undefined && { keyword }),
          ...(case_sensitive !== undefined && { case_sensitive }),
        },
      },
    })),

  updateGrepExtract: (enabled, regex, replacement) =>
    set((state) => ({
      config: {
        ...state.config,
        grep_extract: {
          ...state.config.grep_extract,
          enabled,
          ...(regex !== undefined && { regex }),
          ...(replacement !== undefined && { replacement }),
        },
      },
    })),

  updateSessionHandling: (enabled, extract_token_name, update_header_name) =>
    set((state) => ({
      config: {
        ...state.config,
        session_handling: {
          ...state.config.session_handling,
          enabled,
          ...(extract_token_name !== undefined && { extract_token_name }),
          ...(update_header_name !== undefined && { update_header_name }),
        },
      },
    })),

  setBaseRequest: (base_request) =>
    set((state) => ({ config: { ...state.config, base_request } })),

  setSelectedResult: (result) => set({ selectedResult: result }),
  setPendingRequest: (request) => set({ pendingRequest: request }),

  startAttack: async () => {
    const { config } = get();
    if (!config.base_request.url) return;

    if (unlistenProgress) {
      unlistenProgress();
      unlistenProgress = null;
    }
    if (unlistenResult) {
      unlistenResult();
      unlistenResult = null;
    }

    try {
      const id = await invoke<string>('start_intruder_attack', { config });
      set({
        attackId: id,
        isRunning: true,
        results: [],
        progress: null,
        selectedResult: null,
      });

      unlistenProgress = await listen<AttackProgress>(`intruder-progress-${id}`, (event) => {
        const p = event.payload;
        if (p.type === 'Update' && p.current !== undefined && p.total !== undefined) {
          set({ progress: { current: p.current, total: p.total } });
        } else if (p.type === 'Complete') {
          set({ isRunning: false, progress: null });
        }
      });

      unlistenResult = await listen<AttackResult>(`intruder-result-${id}`, (event) => {
        set((state) => ({ results: [...state.results, event.payload] }));
      });
    } catch (error) {
      console.error('Failed to start attack:', error);
      set({ isRunning: false });
    }
  },

  stopAttack: async () => {
    const { attackId } = get();
    if (!attackId) return;

    try {
      await invoke('stop_intruder_attack', { attackId });
    } catch (error) {
      console.error('Failed to stop attack:', error);
    } finally {
      if (unlistenProgress) {
        unlistenProgress();
        unlistenProgress = null;
      }
      if (unlistenResult) {
        unlistenResult();
        unlistenResult = null;
      }
      set({ isRunning: false, attackId: null });
    }
  },

  clearResults: () => set({ results: [], selectedResult: null }),
}));