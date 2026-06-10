'use client';

import { useMemo } from 'react';
import { AlertTriangle, CircleDot, CircleStop, FileCheck2, ShieldBan, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TreeView, type TreeNodeData } from '@/components/tree-view';
import { cn } from '@/lib/utils';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { PAGE_STATUS_LABELS } from '../constants';
import type { CrawlPageStatus, CrawlStatus, CrawlTreeNode } from '../types';

type CrawlTreeMeta = { pageId: string };

interface CrawlTreePanelProps {
  nodes: CrawlTreeNode[];
  selectedPageId: string | null;
  expandedPageIds: string[];
  searchQuery?: string;
  crawlStatus?: CrawlStatus;
}

const statusStyles: Record<CrawlPageStatus, string> = {
  visited: 'border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
  queued: 'border-muted-foreground/25 text-muted-foreground',
  current: 'border-sky-500/25 text-sky-700 dark:text-sky-300',
  error: 'border-red-500/25 text-red-700 dark:text-red-300',
  blocked: 'border-amber-500/25 text-amber-700 dark:text-amber-300',
};

const statusIcon = {
  visited: FileCheck2,
  queued: Loader,
  current: CircleDot,
  error: AlertTriangle,
  blocked: ShieldBan,
};

const statusIconClassName: Record<CrawlPageStatus, string> = {
  visited: 'text-emerald-500',
  queued: 'text-muted-foreground animate-spin',
  current: 'text-sky-500',
  error: 'text-red-500',
  blocked: 'text-amber-500',
};

function formatCrawlTreeUrl(url: string) {
  return url.replace(/^https?:\/\//i, '');
}

function toTreeNode(node: CrawlTreeNode, crawlStopped: boolean): TreeNodeData<CrawlTreeMeta> {
  const showStopped = crawlStopped && node.status === 'queued';
  const Icon = showStopped ? CircleStop : statusIcon[node.status];

  return {
    id: node.id,
    type: 'crawl-page',
    label: formatCrawlTreeUrl(node.url),
    status: node.status,
    children: node.children.map((child) => toTreeNode(child, crawlStopped)),
    icon: Icon,
    iconClassName: cn(
      statusIconClassName[node.status],
      node.status === 'current' && 'animate-pulse',
      showStopped && 'text-muted-foreground',
    ),
    badge: (
      <Badge variant="outline" className={cn('h-4 px-1 text-[10px] capitalize', statusStyles[node.status])}>
        {PAGE_STATUS_LABELS[node.status]}
      </Badge>
    ),
    meta: { pageId: node.id },
  };
}

export function CrawlTreePanel({
  nodes,
  selectedPageId,
  expandedPageIds,
  searchQuery = '',
  crawlStatus,
}: CrawlTreePanelProps) {
  const selectPage = useBrowserAutomationStore((s) => s.selectPage);
  const crawlStopped = crawlStatus === 'stopped';
  const treeNodes = nodes.map((node) => toTreeNode(node, crawlStopped));

  const allPageIds = useMemo(() => {
    function collect(node: CrawlTreeNode): string[] {
      return [node.id, ...node.children.flatMap(collect)];
    }
    return nodes.flatMap(collect);
  }, [nodes]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col border-b bg-background">
      <div className="sticky top-0 z-10 flex min-w-0 gap-2 border-b bg-background px-3 py-1">
        <div className="min-w-0">
          <div className="text-xs font-medium">Pages</div>
          <div className="text-xs text-muted-foreground">Discovered page structure</div>
        </div>
      </div>

      <TreeView<CrawlTreeMeta>
        nodes={treeNodes}
        selectedId={selectedPageId}
        defaultExpandedIds={allPageIds}
        onSelectNode={(node) => {
          if (node.meta?.pageId) {
            selectPage(node.meta.pageId);
          }
        }}
        emptyTitle="No pages match"
        emptyDescription="Change the URL or status filters to reveal crawl pages."
        searchQuery={searchQuery}
      />
    </section>
  );
}
