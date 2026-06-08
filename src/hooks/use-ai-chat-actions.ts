import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { dispatchAiChatAction } from '@/lib/ai-chat-actions';

const AI_ACTION_EVENTS = [
  { event: 'ai-action-add-target', action: 'add_target' },
  { event: 'ai-action-write-document', action: 'write_document' },
  { event: 'ai-action-start-proxy', action: 'start_proxy' },
  { event: 'ai-action-trigger-scan', action: 'trigger_scan' },
  { event: 'ai-action-send-to-invoker', action: 'send_to_invoker' },
  { event: 'ai-action-send-to-repeater', action: 'send_to_repeater' },
  { event: 'ai-action-navigate-to', action: 'navigate_to' },
  { event: 'ai-action-submit-crawl-input', action: 'submit_crawl_input' },
  // Generic catch-all event emitted for every tool call (including url_extracted, etc.)
  { event: 'ai-chat-action', action: '_any' },
] as const;

export function useAiChatActions() {
  useEffect(() => {
    const unlisteners = AI_ACTION_EVENTS.map(({ event, action }) =>
      listen<Record<string, unknown>>(event, (e) => {
        // The generic 'ai-chat-action' event wraps the real action name
        // inside the payload: { action: "url_extracted", payload: {...} }
        if (action === '_any') {
          const innerAction = (e.payload as Record<string, unknown>)?.action as string | undefined;
          const innerPayload = (e.payload as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
          if (innerAction) {
            dispatchAiChatAction(innerAction, innerPayload ?? {});
          }
        } else {
          dispatchAiChatAction(action, e.payload);
        }
      })
    );

    return () => {
      unlisteners.forEach((promise) => promise.then((fn) => fn()));
    };
  }, []);
}
