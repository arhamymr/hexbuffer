import type { ExecutionLog, LiveTrafficHostInsight } from './types';

export const AUTOMATION_LOG_LIMIT = 500;
export const LIVE_TRAFFIC_HOST_INSIGHT_LIMIT = 200;

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
