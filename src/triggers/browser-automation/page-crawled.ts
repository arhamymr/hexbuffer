import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAutomationStore, type WorkflowContext } from '@/stores/automation';
import type { CrawlPage } from '@/pages/browser/types';
import type { TriggerConfig, WorkflowDef } from '@/pages/automation/types';
import { parseHostWhitelist } from '@/triggers/live-traffic/captured';

/* ── Filter matching ── */

function matchesPageCrawledTrigger(page: CrawlPage, config: TriggerConfig): boolean {
  if (config.triggerType !== 'trigger:browser-page-crawled') return false;

  // Host whitelist filter
  const whitelistedHosts = parseHostWhitelist(config.host);
  if (whitelistedHosts.length > 0) {
    let pageHost: string;
    try {
      pageHost = new URL(page.url).hostname.toLowerCase();
    } catch {
      pageHost = page.url.split('/')[0].split(':')[0].toLowerCase();
    }
    if (!pageHost) return false;
    if (
      !whitelistedHosts.some(
        (allowedHost) =>
          pageHost === allowedHost || pageHost.endsWith(`.${allowedHost}`),
      )
    ) {
      return false;
    }
  }

  // URL pattern filter
  const { operator, value } = config;
  if (value && value.trim()) {
    const loweredUrl = page.url.toLowerCase();
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
          if (!new RegExp(value, 'i').test(page.url)) return false;
        } catch {
          return false;
        }
        break;
    }
  }

  return true;
}

/* ── Context builder ── */

function buildPageCrawledContext(page: CrawlPage): WorkflowContext {
  let host: string;
  try {
    host = new URL(page.url).hostname;
  } catch {
    host = page.url.split('/')[0].split(':')[0];
  }

  return {
    triggerType: 'browser-page-crawled',
    data: {
      pageId: page.id,
      sessionId: page.sessionId,
      url: page.url,
      host,
      title: page.title ?? '',
      status: page.status,
      httpStatus: page.httpStatus,
      depth: page.depth,
      parentUrl: page.parentUrl ?? '',
      linksFound: page.linksFound,
      formsFound: page.formsFound,
      aiSummary: page.aiSummary ?? '',
    },
  };
}

/* ── Workflow discovery ── */

function getPageCrawledWorkflows(workflows: WorkflowDef[]): WorkflowDef[] {
  return workflows.filter((w) => {
    if (!w.enabled) return false;
    const nodes = (w.nodes ?? []) as Array<{ type?: string }>;
    return nodes.some((n) => n.type === 'trigger:browser-page-crawled');
  });
}

/* ── Watcher lifecycle ── */

let unlistenPageCrawled: UnlistenFn | null = null;
let watcherGeneration = 0;
let startPromise: Promise<void> | null = null;

export function startPageCrawledWatcher(): Promise<void> | null {
  if (startPromise) return startPromise;
  const generation = ++watcherGeneration;

  startPromise = listen<CrawlPage>('ai-browser:page-updated', (event) => {
    if (generation !== watcherGeneration) return;

    const page = event.payload;
    if (!page?.url) return;

    const store = useAutomationStore.getState();
    const workflows = getPageCrawledWorkflows(store.workflows);

    for (const workflow of workflows) {
      const triggerNode = (workflow.nodes as Array<{
        type?: string;
        id?: string;
        data?: { config?: TriggerConfig; label?: string };
      }>).find((n) => n.type === 'trigger:browser-page-crawled');

      if (!triggerNode) continue;
      const config = triggerNode.data?.config as TriggerConfig | undefined;
      if (!config) continue;

      if (!matchesPageCrawledTrigger(page, config)) continue;

      const context = buildPageCrawledContext(page);
      store.runWorkflow(workflow.id, context);
    }
  })
    .then((nextUnlisten) => {
      if (generation !== watcherGeneration) {
        nextUnlisten();
        return;
      }
      unlistenPageCrawled = nextUnlisten;
    })
    .finally(() => {
      if (generation === watcherGeneration) {
        startPromise = null;
      }
    });

  return startPromise;
}

export function stopPageCrawledWatcher(): void {
  watcherGeneration += 1;
  if (unlistenPageCrawled) {
    unlistenPageCrawled();
    unlistenPageCrawled = null;
  }
  startPromise = null;
}
