import * as React from 'react';
import { listen } from '@tauri-apps/api/event';
import type { CrawlSession } from '@/pages/browser/types';

type CrawlSessionEventPayload = Partial<CrawlSession> & { sessionId?: string };

/**
 * Wires Tauri event listeners for browser crawl session lifecycle.
 * Keeps the top-nav status icon in sync with the real session state
 * without coupling the nav component to the full browser-automation page hook.
 */
export function useBrowserSessionEvents(
  applySessionStarted: (session: CrawlSession) => void,
  applySessionUpdated: (patch: CrawlSessionEventPayload) => void,
) {
  React.useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      try {
        unlisteners.push(await listen<CrawlSession>('ai-browser:session-started', (event) => {
          applySessionStarted(event.payload);
        }));
        unlisteners.push(await listen<CrawlSessionEventPayload>('ai-browser:session-updated', (event) => {
          applySessionUpdated(event.payload);
        }));
        unlisteners.push(await listen<CrawlSessionEventPayload>('ai-browser:session-finished', (event) => {
          applySessionUpdated({ ...event.payload, status: 'completed' });
        }));
        unlisteners.push(await listen<{ message?: string; sessionId?: string }>('ai-browser:session-failed', (event) => {
          applySessionUpdated({
            id: event.payload?.sessionId,
            sessionId: event.payload?.sessionId,
            status: 'failed',
            finishedAt: new Date().toISOString(),
          });
        }));
      } catch (error) {
        if (mounted) {
          console.warn('[top nav] Browser session event listeners are unavailable in this runtime.', error);
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [applySessionStarted, applySessionUpdated]);
}
