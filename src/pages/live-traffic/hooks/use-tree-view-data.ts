import { useMemo } from 'react';
import { matchesScope } from '@/lib/utils';
import type { TreePath } from '@/pages/live-traffic/api';
import { useHistoryTree } from '@/pages/live-traffic/hooks/use-history-tree';
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import type { TreeNodeData } from '@/pages/live-traffic/components/tree-view/types';

function buildDisplayUrl(host: string, path: string): string {
  if (path.includes('://')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const protocol = host.includes(':443') ? 'https' : 'http';

  return `${protocol}://${host}${normalizedPath}`;
}

function buildTreeNodeData(host: string, paths: TreePath[]): TreeNodeData {
  const hostNode: TreeNodeData = {
    id: `host-${host}`,
    type: 'host',
    label: host,
    children: [],
    count: paths.reduce((sum, path) => sum + path.count, 0),
    methods: [...new Set(paths.flatMap((path) => path.methods))],
  };

  hostNode.children = paths
    .map((pathEntry) => ({
      id: `${hostNode.id}/${pathEntry.url ?? pathEntry.path}-${pathEntry.methods.join(',')}`,
      type: 'endpoint' as const,
      label: pathEntry.url ?? buildDisplayUrl(host, pathEntry.path),
      fullPath: pathEntry.path,
      children: [],
      count: pathEntry.count,
      methods: pathEntry.methods,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return hostNode;
}

export function useTreeViewData() {
  const { treeData, isLoading, loadError } = useHistoryTree();
  const { activeScope } = useHistoryQuery();

  const nodes = useMemo(
    () =>
      treeData
        .filter((node) => !activeScope || matchesScope(node.host, activeScope))
        .map((node) => buildTreeNodeData(node.host, node.paths)),
    [activeScope, treeData]
  );

  return {
    nodes,
    hasActiveScope: Boolean(activeScope && activeScope.length > 0),
    isLoading,
    loadError,
  };
}
