import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAutomationStore, type WorkflowContext } from '@/stores/automation';
import type { CrawlPage } from '@/pages/browser/types';
import type { TriggerConfig, WorkflowDef } from '@/pages/automation/types';
import { parseHostWhitelist } from '@/triggers/live-traffic/captured';

const PAGE_CRAWLED_TRIGGER_TYPE = 'trigger:browser-page-crawled';

/* ── Funnel matching ── */

function matchesPageCrawledTrigger(page: CrawlPage, config: TriggerConfig): boolean {
  if (config.triggerType !== PAGE_CRAWLED_TRIGGER_TYPE) return false;

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

function buildPageCrawledContext(page: CrawlPage, triggerNodeId?: string): WorkflowContext {
  let host: string;
  try {
    host = new URL(page.url).hostname;
  } catch {
    host = page.url.split('/')[0].split(':')[0];
  }

  return {
    triggerType: PAGE_CRAWLED_TRIGGER_TYPE,
    triggerNodeId,
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

/* ── FlowArrow discovery ── */

function getPageCrawledWorkflows(workflows: WorkflowDef[]): WorkflowDef[] {
  return workflows.filter((w) => {
    if (!w.enabled) return false;
    const nodes = (w.nodes ?? []) as Array<{ type?: string; data?: { nodeType?: string } }>;
    return nodes.some((n) => n.type === PAGE_CRAWLED_TRIGGER_TYPE || n.data?.nodeType === PAGE_CRAWLED_TRIGGER_TYPE);
  });
}

/* ── Watcher lifecycle ── */

let unlistenPageCrawled: UnlistenFn | null = null;
let watcherGeneration = 0;
let startPromise: Promise<void> | null = null;

export function startPageCrawledWatcher(): Promise<void> | null {
  if (unlistenPageCrawled) return null;
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
        data?: { nodeType?: string; config?: TriggerConfig; label?: string };
      }>).find((n) => n.type === PAGE_CRAWLED_TRIGGER_TYPE || n.data?.nodeType === PAGE_CRAWLED_TRIGGER_TYPE);

      if (!triggerNode) continue;
      const config = triggerNode.data?.config as TriggerConfig | undefined;
      if (!config) continue;

      if (!matchesPageCrawledTrigger(page, config)) continue;

      const context = buildPageCrawledContext(page, triggerNode.id);
      if (triggerNode.id) {
        store.appendExecutionLog({
          workflowId: workflow.id,
          level: 'info',
          message: `Received crawled page: ${triggerNode.data?.label ?? 'Page Crawled'}`,
          nodeId: triggerNode.id,
          nodeLabel: triggerNode.data?.label ?? 'Page Crawled',
          inputData: context.data,
          outputData: context.data,
        });
      }
      void store.runWorkflow(workflow.id, context).catch((error) => {
        const message = error instanceof Error ? error.message : String(error || 'FlowArrow failed');
        if (triggerNode.id) {
          store.setNodeRuntimeStatus(triggerNode.id, {
            workflowId: workflow.id,
            status: 'error',
            message,
            inputData: context.data,
            outputData: context.data,
          });
        }
        store.appendExecutionLog({
          workflowId: workflow.id,
          level: 'error',
          message,
          nodeId: triggerNode.id,
          nodeLabel: triggerNode.data?.label ?? 'Page Crawled',
          inputData: context.data,
        });
      });
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
