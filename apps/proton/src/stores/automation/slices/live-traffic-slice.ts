import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  LIVE_TRAFFIC_CAPTURED_HOST_UI_LIMIT,
  LIVE_TRAFFIC_QUEUED_HOST_UI_LIMIT,
  capLiveTrafficHostInsights,
  normalizeAutomationSettings,
} from '../constants';
import type {
  AutomationState,
  AutomationRuntimeSettings,
  LiveTrafficHostInsight,
  LiveTrafficQueueStats,
  NewLiveTrafficHostInsight,
} from '../types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface LiveTrafficSlice {
  liveTrafficHostInsights: LiveTrafficHostInsight[];
  liveTrafficCapturedHosts: LiveTrafficHostInsight[];
  liveTrafficPreviewByTriggerId: Record<string, LiveTrafficHostInsight[]>;
  liveTrafficCapturedPreviewByTriggerId: Record<string, LiveTrafficHostInsight[]>;
  liveTrafficQueueStatsByTriggerId: Record<string, LiveTrafficQueueStats>;
  automationSettings: AutomationRuntimeSettings;

  appendLiveTrafficHostInsight: (insight: NewLiveTrafficHostInsight) => void;
  appendLiveTrafficHostInsights: (insights: NewLiveTrafficHostInsight[]) => void;
  appendLiveTrafficCapturedHost: (insight: NewLiveTrafficHostInsight) => void;
  appendLiveTrafficCapturedHosts: (insights: NewLiveTrafficHostInsight[]) => void;
  removeLiveTrafficHostInsight: (id: string) => void;
  removeLiveTrafficHostInsights: (ids: string[]) => void;
  setLiveTrafficQueueStats: (triggerNodeId: string, stats: LiveTrafficQueueStats) => void;
  incrementLiveTrafficDropped: (triggerNodeId: string, cap: number) => void;
  clearLiveTrafficHostInsights: (triggerNodeId?: string) => void;
  clearLiveTrafficCapturedHosts: (triggerNodeId?: string) => void;
  updateAutomationSettings: (settings: Partial<AutomationRuntimeSettings>) => void;
  resetAutomationSettings: () => void;
}

