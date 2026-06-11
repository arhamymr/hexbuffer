import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAutomationStore, type WorkflowContext } from '@/stores/automation';
import type { ProxyRecord } from '@/types';
import type { TriggerConfig, WorkflowDef } from '@/pages/automation/types';

/* ── Helpers ── */

function buildContext(record: ProxyRecord): WorkflowContext {
  const host = getRecordUrlParts(record).host;
  const decodeBody = (body: number[] | undefined) => {
    if (!body?.length) return '';
    try { return new TextDecoder().decode(new Uint8Array(body)); } catch { return ''; }
  };
  return {
    triggerType: 'live-traffic-captured',
    data: {
      id: record.id,
      timestamp: record.timestamp,
      url: record.request.uri,
      method: record.request.method,
      host,
      status: record.response?.status_code,
      statusText: record.response?.status_text,
      requestBody: decodeBody(record.request.body),
      responseBody: decodeBody(record.response?.body),
      clientAddr: record.client_addr,
      serverAddr: record.server_addr,
      httpVersion: record.request.http_version,
      responseHttpVersion: record.response?.http_version,
    },
  };
}

export interface LiveTrafficFilterMatch {
  host?: string;
  method?: string;
  operator?: 'equals' | 'contains' | 'regex';
  value?: string;
}

export function parseHostWhitelist(host?: string): string[] {
  return (host ?? '')
    .split(/[\s,;]+/)
    .map(normalizeHostPattern)
    .filter(Boolean);
}

function headerValue(headers: Record<string, string>, name: string): string {
  const loweredName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === loweredName);
  return entry?.[1] ?? '';
}

function normalizeHostPattern(entry: string): string {
  const trimmed = entry.trim().toLowerCase();
  if (!trimmed) return '';

  const withoutWildcard = trimmed.startsWith('*.') ? trimmed.slice(2) : trimmed;
  const candidate = withoutWildcard.includes('://') ? withoutWildcard : `https://${withoutWildcard}`;

  try {
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    return withoutWildcard
      .split('/')[0]
      .split(':')[0]
      .trim();
  }
}

function parseUrl(url: string): { host: string; full: string; path: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return { host: parsed.hostname, full: parsed.href, path: `${parsed.pathname}${parsed.search}` || '/' };
  } catch {
    return { host: url, full: url, path: url };
  }
}

function getRecordUrlParts(record: ProxyRecord): { host: string; full: string; path: string } {
  const parsed = parseUrl(record.request.uri);
  const uriLooksRelative = record.request.uri.startsWith('/');
  const parsedHost = uriLooksRelative ? '' : parsed.host;
  const headerHost =
    headerValue(record.request.headers, ':authority') ||
    headerValue(record.request.headers, 'host');
  const fallbackHost = normalizeHostPattern(headerHost || record.server_addr);
  const host = normalizeHostPattern(parsedHost || fallbackHost);

  return {
    host,
    full: parsed.full,
    path: uriLooksRelative ? record.request.uri : parsed.path,
  };
}

export function matchesFilter(record: ProxyRecord, filter: LiveTrafficFilterMatch): boolean {
  const { host: filterHost, method, operator, value } = filter;
  const { host } = getRecordUrlParts(record);

  if (method && method.trim() && method.toUpperCase() !== 'ANY') {
    if (record.request.method.toUpperCase() !== method.toUpperCase()) return false;
  }

  const whitelistedHosts = parseHostWhitelist(filterHost);
  if (whitelistedHosts.length > 0) {
    const loweredHost = host.toLowerCase();
    if (!whitelistedHosts.some((allowedHost) => loweredHost === allowedHost || loweredHost.endsWith(`.${allowedHost}`))) {
      return false;
    }
  }

  if (value && value.trim()) {
    const loweredUrl = record.request.uri.toLowerCase();
    const loweredValue = value.toLowerCase();

    switch (operator) {
      case 'equals':
        if (loweredUrl !== loweredValue) return false;
        break;
      case 'contains':
        if (!loweredUrl.includes(loweredValue)) return false;
        break;
      case 'regex':
        try {
          if (!new RegExp(value, 'i').test(record.request.uri)) return false;
        } catch {
          return false;
        }
        break;
    }
  }

  return true;
}

export function matchesLiveTrafficTrigger(
  record: ProxyRecord,
  config: TriggerConfig,
): boolean {
  if (config.triggerType !== 'trigger:live-traffic-captured') return false;
  return matchesFilter(record, {
    host: config.host,
    method: config.method,
    operator: config.operator,
    value: config.value,
  });
}

export function getLiveTrafficWorkflows(workflows: WorkflowDef[]): WorkflowDef[] {
  return workflows.filter((w) => {
    if (!w.enabled) return false;
    const nodes = (w.nodes ?? []) as Array<{ type?: string }>;
    return nodes.some((n) => n.type === 'trigger:live-traffic-captured');
  });
}

