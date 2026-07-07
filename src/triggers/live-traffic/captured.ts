import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { buildRawHttpRequest } from '@/lib/http-message';
import { useNavStore } from '@/stores/nav';
import { useRepeaterStore } from '@/stores/repeater';
import { useInvokerStore } from '@/stores/invoker';
import { useAutomationStore, type ExecutionLog, type LiveTrafficHostInsight, type NodeRuntimeState } from '@/stores/automation';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import {
  createDefaultAttackConfig,
  findRequestPayloadPositions,
  syncPositionPayloads,
  type AttackConfig,
  type PayloadConfig,
} from '@/pages/invoker/types';
import type { ProxyRecord } from '@/types';
import type { TriggerConfig, WorkflowDef } from '@/pages/workflow/types';

const LIVE_TRAFFIC_TRIGGER_TYPE = 'trigger:live-traffic-captured';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauriAvailable() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
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
      case 'regex':
        try {
          if (!new RegExp(value, 'i').test(record.request.uri)) return false;
        } catch {
          return false;
        }
        break;
      default:
        if (!loweredUrl.includes(loweredValue)) return false;
        break;
    }
  }

  return true;
}

export function matchesLiveTrafficTrigger(
  record: ProxyRecord,
  config: TriggerConfig,
): boolean {
  if (config.triggerType !== LIVE_TRAFFIC_TRIGGER_TYPE) return false;
  if (parseHostWhitelist(config.host).length === 0) return false;
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
    const nodes = (w.nodes ?? []) as Array<{ type?: string; data?: { nodeType?: string } }>;
    return nodes.some((n) => n.type === LIVE_TRAFFIC_TRIGGER_TYPE || n.data?.nodeType === LIVE_TRAFFIC_TRIGGER_TYPE);
  });
}

interface NodeRuntimeEvent extends Omit<NodeRuntimeState, 'updatedAt'> {
  nodeId: string;
  updatedAt: string;
}

interface WorkflowRuntimeEvent {
  runningWorkflowIds: string[];
  activeRunWorkflowId?: string | null;
  executingNodeId?: string | null;
}

interface QueueStatsEvent {
  triggerNodeId: string;
  pending: number;
  dropped: number;
  lastDroppedAt?: string;
  cap: number;
}

interface AutomationUiBatchEvent {
  batchId: string;
  hostInsights: LiveTrafficHostInsight[];
  capturedHosts: LiveTrafficHostInsight[];
  removeHostInsightIds: string[];
  logs: ExecutionLog[];
  nodeRuntimes: NodeRuntimeEvent[];
  workflowRuntimes: WorkflowRuntimeEvent[];
  workflowRuntimeClearIds: string[];
  queueStats: QueueStatsEvent[];
}

interface AutomationActionUiEvent {
  actionId: string;
  workflowId: string;
  nodeId: string;
  actionType: string;
  params: Record<string, unknown>;
  inputData: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringField(source: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return fallback;
}

function booleanParam(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = params[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function headersFromInput(input: Record<string, unknown>): Record<string, string> {
  const headerCandidate = input.headers ?? input.requestHeaders;
  if (!headerCandidate || typeof headerCandidate !== 'object' || Array.isArray(headerCandidate)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headerCandidate as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => [key, String(value)])
  );
}

function requestFromAutomationInput(input: unknown) {
  const record = asRecord(input);
  const url = stringField(record, ['url', 'requestUrl', 'uri'], 'https://example.com/');
  return {
    method: stringField(record, ['method'], 'GET').toUpperCase(),
    url,
    headers: headersFromInput(record),
    body: stringField(record, ['requestBody', 'body'], ''),
  };
}

function resolveSimpleTemplate(template: string, input: Record<string, unknown>): string {
  return template.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (match, path: string) => {
    const value = path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      return (current as Record<string, unknown>)[segment];
    }, input);
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return match;
  });
}

function markFirstOccurrence(value: string, needle: string): string {
  if (!needle.trim() || value.includes('§')) return value;
  const index = value.indexOf(needle);
  if (index < 0) return value;
  return `${value.slice(0, index)}§${value.slice(index, index + needle.length)}§${value.slice(index + needle.length)}`;
}

function payloadConfigFromWordlist(wordlist: string): PayloadConfig {
  const trimmed = wordlist.trim();
  if (!trimmed) {
    return {
      payload_type: 'SimpleList',
      values: [],
      processing: [],
    };
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return {
      payload_type: 'RuntimeFile',
      values: [],
      file_path: trimmed,
      processing: [],
    };
  }
  return {
    payload_type: 'SimpleList',
    values: trimmed.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
    processing: [],
  };
}

