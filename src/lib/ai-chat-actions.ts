import { useCallback, useSyncExternalStore } from 'react';
import {
  addTarget as orchAddTarget,
  addTargets as orchAddTargets,
  deleteTarget as orchDeleteTarget,
  deleteAllTargets as orchDeleteAllTargets,
  sendToInvoker as orchSendToInvoker,
  sendToRepeater as orchSendToRepeater,
  writeDocument as orchWriteDocument,
} from '@/triggers';
import {
  triggerScan as orchTriggerScan,
  pauseScan as orchPauseScan,
  resumeScan as orchResumeScan,
  stopScan as orchStopScan,
  submitCrawlInput as orchSubmitCrawlInput,
} from '@/triggers/browser';
import { invoke } from '@tauri-apps/api/core';
import { useNavStore } from '@/stores/nav';
import type {
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
  request_intent_clarification: 'Clarifying your request',
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
    const { hosts, targetId } = payload as { hosts?: Array<{ host: string; name?: string | null }>; targetId?: string | null };
    orchAddTargets({ hosts: hosts ?? [], targetId });
  },

  add_target: (payload) => {
    const { host, name } = payload as { host: string; name?: string | null };
    orchAddTarget({ host, name });
  },

  delete_target: (payload) => {
    const { targetId } = payload as { targetId: string };
    orchDeleteTarget({ targetId });
  },

  delete_all_targets: () => {
    orchDeleteAllTargets();
  },

  write_document: (payload) => {
    const { documentId, sectionKey, title, content, mode } =
      payload as unknown as WriteDocumentPayload;
    orchWriteDocument({ documentId, sectionKey, title, content, mode });
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
    await orchTriggerScan({ url, maxDepth, maxPages, headless });
  },

  pause_scan: async () => {
    await orchPauseScan();
  },

  resume_scan: async () => {
    await orchResumeScan();
  },

  stop_scan: async () => {
    await orchStopScan();
  },

  send_to_invoker: async (payload) => {
    const { logId, rawRequest, payloadValues, delayMs } =
      payload as unknown as SendToInvokerPayload;
    await orchSendToInvoker({ logId, rawRequest, payloadValues, delayMs });
  },

  send_to_repeater: async (payload) => {
    const { logId } = payload as unknown as SendToRepeaterPayload;
    await orchSendToRepeater({ logId });
  },

  navigate_to: (payload) => {
    const { path } = payload as unknown as NavigateToPayload;
    if (!path) return;
    useNavStore.getState().triggerNavBlink(path);
  },

  submit_crawl_input: async (payload) => {
    const { sessionId, fields } = payload as unknown as SubmitCrawlInputPayload;
    await orchSubmitCrawlInput({ sessionId, fields });
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