interface LiveTrafficQueueJob {
  id: string;
  workflowId: string;
  triggerNodeId: string;
  triggerNodeLabel: string;
  cap: number;
  record: ProxyRecord;
}

const GLOBAL_LIVE_TRAFFIC_CONCURRENCY = 1;
const FILTERED_TRIGGER_QUEUE_CAP = 100;
const CATCH_ALL_TRIGGER_QUEUE_CAP = 25;
const RECENT_MATCH_TTL_MS = 2_000;

let activeLiveTrafficJobs = 0;
const liveTrafficQueue: LiveTrafficQueueJob[] = [];
const recentMatchedRequests = new Map<string, number>();

function isCatchAllTrigger(config: TriggerConfig): boolean {
  const hasHost = parseHostWhitelist(config.host).length > 0;
  const hasMethod = Boolean(config.method?.trim() && config.method.toUpperCase() !== 'ANY');
  const hasValue = Boolean(config.value?.trim());
  return !hasHost && !hasMethod && !hasValue;
}

function queueCapForTrigger(config: TriggerConfig): number {
  return isCatchAllTrigger(config) ? CATCH_ALL_TRIGGER_QUEUE_CAP : FILTERED_TRIGGER_QUEUE_CAP;
}

function makeMatchKey(record: ProxyRecord, triggerNodeId: string, host: string, path: string): string {
  return [
    triggerNodeId,
    record.id,
    record.request.method,
    record.response?.status_code ?? '',
    host,
    path,
  ].join('|');
}

function wasRecentlyMatched(matchKey: string): boolean {
  const now = Date.now();
  for (const [key, matchedAt] of recentMatchedRequests) {
    if (now - matchedAt > RECENT_MATCH_TTL_MS) {
      recentMatchedRequests.delete(key);
    }
  }

  const previous = recentMatchedRequests.get(matchKey);
  if (previous && now - previous <= RECENT_MATCH_TTL_MS) {
    return true;
  }

  recentMatchedRequests.set(matchKey, now);
  return false;
}

function pendingCountForTrigger(triggerNodeId: string): number {
  return liveTrafficQueue.filter((job) => job.triggerNodeId === triggerNodeId).length;
}

function updateQueueStats(triggerNodeId: string, cap: number): void {
  const store = useAutomationStore.getState();
  const current = store.liveTrafficQueueStatsByTriggerId[triggerNodeId];
  store.setLiveTrafficQueueStats(triggerNodeId, {
    pending: pendingCountForTrigger(triggerNodeId),
    dropped: current?.dropped ?? 0,
    lastDroppedAt: current?.lastDroppedAt,
    cap,
  });
}

function removeQueuedJobsForWorkflowIds(workflowIds: Set<string>): void {
  if (workflowIds.size === 0 || liveTrafficQueue.length === 0) return;

  const removedJobs: LiveTrafficQueueJob[] = [];
  for (let index = liveTrafficQueue.length - 1; index >= 0; index -= 1) {
    const job = liveTrafficQueue[index];
    if (!workflowIds.has(job.workflowId)) continue;
    removedJobs.push(job);
    liveTrafficQueue.splice(index, 1);
  }

  if (removedJobs.length === 0) return;

  const store = useAutomationStore.getState();
  const affectedTriggers = new Map<string, number>();
  for (const job of removedJobs) {
    store.removeLiveTrafficHostInsight(job.id);
    affectedTriggers.set(job.triggerNodeId, job.cap);
  }

  for (const [triggerNodeId, cap] of affectedTriggers) {
    updateQueueStats(triggerNodeId, cap);
  }
}

function dropOldestPendingJob(triggerNodeId: string, cap: number): void {
  const index = liveTrafficQueue.findIndex((job) => job.triggerNodeId === triggerNodeId);
  if (index < 0) return;

  const [dropped] = liveTrafficQueue.splice(index, 1);
  const store = useAutomationStore.getState();
  store.removeLiveTrafficHostInsight(dropped.id);
  store.incrementLiveTrafficDropped(triggerNodeId, cap);
  updateQueueStats(triggerNodeId, cap);
}

function scheduleLiveTrafficQueue(): void {
  while (
    activeLiveTrafficJobs < GLOBAL_LIVE_TRAFFIC_CONCURRENCY &&
    liveTrafficQueue.length > 0
  ) {
    const job = liveTrafficQueue.shift();
    if (!job) return;

    const store = useAutomationStore.getState();
    if (!store.workflows.some((workflow) => workflow.id === job.workflowId)) {
      store.removeLiveTrafficHostInsight(job.id);
      updateQueueStats(job.triggerNodeId, job.cap);
      continue;
    }

    activeLiveTrafficJobs += 1;
    store.removeLiveTrafficHostInsight(job.id);
    updateQueueStats(job.triggerNodeId, job.cap);

    store
      .runWorkflow(job.workflowId, buildContext(job.record))
      .finally(() => {
        activeLiveTrafficJobs = Math.max(0, activeLiveTrafficJobs - 1);
        updateQueueStats(job.triggerNodeId, job.cap);
        scheduleLiveTrafficQueue();
      });
  }
}

