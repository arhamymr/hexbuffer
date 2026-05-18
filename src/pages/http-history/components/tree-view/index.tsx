'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTreeViewData } from '@/pages/http-history/hooks/use-tree-view-data';
import { TreeNode } from './tree-node';
import type { TreeViewProps } from './types';

export type { TreeNodeData } from './types';

export function TreeView({
  onSelectEndpoint,
  selectedId,
}: TreeViewProps) {
  const { nodes, isLoading, loadError } = useTreeViewData();

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

  return (
    <div className="h-full overflow-auto pl-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onSelectEndpoint={onSelectEndpoint}
          selectedId={selectedId}
          defaultExpanded={true}
        />
      ))}
    </div>
  );
}
