import {
  DEFAULT_AUTOMATION_SETTINGS,
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

export interface LiveTrafficSlice {
  liveTrafficHostInsights: LiveTrafficHostInsight[];
  liveTrafficCapturedHosts: LiveTrafficHostInsight[];
  liveTrafficQueueStatsByTriggerId: Record<string, LiveTrafficQueueStats>;
  automationSettings: AutomationRuntimeSettings;

  appendLiveTrafficHostInsight: (insight: NewLiveTrafficHostInsight) => void;
  appendLiveTrafficCapturedHost: (insight: NewLiveTrafficHostInsight) => void;
  removeLiveTrafficHostInsight: (id: string) => void;
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
  liveTrafficQueueStatsByTriggerId: {},
  automationSettings: DEFAULT_AUTOMATION_SETTINGS,

  appendLiveTrafficHostInsight: (insight) => {
    const matchedAt = insight.matchedAt ?? new Date().toISOString();
    const nextInsight: LiveTrafficHostInsight = {
      ...insight,
      id: insight.id ?? crypto.randomUUID(),
      matchedAt,
    };
    set((state) => ({
      liveTrafficHostInsights: capLiveTrafficHostInsights([
        ...state.liveTrafficHostInsights,
        nextInsight,
      ]),
    }));
  },

  appendLiveTrafficCapturedHost: (insight) => {
    const matchedAt = insight.matchedAt ?? new Date().toISOString();
    const nextInsight: LiveTrafficHostInsight = {
      ...insight,
      id: insight.id ?? crypto.randomUUID(),
      matchedAt,
    };
    set((state) => ({
      liveTrafficCapturedHosts: capLiveTrafficHostInsights([
        ...state.liveTrafficCapturedHosts,
        nextInsight,
      ]),
    }));
  },

  removeLiveTrafficHostInsight: (id) => set((state) => ({
    liveTrafficHostInsights: state.liveTrafficHostInsights.filter((item) => item.id !== id),
  })),

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

  clearLiveTrafficHostInsights: (triggerNodeId) => set((state) => ({
    liveTrafficHostInsights: triggerNodeId
      ? state.liveTrafficHostInsights.filter((item) => item.triggerNodeId !== triggerNodeId)
      : [],
  })),

  clearLiveTrafficCapturedHosts: (triggerNodeId) => set((state) => ({
    liveTrafficCapturedHosts: triggerNodeId
      ? state.liveTrafficCapturedHosts.filter((item) => item.triggerNodeId !== triggerNodeId)
      : [],
  })),

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
