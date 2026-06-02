'use client';

import { AlertTriangle, Circle, CircleDot, FileCheck2, Search, ShieldBan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TreeView, type TreeNodeData } from '@/components/tree-view';
import { cn } from '@/lib/utils';
import { PAGE_STATUS_LABELS } from '../constants';
import type { CrawlPageStatus, CrawlTreeNode } from '../types';

type StatusFilter = CrawlPageStatus | 'all';
type CrawlTreeMeta = { pageId: string };

interface CrawlTreePanelProps {
  nodes: CrawlTreeNode[];
  selectedPageId: string | null;
  expandedPageIds: string[];
  search: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectPage: (pageId: string) => void;
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
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelectPage,
}: CrawlTreePanelProps) {
  const treeNodes = nodes.map(toTreeNode);

  return (
    <section className="flex min-h-0 flex-col border-b bg-background">
      <div className="border-b flex gap-2 px-3 py-2">
        <div className='flex-1'>
          <div className="text-sm font-medium">Crawl Tree</div>
          <div className="text-xs text-muted-foreground">Discovered page structure</div>

        </div>
        <div className="flex flex-2 gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search URL"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(PAGE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>



      <TreeView<CrawlTreeMeta>
        nodes={treeNodes}
        selectedId={selectedPageId}
        defaultExpandedIds={expandedPageIds}
        onSelectNode={(node) => {
          if (node.meta?.pageId) {
            onSelectPage(node.meta.pageId);
          }
        }}
        emptyTitle="No pages match"
        emptyDescription="Change the URL or status filters to reveal crawl pages."
      />
    </section>
  );
}