function enqueueLiveTrafficJob(job: LiveTrafficQueueJob): void {
  if (pendingCountForTrigger(job.triggerNodeId) >= job.cap) {
    dropOldestPendingJob(job.triggerNodeId, job.cap);
  }

  liveTrafficQueue.push(job);
  updateQueueStats(job.triggerNodeId, job.cap);
  scheduleLiveTrafficQueue();
}

/* ── Event bridge ── */

let unlisten: UnlistenFn | null = null;
let unsubscribeWorkflowCleanup: (() => void) | null = null;
let startPromise: Promise<void> | null = null;
let watcherGeneration = 0;

export async function startLiveTrafficWatcher(): Promise<void> {
  if (unlisten || startPromise) return startPromise ?? undefined;

  const generation = ++watcherGeneration;

  if (!unsubscribeWorkflowCleanup) {
    unsubscribeWorkflowCleanup = useAutomationStore.subscribe((state, previousState) => {
      const currentIds = new Set(state.workflows.map((workflow) => workflow.id));
      const deletedIds = new Set(
        previousState.workflows
          .map((workflow) => workflow.id)
          .filter((workflowId) => !currentIds.has(workflowId))
      );
      removeQueuedJobsForWorkflowIds(deletedIds);

      const abortedIds = new Set(
        Object.entries(state.workflowAbortQueueRevisionById)
          .filter(([workflowId, revision]) => {
            if (revision === (previousState.workflowAbortQueueRevisionById[workflowId] ?? 0)) {
              return false;
            }
            return currentIds.has(workflowId);
          })
          .map(([workflowId]) => workflowId)
      );
      removeQueuedJobsForWorkflowIds(abortedIds);
    });
  }

  startPromise = listen<ProxyRecord>('proxy-record', (event) => {
    const record = event.payload;
    const store = useAutomationStore.getState();

    const candidateWorkflows = getLiveTrafficWorkflows(store.workflows);
    const parsedUrl = getRecordUrlParts(record);

    for (const workflow of candidateWorkflows) {
      const nodes = (workflow.nodes ?? []) as Array<{
        id: string;
        type?: string;
        data?: { label?: string; config?: TriggerConfig };
      }>;

      const triggerNode = nodes.find(
        (n) =>
          n.type === 'trigger:live-traffic-captured' &&
          n.data?.config?.triggerType === 'trigger:live-traffic-captured'
      );

      if (!triggerNode?.data?.config) continue;

      if (matchesLiveTrafficTrigger(record, triggerNode.data.config)) {
        const matchKey = makeMatchKey(record, triggerNode.id, parsedUrl.host, parsedUrl.path);
        if (wasRecentlyMatched(matchKey)) continue;

        const insightId = crypto.randomUUID();
        const cap = queueCapForTrigger(triggerNode.data.config);
        const insight = {
          id: insightId,
          workflowId: workflow.id,
          workflowName: workflow.name,
          triggerNodeId: triggerNode.id,
          triggerNodeLabel: triggerNode.data.label ?? 'Live Traffic Captured',
          host: parsedUrl.host,
          method: record.request.method,
          status: record.response?.status_code,
          path: parsedUrl.path,
        };
        store.appendLiveTrafficHostInsight(insight);
        store.appendLiveTrafficCapturedHost(insight);
        enqueueLiveTrafficJob({
          id: insightId,
          workflowId: workflow.id,
          triggerNodeId: triggerNode.id,
          triggerNodeLabel: triggerNode.data.label ?? 'Live Traffic Captured',
          cap,
          record,
        });
      }
    }
  }).then((nextUnlisten) => {
    if (generation !== watcherGeneration) {
      nextUnlisten();
      return;
    }
    unlisten = nextUnlisten;
  }).finally(() => {
    if (generation === watcherGeneration) {
      startPromise = null;
    }
  });

  return startPromise;
}

export function stopLiveTrafficWatcher(): void {
  watcherGeneration += 1;
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  startPromise = null;
  if (unsubscribeWorkflowCleanup) {
    unsubscribeWorkflowCleanup();
    unsubscribeWorkflowCleanup = null;
  }
  liveTrafficQueue.length = 0;
  recentMatchedRequests.clear();
  activeLiveTrafficJobs = 0;
}
