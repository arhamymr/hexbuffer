'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import { useTreeViewData } from '@/pages/live-traffic/hooks/use-tree-view-data';
import { TreeNode } from './tree-node';
import type { TreeViewProps } from './types';

export type { TreeNodeData } from './types';

export function TreeView({
  onSelectEndpoint,
  onSelectHost,
  selectedId,
}: TreeViewProps) {
  const { nodes, hasActiveScope, isLoading, loadError } = useTreeViewData();
  const { filter } = useHistoryQuery();
  const activeHostFilter = filter.search.trim();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-2">
        <Alert variant="destructive">
          <AlertTitle>Failed to load sitemap</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{hasActiveScope ? 'No matching sitemap entries' : 'No sitemap entries yet'}</EmptyTitle>
        <EmptyDescription>
          {hasActiveScope
            ? 'No captured hosts match the active scope tab.'
            : 'Captured HTTP hosts will appear here once traffic is available.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="h-full overflow-auto pl-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onSelectEndpoint={onSelectEndpoint}
          onSelectHost={onSelectHost}
          selectedId={selectedId}
          defaultExpanded={activeHostFilter === node.label}
        />
      ))}
    </div>
  );
}
