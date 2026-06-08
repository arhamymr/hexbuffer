import { useCallback, useSyncExternalStore } from 'react';
import { useTargetStore } from '@/stores/target';
import { useDocumentsStore } from '@/stores/documents';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useInvokerStore } from '@/stores/invoker';
import { useRepeaterStore } from '@/stores/repeater';
import { useNavStore } from '@/stores/nav';
import { invoke } from '@tauri-apps/api/core';
import { getHttpLogDetail } from '@/pages/live-traffic/api';
import { buildRawHttpRequest } from '@/lib/http-message';
import {
  createDefaultAttackConfig,
  findRequestPayloadPositions,
} from '@/pages/invoker/types';
import type {
  AddTargetPayload,
  AddTargetsPayload,
  DeleteTargetPayload,
  DeleteAllTargetsPayload,
  WriteDocumentPayload,
  StartProxyPayload,
  TriggerScanPayload,
  SendToInvokerPayload,
  SendToRepeaterPayload,
  NavigateToPayload,
  SubmitCrawlInputPayload,
} from './ai-chat-actions.types';

// ── Action tracking (for showing task progress in chat UI) ──

export interface TrackedAction {
  id: string;
  action: string;
  label: string;
  status: 'in_progress' | 'completed' | 'error';
  timestamp: number;
}

const actionLabels: Record<string, string> = {
  add_targets: 'Added targets to scope',
  add_target: 'Added target to scope',
  delete_target: 'Removed target from scope',
  delete_all_targets: 'Cleared all targets',
  write_document: 'Saved findings to document',
  start_proxy: 'Starting interception proxy',
  trigger_scan: 'Launching browser crawl',
  pause_scan: 'Pausing browser crawl',
  resume_scan: 'Resuming browser crawl',
  stop_scan: 'Stopping browser crawl',
  send_to_invoker: 'Setting up fuzzing attack',
  send_to_repeater: 'Sending request to Repeater',
  navigate_to: 'Navigating to page',
  submit_crawl_input: 'Submitting crawl credentials',
  url_extracted: 'Extracting data from URL',
  analyze_target_url: 'Analyzing target URL',
  extract_from_url: 'Extracting page content',
  list_crawl_sessions: 'Listing crawl sessions',
  get_recent_insights: 'Reading recent insights',
  get_crawl_context: 'Loading crawl context',
  get_proxy_request: 'Fetching proxy request',
  get_proxy_summary: 'Loading proxy summary',
  list_proxy_hosts: 'Listing proxy hosts',
  request_human_selection: 'Asking for your input',
};

let trackedActions: TrackedAction[] = [];
let actionListeners: Set<() => void> = new Set();
let actionCounter = 0;

function notifyActionListeners() {
  actionListeners.forEach((fn) => fn());
}

function addTrackedAction(action: string): string {
  const id = `ta-${++actionCounter}`;
  trackedActions = [
    ...trackedActions,
    {
      id,
      action,
      label: actionLabels[action] ?? action,
      status: 'in_progress' as const,
      timestamp: Date.now(),
    },
  ];
  notifyActionListeners();
  return id;
}

function completeTrackedAction(id: string, error = false) {
  trackedActions = trackedActions.map((a) =>
    a.id === id ? { ...a, status: error ? ('error' as const) : ('completed' as const) } : a
  );
  notifyActionListeners();
}

export function getTrackedActions(): readonly TrackedAction[] {
  return trackedActions;
}

export function clearTrackedActions() {
  trackedActions = [];
  notifyActionListeners();
}

