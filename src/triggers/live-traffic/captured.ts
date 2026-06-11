import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAutomationStore, type WorkflowContext } from '@/stores/automation';
import type { ProxyRecord } from '@/types';
import type { TriggerConfig, WorkflowDef } from '@/pages/automation/types';

/* ── Helpers ── */

function buildContext(record: ProxyRecord): WorkflowContext {
  const host = parseUrl(record.request.uri).host;
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
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseUrl(url: string): { host: string; full: string; path: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return { host: parsed.hostname, full: parsed.href, path: `${parsed.pathname}${parsed.search}` || '/' };
  } catch {
    return { host: url, full: url, path: url };
  }
}

export function matchesFilter(record: ProxyRecord, filter: LiveTrafficFilterMatch): boolean {
  const { host: filterHost, method, operator, value } = filter;
  const { host } = parseUrl(record.request.uri);

  if (method && method.trim() && method.toUpperCase() !== 'ANY') {
    if (record.request.method.toUpperCase() !== method.toUpperCase()) return false;
  }

  const whitelistedHosts = parseHostWhitelist(filterHost);
  if (whitelistedHosts.length > 0) {
    const loweredHost = host.toLowerCase();
    if (!whitelistedHosts.some((allowedHost) => loweredHost.includes(allowedHost))) {
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

/* ── Event bridge ── */

let unlisten: UnlistenFn | null = null;

export async function startLiveTrafficWatcher(): Promise<void> {
  if (unlisten) return;

  unlisten = await listen<ProxyRecord>('proxy-record', (event) => {
    const record = event.payload;
    const store = useAutomationStore.getState();

    const candidateWorkflows = getLiveTrafficWorkflows(store.workflows);

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
        const { host, path } = parseUrl(record.request.uri);
        const insightId = crypto.randomUUID();
        const insight = {
          id: insightId,
          workflowId: workflow.id,
          workflowName: workflow.name,
          triggerNodeId: triggerNode.id,
          triggerNodeLabel: triggerNode.data.label ?? 'Live Traffic Captured',
          host,
          method: record.request.method,
          status: record.response?.status_code,
          path,
        };
        store.appendLiveTrafficHostInsight(insight);
        store.appendLiveTrafficCapturedHost(insight);
        store
          .runWorkflow(workflow.id, buildContext(record))
          .finally(() => {
            useAutomationStore.getState().removeLiveTrafficHostInsight(insightId);
          });
      }
    }
  });
}

export function stopLiveTrafficWatcher(): void {
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
}
