import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { TreeNode } from './tree-node';
import type { TreeViewProps } from './types';

export type { TreeNodeData } from './types';

export function TreeView<TMeta = unknown>({
  nodes,
  onSelectEndpoint,
  onSelectHost,
  onSelectNode,
  selectedId,
  defaultExpandedIds = [],
  className,
  isLoading = false,
  loadError = null,
  emptyTitle = 'No tree entries yet',
  emptyDescription = 'Items will appear here once data is available.',
  errorTitle = 'Failed to load tree',
  searchQuery = '',
}: TreeViewProps<TMeta>) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-2">
        <Alert variant="destructive">
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className={cn('h-full overflow-auto pl-1', className)}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onSelectEndpoint={onSelectEndpoint}
          onSelectHost={onSelectHost}
          onSelectNode={onSelectNode}
          selectedId={selectedId}
          defaultExpanded={defaultExpandedIds.includes(node.id)}
          defaultExpandedIds={defaultExpandedIds}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}
