import type { AutomationRuntimeSettings, ExecutionLog, LiveTrafficHostInsight } from './types';

export const AUTOMATION_LOG_LIMIT = 500;
export const LIVE_TRAFFIC_HOST_INSIGHT_LIMIT = 200;

export const DEFAULT_AUTOMATION_SETTINGS: AutomationRuntimeSettings = {
  liveTrafficConcurrency: 1,
  filteredTriggerQueueCap: 100,
  catchAllTriggerQueueCap: 25,
  recentMatchDedupeTtlMs: 2000,
};

export const AUTOMATION_SETTINGS_LIMITS = {
  liveTrafficConcurrency: { min: 1, max: 8 },
  filteredTriggerQueueCap: { min: 1, max: 1000 },
  catchAllTriggerQueueCap: { min: 1, max: 250 },
  recentMatchDedupeTtlMs: { min: 0, max: 10000 },
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

export function normalizeAutomationSettings(
  settings: Partial<AutomationRuntimeSettings> | null | undefined
): AutomationRuntimeSettings {
  return {
    liveTrafficConcurrency: clampNumber(
      settings?.liveTrafficConcurrency,
      AUTOMATION_SETTINGS_LIMITS.liveTrafficConcurrency.min,
      AUTOMATION_SETTINGS_LIMITS.liveTrafficConcurrency.max,
      DEFAULT_AUTOMATION_SETTINGS.liveTrafficConcurrency
    ),
    filteredTriggerQueueCap: clampNumber(
      settings?.filteredTriggerQueueCap,
      AUTOMATION_SETTINGS_LIMITS.filteredTriggerQueueCap.min,
      AUTOMATION_SETTINGS_LIMITS.filteredTriggerQueueCap.max,
      DEFAULT_AUTOMATION_SETTINGS.filteredTriggerQueueCap
    ),
    catchAllTriggerQueueCap: clampNumber(
      settings?.catchAllTriggerQueueCap,
      AUTOMATION_SETTINGS_LIMITS.catchAllTriggerQueueCap.min,
      AUTOMATION_SETTINGS_LIMITS.catchAllTriggerQueueCap.max,
      DEFAULT_AUTOMATION_SETTINGS.catchAllTriggerQueueCap
    ),
    recentMatchDedupeTtlMs: clampNumber(
      settings?.recentMatchDedupeTtlMs,
      AUTOMATION_SETTINGS_LIMITS.recentMatchDedupeTtlMs.min,
      AUTOMATION_SETTINGS_LIMITS.recentMatchDedupeTtlMs.max,
      DEFAULT_AUTOMATION_SETTINGS.recentMatchDedupeTtlMs
    ),
  };
}

export function capExecutionLogs(logs: ExecutionLog[]): ExecutionLog[] {
  const buckets = new Map<string, ExecutionLog[]>();
  for (const log of logs) {
    const existing = buckets.get(log.workflowId) ?? [];
    existing.push(log);
    buckets.set(log.workflowId, existing);
  }

  return Array.from(buckets.values())
    .flatMap((workflowLogs) =>
      workflowLogs.length > AUTOMATION_LOG_LIMIT
        ? workflowLogs.slice(-AUTOMATION_LOG_LIMIT)
        : workflowLogs
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function capLiveTrafficHostInsights(insights: LiveTrafficHostInsight[]): LiveTrafficHostInsight[] {
  return insights.length > LIVE_TRAFFIC_HOST_INSIGHT_LIMIT
    ? insights.slice(-LIVE_TRAFFIC_HOST_INSIGHT_LIMIT)
    : insights;
}

export function addRunningWorkflowId(ids: string[], workflowId: string): string[] {
  return ids.includes(workflowId) ? ids : [...ids, workflowId];
}

export function removeRunningWorkflowId(ids: string[], workflowId: string): string[] {
  return ids.filter((id) => id !== workflowId);
}

/** Module-level abort controller state, shared across slices. */
export const workflowAbortControllers = new Map<string, AbortController>();
export const workflowAbortReasons = new Map<string, string>();
export const workflowAbortLogged = new Set<string>();

export function abortReasonFor(workflowId: string): string {
  return workflowAbortReasons.get(workflowId) ?? 'stopped';
}