export const createLiveTrafficSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  _get: () => AutomationState
): LiveTrafficSlice => ({
  liveTrafficHostInsights: [],
  liveTrafficCapturedHosts: [],
  liveTrafficPreviewByTriggerId: {},
  liveTrafficCapturedPreviewByTriggerId: {},
  liveTrafficQueueStatsByTriggerId: {},
  automationSettings: DEFAULT_AUTOMATION_SETTINGS,

  appendLiveTrafficHostInsight: (insight) => {
    _get().appendLiveTrafficHostInsights([insight]);
  },

  appendLiveTrafficHostInsights: (insights) => {
    if (insights.length === 0) return;
    const now = new Date().toISOString();
    const nextInsights: LiveTrafficHostInsight[] = insights.map((insight) => ({
      ...insight,
      id: insight.id ?? crypto.randomUUID(),
      matchedAt: insight.matchedAt ?? now,
    }));
    set((state) => ({
      liveTrafficHostInsights: capLiveTrafficHostInsights(
        dedupeById([...state.liveTrafficHostInsights, ...nextInsights]),
        LIVE_TRAFFIC_QUEUED_HOST_UI_LIMIT
      ),
      liveTrafficPreviewByTriggerId: appendInsightsByTrigger(
        state.liveTrafficPreviewByTriggerId,
        nextInsights,
        20
      ),
    }));
  },

  appendLiveTrafficCapturedHost: (insight) => {
    _get().appendLiveTrafficCapturedHosts([insight]);
  },

  appendLiveTrafficCapturedHosts: (insights) => {
    if (insights.length === 0) return;
    const now = new Date().toISOString();
    const nextInsights: LiveTrafficHostInsight[] = insights.map((insight) => ({
      ...insight,
      id: insight.id ?? crypto.randomUUID(),
      matchedAt: insight.matchedAt ?? now,
    }));
    set((state) => ({
      liveTrafficCapturedHosts: capLiveTrafficHostInsights(
        dedupeById([...state.liveTrafficCapturedHosts, ...nextInsights]),
        LIVE_TRAFFIC_CAPTURED_HOST_UI_LIMIT
      ),
      liveTrafficCapturedPreviewByTriggerId: appendInsightsByTrigger(
        state.liveTrafficCapturedPreviewByTriggerId,
        nextInsights,
        40
      ),
    }));
  },

  removeLiveTrafficHostInsight: (id) => {
    _get().removeLiveTrafficHostInsights([id]);
  },

  removeLiveTrafficHostInsights: (ids) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    set((state) => ({
      liveTrafficHostInsights: state.liveTrafficHostInsights.filter((item) => !idSet.has(item.id)),
      liveTrafficPreviewByTriggerId: removeInsightsById(state.liveTrafficPreviewByTriggerId, idSet),
    }));
  },

  setLiveTrafficQueueStats: (triggerNodeId, stats) => set((state) => ({
    liveTrafficQueueStatsByTriggerId: {
      ...state.liveTrafficQueueStatsByTriggerId,
      [triggerNodeId]: stats,
    },
  })),

  incrementLiveTrafficDropped: (triggerNodeId, cap) => set((state) => {
    const current = state.liveTrafficQueueStatsByTriggerId[triggerNodeId];
    return {
      liveTrafficQueueStatsByTriggerId: {
        ...state.liveTrafficQueueStatsByTriggerId,
        [triggerNodeId]: {
          pending: current?.pending ?? 0,
          dropped: (current?.dropped ?? 0) + 1,
          lastDroppedAt: new Date().toISOString(),
          cap,
        },
      },
    };
  }),

  clearLiveTrafficHostInsights: (triggerNodeId) => set((state) => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      void invoke('automation_clear_host_insights', { triggerNodeId: triggerNodeId ?? null }).catch((error) => {
        console.error('Failed to clear automation host insights:', error);
      });
    }

    return {
      liveTrafficHostInsights: triggerNodeId
        ? state.liveTrafficHostInsights.filter((item) => item.triggerNodeId !== triggerNodeId)
        : [],
      liveTrafficPreviewByTriggerId: triggerNodeId
        ? omitKey(state.liveTrafficPreviewByTriggerId, triggerNodeId)
        : {},
    };
  }),

  clearLiveTrafficCapturedHosts: (triggerNodeId) => set((state) => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      void invoke('automation_clear_host_insights', { triggerNodeId: triggerNodeId ?? null }).catch((error) => {
        console.error('Failed to clear automation captured hosts:', error);
      });
    }

    return {
      liveTrafficCapturedHosts: triggerNodeId
        ? state.liveTrafficCapturedHosts.filter((item) => item.triggerNodeId !== triggerNodeId)
        : [],
      liveTrafficCapturedPreviewByTriggerId: triggerNodeId
        ? omitKey(state.liveTrafficCapturedPreviewByTriggerId, triggerNodeId)
        : {},
    };
  }),

  updateAutomationSettings: (settings) => set((state) => ({
    automationSettings: normalizeAutomationSettings({
      ...state.automationSettings,
      ...settings,
    }),
  })),

  resetAutomationSettings: () => set({
    automationSettings: DEFAULT_AUTOMATION_SETTINGS,
  }),
});

function appendInsightsByTrigger(
  current: Record<string, LiveTrafficHostInsight[]>,
  insights: LiveTrafficHostInsight[],
  limit: number
): Record<string, LiveTrafficHostInsight[]> {
  if (insights.length === 0) return current;
  const next = { ...current };
  for (const insight of insights) {
    const triggerInsights = next[insight.triggerNodeId] ?? [];
    next[insight.triggerNodeId] = dedupeById([...triggerInsights, insight]).slice(-limit);
  }
  return next;
}

function removeInsightsById(
  current: Record<string, LiveTrafficHostInsight[]>,
  idSet: Set<string>
): Record<string, LiveTrafficHostInsight[]> {
  const next: Record<string, LiveTrafficHostInsight[]> = {};
  for (const [triggerNodeId, insights] of Object.entries(current)) {
    const filtered = insights.filter((item) => !idSet.has(item.id));
    if (filtered.length > 0) {
      next[triggerNodeId] = filtered;
    }
  }
  return next;
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
