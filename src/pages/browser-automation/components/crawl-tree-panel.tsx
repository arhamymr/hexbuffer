'use client';

import { AlertTriangle, Circle, CircleDot, FileCheck2, ShieldBan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TreeView, type TreeNodeData } from '@/components/tree-view';
import { cn } from '@/lib/utils';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { PAGE_STATUS_LABELS } from '../constants';
import type { CrawlPageStatus, CrawlTreeNode } from '../types';

type CrawlTreeMeta = { pageId: string };

interface CrawlTreePanelProps {
  nodes: CrawlTreeNode[];
  selectedPageId: string | null;
  expandedPageIds: string[];
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
  queued: Circle,
  current: CircleDot,
  error: AlertTriangle,
  blocked: ShieldBan,
};

const statusIconClassName: Record<CrawlPageStatus, string> = {
  visited: 'text-emerald-500',
  queued: 'text-muted-foreground',
  current: 'text-sky-500',
  error: 'text-red-500',
  blocked: 'text-amber-500',
};

function formatCrawlTreeUrl(url: string) {
  return url.replace(/^https?:\/\//i, '');
}

function toTreeNode(node: CrawlTreeNode): TreeNodeData<CrawlTreeMeta> {
  const Icon = statusIcon[node.status];

  return {
    id: node.id,
    type: 'crawl-page',
    label: formatCrawlTreeUrl(node.url),
    status: node.status,
    children: node.children.map(toTreeNode),
    icon: Icon,
    iconClassName: cn(statusIconClassName[node.status], node.status === 'current' && 'animate-pulse'),
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
}: CrawlTreePanelProps) {
  const selectPage = useBrowserAutomationStore((s) => s.selectPage);
  const treeNodes = nodes.map(toTreeNode);

  return (
    <section className="flex min-h-0 flex-col border-b bg-background">
      <div className="border-b flex gap-2 px-3 py-2">
        <div>
          <div className="text-sm font-medium">Pages</div>
          <div className="text-xs text-muted-foreground">Discovered page structure</div>
        </div>
      </div>

      <TreeView<CrawlTreeMeta>
        nodes={treeNodes}
        selectedId={selectedPageId}
        defaultExpandedIds={expandedPageIds}
        onSelectNode={(node) => {
          if (node.meta?.pageId) {
            selectPage(node.meta.pageId);
          }
        }}
        emptyTitle="No pages match"
        emptyDescription="Change the URL or status filters to reveal crawl pages."
      />
    </section>
  );
}