export function useTrackedActions() {
  const subscribe = useCallback((callback: () => void) => {
    actionListeners.add(callback);
    return () => {
      actionListeners.delete(callback);
    };
  }, []);

  const getSnapshot = useCallback(() => trackedActions, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}

// ── Handlers ──

const handlers: Record<string, (payload: Record<string, unknown>) => void | Promise<void>> = {
  add_targets: (payload) => {
    const { hosts, targetId } = payload as unknown as AddTargetsPayload;
    console.log('[add_targets] hosts:', hosts?.length, 'targetId:', targetId);
    if (!hosts?.length) return;

    const store = useTargetStore.getState();
    console.log('[add_targets] existing targets:', store.targets.length);

    // Resolve target by name or ID
    const resolved = targetId
      ? store.targets.find(
          (t) => t.name === targetId || t.id === targetId,
        )
      : null;

    console.log('[add_targets] resolved target:', resolved?.name || 'none');

    if (resolved) {
      // Add hosts to an existing target's scope
      const target = store.addHostsToTarget(resolved.id, hosts.map((h) => h.host));
      console.log('[add_targets] addHostsToTarget result:', target?.scope?.length, 'scope items');
      if (target) {
        const namedEntry = hosts.find((h) => h.name);
        if (namedEntry && hosts.length === 1) {
          store.updateTarget(target.id, { name: namedEntry.name! });
        }
      }
      useNavStore.getState().triggerNavBlink('/');
    } else if (targetId) {
      // Target doesn't exist yet — create it with the given name and all hosts in scope
      const scope = hosts.map((h) => h.host).filter(Boolean);
      const now = new Date().toISOString();
      store.addTarget({
        id: crypto.randomUUID(),
        name: targetId,
        description: '',
        scope,
        createdAt: now,
        updatedAt: now,
        tabActive: true,
      });
      console.log('[add_targets] created new target:', targetId, 'with', scope.length, 'hosts');
      useNavStore.getState().triggerNavBlink('/');
    } else {
      // No targetId — create individual targets per host (legacy)
      let added = false;
      for (const entry of hosts) {
        if (!entry.host) continue;
        const target = store.addHostTarget(entry.host);
        console.log('[add_targets] addHostTarget:', entry.host, '→', target?.id || 'duplicate');
        if (target && entry.name) {
          store.updateTarget(target.id, { name: entry.name });
        }
        if (target) added = true;
      }
      if (added) useNavStore.getState().triggerNavBlink('/');
    }
    console.log('[add_targets] done, total targets:', useTargetStore.getState().targets.length);
  },

  add_target: (payload) => {
    const { host, name } = payload as unknown as AddTargetPayload;
    if (!host) return;

    const target = useTargetStore.getState().addHostTarget(host);
    if (target && name) {
      useTargetStore.getState().updateTarget(target.id, { name });
    }
    if (target) useNavStore.getState().triggerNavBlink('/');
  },

  delete_target: (payload) => {
    const { targetId } = payload as unknown as DeleteTargetPayload;
    if (!targetId) return;

    const store = useTargetStore.getState();
    const resolved = store.targets.find(
      (t) => t.name === targetId || t.id === targetId,
    );
    if (resolved) {
      store.removeTarget(resolved.id);
      console.log('[delete_target] removed:', resolved.name);
      useNavStore.getState().triggerNavBlink('/');
    }
  },

  delete_all_targets: () => {
    const store = useTargetStore.getState();
    store.removeAllTargets();
    console.log('[delete_all_targets] all targets cleared');
    useNavStore.getState().triggerNavBlink('/');
  },

  write_document: (payload) => {
    const { documentId, sectionKey, title, content, mode } =
      payload as unknown as WriteDocumentPayload;
    if (!content) return;

    const docStore = useDocumentsStore.getState();
    const targetDocId = documentId || docStore.activeDocumentId;
    if (!targetDocId) return;

    if (sectionKey) {
      docStore.updateDocument(targetDocId, (doc) => {
        const existing = doc.customSections.find((s) => s.key === sectionKey);
        if (!existing) return doc;
        const updated =
          mode === 'replace' ? content : `${existing.content}\n\n${content}`.trim();
        return {
          ...doc,
          customSections: doc.customSections.map((s) =>
            s.key === sectionKey ? { ...s, content: updated } : s,
          ),
        };
      });
    } else {
      docStore.addCustomSection(targetDocId, {
        title: title || 'AI Notes',
        description: 'Content generated by the AI Analyst',
        placeholder: '',
        content,
      });
    }
  },

  start_proxy: async (payload) => {
    const { port, tlsPort } = payload as unknown as StartProxyPayload;
    try {
      await invoke('start_proxy', { port: port ?? 8888, tlsPort: tlsPort ?? 8889 });
    } catch (error) {
      console.error('[ai-chat-actions] Failed to start proxy:', error);
    }
  },

  trigger_scan: async (payload) => {
    const { url, maxDepth, maxPages, headless } =
      payload as unknown as TriggerScanPayload;
    if (!url) return;

    // Ensure the proxy is running before launching the browser crawl.
    // The crawl sidecar routes through the local proxy to capture traffic.
    try {
      const status = await invoke<{ running: boolean }>('get_proxy_status');
      if (!status.running) {
        await invoke('start_proxy', { port: 8888, tlsPort: 8889 });
        // Give the proxy a moment to bind its listener.
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error('[ai-chat-actions] Failed to ensure proxy is running:', error);
    }

    const store = useBrowserAutomationStore.getState();
    store.updateSetup({
      targetUrl: url,
      maxDepth: maxDepth ?? 3,
      maxPages: maxPages ?? 100,
    });
    store.startCrawl(headless ?? true);
    useNavStore.getState().triggerNavBlink('/browser-automation');
  },

  pause_scan: async () => {
    const store = useBrowserAutomationStore.getState();
    store.pauseCrawl();
  },

  resume_scan: async () => {
    const store = useBrowserAutomationStore.getState();
    store.resumeCrawl();
  },

  stop_scan: async () => {
    const store = useBrowserAutomationStore.getState();
    store.stopCrawl();
  },

  send_to_invoker: async (payload) => {
    const { logId, rawRequest, payloadValues, delayMs } =
      payload as unknown as SendToInvokerPayload;
    if (!logId) return;

    const detail = await getHttpLogDetail(logId);
    const body = new TextDecoder().decode(new Uint8Array(detail.request.body));
    const baseRequest = {
      method: detail.request.method,
      url: detail.request.uri,
      headers: detail.request.headers,
      body: rawRequest ?? body,
      follow_redirects: true,
      max_hops: 10,
    };

    const config = {
      ...createDefaultAttackConfig(),
      name: `${detail.request.method} ${detail.request.uri}`,
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
      ...(delayMs !== undefined ? { delay_ms: delayMs } : {}),
    };

    const invokerStore = useInvokerStore.getState();
    invokerStore.addAttackTab(config);

    if (payloadValues?.length) {
      invokerStore.updatePayloadValues(payloadValues);
    }

    useNavStore.getState().triggerNavBlink('/invoker');
  },

  send_to_repeater: async (payload) => {
    const { logId } = payload as unknown as SendToRepeaterPayload;
    if (!logId) return;

    const detail = await getHttpLogDetail(logId);
    const body = new TextDecoder().decode(new Uint8Array(detail.request.body));
    const raw = buildRawHttpRequest({
      method: detail.request.method,
      url: detail.request.uri,
      headers: detail.request.headers,
      body,
    });

    useRepeaterStore.getState().addRequestTab({ raw, url: detail.request.uri });
    useNavStore.getState().triggerNavBlink('/repeater');
  },

  navigate_to: (payload) => {
    const { path } = payload as unknown as NavigateToPayload;
    if (!path) return;
    useNavStore.getState().triggerNavBlink(path);
  },

  submit_crawl_input: (payload) => {
    const { sessionId, fields } = payload as unknown as SubmitCrawlInputPayload;
    if (!sessionId || !fields) return;

    const store = useBrowserAutomationStore.getState();
    const tab = store.tabs.find((t) => t.session?.id === sessionId);
    if (!tab?.session || !tab.humanInputRequest) return;

    store.submitHumanInput(tab.humanInputRequest, 'continue', fields);
  },
};

export async function dispatchAiChatAction(action: string, payload: Record<string, unknown>) {
  console.log('[ai-chat-action] received:', action, JSON.stringify(payload).slice(0, 200));
  const actionId = addTrackedAction(action);
  const handler = handlers[action];
  if (!handler) {
    console.warn('[ai-chat-action] no handler for:', action);
    completeTrackedAction(actionId);
  } else {
    try {
      await handler(payload);
      console.log('[ai-chat-action] completed:', action);
      completeTrackedAction(actionId);
    } catch (error) {
      console.error('[ai-chat-action] failed:', action, error);
      completeTrackedAction(actionId, true);
    }
  }
}
