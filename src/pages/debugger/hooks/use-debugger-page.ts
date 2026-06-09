'use client';

import { useEffect, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useDebuggerStore, type DebuggerEntry } from '@/stores/debugger';

function safeSummary(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const p = payload as Record<string, unknown>;
  return (
    (typeof p.url === 'string' && p.url) ||
    (typeof p.message === 'string' && p.message) ||
    (typeof p.title === 'string' && p.title) ||
    fallback
  );
}

function eventDirection(type: string): DebuggerEntry['direction'] {
  // Events that represent data FLOWING OUT of the AI engine:
  // text deltas, tool calls, human selection requests, workflow progress
  switch (type) {
    case 'chat_delta':
    case 'chat_action':
    case 'chat_finished':
    case 'human_selection_required':
    case 'workflow_step_started':
    case 'workflow_step_completed':
    case 'workflow_finished':
      return 'output';
    // Everything else is data flowing INTO or THROUGH the system
    default:
      return 'input';
  }
}

export function useDebuggerPage() {
  const {
    entries,
    selectedEntryId,
    paused,
    search,
    addEntry,
    selectEntry,
    togglePaused,
    setSearch,
    clearEntries,
  } = useDebuggerStore();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      const eventDefs: Array<[string, string, string]> = [
        // Crawl workflow events (sidecar → Rust → Tauri)
        ['ai-browser:session-started', 'session_started', 'Session Started'],
        ['ai-browser:session-failed', 'session_failed', 'Session Failed'],
        ['ai-browser:session-finished', 'session_finished', 'Session Finished'],
        ['ai-browser:page-discovered', 'page_discovered', 'Page Discovered'],
        ['ai-browser:page-updated', 'page_visited', 'Page Visited'],
        ['ai-browser:insight-created', 'insight_created', 'Insight Created'],
        ['ai-browser:log-created', 'log_created', 'Log Created'],
        ['ai-browser:human-input-requested', 'human_input_requested', 'Human Input Requested'],
        // Chat workflow events (sidecar → Rust → Tauri)
        ['ai-chat:started', 'chat_started', 'Chat Started'],
        ['ai-chat:delta', 'chat_delta', 'Chat Delta'],
        ['ai-chat:finished', 'chat_finished', 'Chat Finished'],
        ['ai-chat:failed', 'chat_failed', 'Chat Failed'],
        ['ai-chat-action', 'chat_action', 'Chat Tool Call'],
        ['ai-chat:crawl-human-input-required', 'human_input_requested', 'Crawl Needs Input'],
        ['ai-chat:human-selection-required', 'human_selection_required', 'AI Selection Request'],
        // Workflow lifecycle events (passthrough from sidecar)
        ['ai-workflow:started', 'workflow_started', 'Workflow Started'],
        ['ai-workflow:step_started', 'workflow_step_started', 'Workflow Step Started'],
        ['ai-workflow:step_completed', 'workflow_step_completed', 'Workflow Step Completed'],
        ['ai-workflow:step_failed', 'workflow_step_failed', 'Workflow Step Failed'],
        ['ai-workflow:finished', 'workflow_finished', 'Workflow Finished'],
        ['ai-workflow:failed', 'workflow_failed', 'Workflow Failed'],
      ];

      for (const [channel, eventType, label] of eventDefs) {
        try {
          const unlisten = await listen<unknown>(channel, (event) => {
            if (!mounted) return;
            addEntry({
              timestamp: new Date().toISOString(),
              eventType: eventType as DebuggerEntry['eventType'],
              label,
              summary: safeSummary(event.payload, label),
              payload: event.payload,
              direction: eventDirection(eventType),
            });
          });
          unlisteners.push(unlisten);
        } catch {
          // Event listener not available in this runtime
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((fn) => fn());
    };
  }, [addEntry]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.eventType.toLowerCase().includes(query) ||
        JSON.stringify(entry.payload).toLowerCase().includes(query)
    );
  }, [entries, search]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  return {
    entries: filteredEntries,
    selectedEntry,
    paused,
    search,
    selectEntry,
    togglePaused,
    setSearch,
    clearEntries,
  };
}