function buildInvokerConfig(payload: AutomationActionUiEvent): AttackConfig {
  const params = asRecord(payload.params);
  const inputRecord = asRecord(payload.inputData);
  const request = requestFromAutomationInput(payload.inputData);
  const target = resolveSimpleTemplate(stringField(params, ['target'], ''), inputRecord);
  const baseRequest = {
    ...request,
    url: markFirstOccurrence(request.url, target),
    body: markFirstOccurrence(request.body, target),
    follow_redirects: true,
    max_hops: 10,
  };
  const positions = findRequestPayloadPositions(baseRequest);
  const payloadConfig = payloadConfigFromWordlist(resolveSimpleTemplate(stringField(params, ['wordlist'], ''), inputRecord));

  return {
    ...createDefaultAttackConfig(),
    name: `Automation ${request.method} ${request.url}`,
    base_request: baseRequest,
    positions,
    payload_config: payloadConfig,
    position_payloads: syncPositionPayloads(positions, {}, payloadConfig),
  };
}

function handleAutomationActionUi(payload: AutomationActionUiEvent): void {
  const params = asRecord(payload.params);
  const request = requestFromAutomationInput(payload.inputData);

  if (payload.actionType === 'action:send-to-repeater') {
    const tabId = useRepeaterStore.getState().addRequestTab({
      raw: buildRawHttpRequest(request),
      url: request.url,
    });
    const tabName = stringField(params, ['tabName'], '');
    if (tabName) {
      useRepeaterStore.getState().renameTab(tabId, tabName);
    }
    if (booleanParam(params, 'open', true)) {
      useNavStore.getState().triggerNavBlink('/repeater');
    }
    return;
  }

  if (payload.actionType === 'action:send-to-intercept') {
    const host = parseUrl(request.url).host || stringField(asRecord(payload.inputData), ['host'], '');
    const interceptStore = useInterceptStore.getState();
    const tabId = interceptStore.addTabForHost(host);
    if (tabId) {
      interceptStore.setRawRequest(buildRawHttpRequest(request));
    }
    if (booleanParam(params, 'pause', true)) {
      void interceptStore.toggleIntercept(true).catch((error) => {
        console.error('Failed to enable intercept from automation action:', error);
      });
    }
    useNavStore.getState().triggerNavBlink('/intercept');
    return;
  }

  if (payload.actionType === 'action:start-invoker') {
    const invokerStore = useInvokerStore.getState();
    const config = buildInvokerConfig(payload);
    invokerStore.addAttackTab(config);
    useNavStore.getState().triggerNavBlink('/invoker');

    const hasPositions = config.positions.length > 0;
    const hasPayloads =
      config.payload_config.payload_type === 'NumberRange' ||
      config.payload_config.values.length > 0 ||
      Boolean(config.payload_config.file_path);
    if (hasPositions && hasPayloads) {
      void useInvokerStore.getState().startAttack();
    }
  }
}

async function syncAutomationRuntime(): Promise<void> {
  if (!isTauriAvailable()) return;
  const store = useAutomationStore.getState();
  await invoke('automation_sync_workflows', {
    workflows: store.workflows,
    settings: store.automationSettings,
  });
}

let unlisteners: UnlistenFn[] = [];
let unsubscribeAutomationSync: (() => void) | null = null;
let syncTimer: any = null;
let lastSyncSignature = '';
let hostInsightFlushTimer: any = null;
let queuedHostInsightsBuffer: LiveTrafficHostInsight[] = [];
let capturedHostInsightsBuffer: LiveTrafficHostInsight[] = [];
let hostInsightRemoveBuffer: string[] = [];
let queueStatsBuffer = new Map<string, QueueStatsEvent>();
let hostInsightAckBuffer: string[] = [];
let executionLogBuffer: ExecutionLog[] = [];
let nodeRuntimeBuffer: NodeRuntimeEvent[] = [];
let workflowRuntimeBuffer: WorkflowRuntimeEvent[] = [];
let workflowRuntimeClearBuffer: string[] = [];

function scheduleAutomationSync(): void {
  if (!isTauriAvailable()) return;
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    const store = useAutomationStore.getState();
    const signature = JSON.stringify({
      workflows: store.workflows,
      automationSettings: store.automationSettings,
    });
    if (signature === lastSyncSignature) return;
    lastSyncSignature = signature;
    void syncAutomationRuntime().catch((error) => {
      console.error('Failed to sync automation runtime:', error);
    });
  }, 100);
}

