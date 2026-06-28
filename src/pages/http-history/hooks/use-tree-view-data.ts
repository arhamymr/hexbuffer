import { useMemo } from 'react';
import { matchesScope } from '@/lib/utils';
import type { TreePath } from '@/pages/http-history/api';
import { useHistoryTree } from '@/pages/http-history/hooks/use-history-tree';
import { useHttpHistoryQueryStore } from '@/pages/http-history/state/history-query-store';
import type { TreeNodeData } from '@/components/tree-view';

function buildDisplayUrl(host: string, path: string): string {
  if (path.includes('://')) {
    return stripDefaultPortFromUrl(path);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const protocol = host.includes(':443') ? 'https' : 'http';

  return `${protocol}://${stripDefaultPortFromHost(host, protocol)}${normalizedPath}`;
}

function buildTreeNodeData(host: string, paths: TreePath[]): TreeNodeData {
  const label = stripDefaultPortFromHost(host, host.includes(':443') ? 'https' : 'http');
  const hostNode: TreeNodeData = {
    id: `host-${host}`,
    type: 'host',
    label,
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

function stripDefaultPortFromHost(host: string, protocol: string): string {
  if (protocol === 'https' && host.endsWith(':443')) {
    return host.slice(0, -4);
  }

  if (protocol === 'http' && host.endsWith(':80')) {
    return host.slice(0, -3);
  }

  return host;
}

function stripDefaultPortFromUrl(url: string): string {
  const match = url.match(/^(https?):\/\/([^/?#]*)(.*)$/i);

  if (!match) {
    return url;
  }

  const [, protocol, host, rest] = match;
  return `${protocol}://${stripDefaultPortFromHost(host, protocol.toLowerCase())}${rest}`;
}

export function useTreeViewData() {
  const { treeData, isLoading, loadError } = useHistoryTree();
  const activeScope = useHttpHistoryQueryStore((state) => state.activeScope);

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