function scheduleHostInsightFlush(): void {
  if (hostInsightFlushTimer) return;
  hostInsightFlushTimer = window.setTimeout(() => {
    hostInsightFlushTimer = null;
    const queued = queuedHostInsightsBuffer;
    const captured = capturedHostInsightsBuffer;
    const removed = hostInsightRemoveBuffer;
    const logs = executionLogBuffer;
    const nodeRuntimes = nodeRuntimeBuffer;
    const workflowRuntimes = workflowRuntimeBuffer;
    const workflowRuntimeClearIds = workflowRuntimeClearBuffer;
    queuedHostInsightsBuffer = [];
    capturedHostInsightsBuffer = [];
    hostInsightRemoveBuffer = [];
    executionLogBuffer = [];
    nodeRuntimeBuffer = [];
    workflowRuntimeBuffer = [];
    workflowRuntimeClearBuffer = [];

    const queueStats = Array.from(queueStatsBuffer.values());
    const ackBatchIds = hostInsightAckBuffer;
    queueStatsBuffer = new Map();
    hostInsightAckBuffer = [];

    const store = useAutomationStore.getState();
    if (queued.length > 0) store.appendLiveTrafficHostInsights(queued);
    if (captured.length > 0) store.appendLiveTrafficCapturedHosts(captured);
    if (removed.length > 0) store.removeLiveTrafficHostInsights(removed);
    if (logs.length > 0) store.appendExecutionLogs(logs);
    if (nodeRuntimes.length > 0) {
      store.setNodeRuntimeStatuses(
        nodeRuntimes.map(({ nodeId, ...runtime }) => ({ nodeId, runtime }))
      );
    }
    for (const workflowId of workflowRuntimeClearIds) {
      store.clearWorkflowRuntimeStatus(workflowId);
    }
    const latestWorkflowRuntime = workflowRuntimes.at(-1);
    if (latestWorkflowRuntime) {
      store.setWorkflowRuntimeSnapshot(latestWorkflowRuntime);
    }
    if (queueStats.length > 0) {
      useAutomationStore.setState((state) => {
        const liveTrafficQueueStatsByTriggerId = {
          ...state.liveTrafficQueueStatsByTriggerId,
        };
        for (const { triggerNodeId, ...stats } of queueStats) {
          liveTrafficQueueStatsByTriggerId[triggerNodeId] = stats;
        }
        return { liveTrafficQueueStatsByTriggerId };
      });
    }
    for (const batchId of ackBatchIds) {
      void invoke('automation_ack_host_insight_batch', { batchId }).catch((error) => {
        console.error('Failed to ack automation host insight batch:', error);
      });
    }
  }, 100);
}

export async function startLiveTrafficWatcher(): Promise<void> {
  if (unlisteners.length > 0 || !isTauriAvailable()) {
    scheduleAutomationSync();
    return;
  }

  const [
    unlistenUiBatch,
    unlistenQueueStats,
    unlistenActionUi,
  ] = await Promise.all([
    listen<AutomationUiBatchEvent>('automation:ui-batch', (event) => {
      queuedHostInsightsBuffer.push(...event.payload.hostInsights);
      capturedHostInsightsBuffer.push(...event.payload.capturedHosts);
      hostInsightRemoveBuffer.push(...event.payload.removeHostInsightIds);
      executionLogBuffer.push(...event.payload.logs);
      nodeRuntimeBuffer.push(...event.payload.nodeRuntimes);
      workflowRuntimeBuffer.push(...event.payload.workflowRuntimes);
      workflowRuntimeClearBuffer.push(...event.payload.workflowRuntimeClearIds);
      for (const stats of event.payload.queueStats) {
        queueStatsBuffer.set(stats.triggerNodeId, stats);
      }
      hostInsightAckBuffer.push(event.payload.batchId);
      scheduleHostInsightFlush();
    }),
    listen<QueueStatsEvent>('automation:queue-stats', (event) => {
      queueStatsBuffer.set(event.payload.triggerNodeId, event.payload);
      scheduleHostInsightFlush();
    }),
    listen<AutomationActionUiEvent>('automation:action-ui', (event) => {
      handleAutomationActionUi(event.payload);
    }),
  ]);

  unlisteners = [
    unlistenUiBatch,
    unlistenQueueStats,
    unlistenActionUi,
  ];

  if (!unsubscribeAutomationSync) {
    unsubscribeAutomationSync = useAutomationStore.subscribe((state, previousState) => {
      if (
        state.workflows !== previousState.workflows ||
        state.automationSettings !== previousState.automationSettings
      ) {
        scheduleAutomationSync();
      }
    });
  }

  scheduleAutomationSync();
}

export function stopLiveTrafficWatcher(): void {
  for (const unlisten of unlisteners) {
    unlisten();
  }
  unlisteners = [];
  if (unsubscribeAutomationSync) {
    unsubscribeAutomationSync();
    unsubscribeAutomationSync = null;
  }
  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (hostInsightFlushTimer) {
    window.clearTimeout(hostInsightFlushTimer);
    hostInsightFlushTimer = null;
  }
  queuedHostInsightsBuffer = [];
  capturedHostInsightsBuffer = [];
  hostInsightRemoveBuffer = [];
  queueStatsBuffer = new Map();
  hostInsightAckBuffer = [];
  executionLogBuffer = [];
  nodeRuntimeBuffer = [];
  workflowRuntimeBuffer = [];
  workflowRuntimeClearBuffer = [];
}
